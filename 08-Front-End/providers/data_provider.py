import pandas as pd
import numpy as np
import streamlit as st
import requests

# Coordenadas representativas por região (Lat, Lon)
REGIONAL_SENSOR_COORDINATES: dict[str, list[tuple[float, float]]] = {
    "Norte": [
        (-3.1190, -60.0217), # Manaus
        (-1.4550, -48.5024), # Belém
        (0.0356, -51.0705),  # Macapá
        (-2.8226, -60.6733), # Roraima
        (-8.7612, -63.9039)  # Porto Velho
    ],
    "Nordeste": [
        (-3.7319, -38.5267), # Fortaleza
        (-8.0476, -34.8770), # Recife
        (-12.9714, -38.5014),# Salvador
        (-5.0892, -42.8016), # Teresina
        (-9.6658, -35.7353)  # Maceió
    ],
    "Centro-Oeste": [
        (-15.8267, -47.9218),# Brasília
        (-16.6869, -49.2648),# Goiânia
        (-15.6014, -56.0979),# Cuiabá
        (-20.4428, -54.6464),# Campo Grande
        (-11.8608, -55.5103) # Sinop
    ],
    "Sudeste": [
        (-23.5505, -46.6333),# São Paulo
        (-22.9068, -43.1729),# Rio de Janeiro
        (-19.9208, -43.9378),# Belo Horizonte
        (-20.3194, -40.3378),# Vitória
        (-21.1767, -47.8208) # Ribeirão Preto
    ],
    "Sul": [
        (-25.4284, -49.2733),# Curitiba
        (-27.5954, -48.5480),# Florianópolis
        (-30.0346, -51.2177),# Porto Alegre
        (-29.1653, -51.1794),# Caxias do Sul
        (-23.3045, -51.1696) # Londrina
    ]
}

@st.cache_data(ttl=3600)
def fetch_real_climate_data() -> pd.DataFrame:
    """
    Busca dados climáticos reais da API Open-Meteo para coordenadas estratégicas brasileiras
    e calcula deterministicamente estimativas de NDVI e Risco de Queimada.
    """
    try:
        latitude_coordinates_list: list[str] = []
        longitude_coordinates_list: list[str] = []
        region_names_list: list[str] = []
        
        for region, coordinates in REGIONAL_SENSOR_COORDINATES.items():
            for latitude, longitude in coordinates:
                latitude_coordinates_list.append(str(latitude))
                longitude_coordinates_list.append(str(longitude))
                region_names_list.append(region)
                
        latitudes_query_string: str = ",".join(latitude_coordinates_list)
        longitudes_query_string: str = ",".join(longitude_coordinates_list)
        
        # Realiza a chamada HTTP passando múltiplas coordenadas para otimização
        api_request_url: str = f"https://api.open-meteo.com/v1/forecast?latitude={latitudes_query_string}&longitude={longitudes_query_string}&current=temperature_2m,relative_humidity_2m&timezone=America%2FSao_Paulo"
        
        response: requests.Response = requests.get(api_request_url, timeout=10)
        response.raise_for_status()
        api_response_data = response.json()
        
        # Se passamos múltiplas coordenadas, a API retorna uma lista de dicionários
        if isinstance(api_response_data, list):
            results: list = api_response_data
        else:
            results = [api_response_data]
            
        dataset: list[dict] = []
        for index, api_response_item in enumerate(results):
            current_telemetry: dict = api_response_item.get('current', {})
            temperature_celsius: float = current_telemetry.get('temperature_2m', 25.0)
            relative_humidity_percentage: float = current_telemetry.get('relative_humidity_2m', 50.0)
            
            # NDVI estimado com base na umidade para fins de simulação espacial
            normalized_difference_vegetation_index: float = relative_humidity_percentage / 100.0
            
            # Risco de queimada baseado na temperatura e umidade relativa
            calculated_wildfire_risk: float = (temperature_celsius / 45.0) * (1.0 - (relative_humidity_percentage / 100.0))
            # Fator de escala para contraste visual no mapa
            calculated_wildfire_risk = calculated_wildfire_risk * 1.5 
            calculated_wildfire_risk = np.clip(calculated_wildfire_risk, 0.0, 1.0)
            
            reading_time_string = current_telemetry.get('time', pd.Timestamp.now())
            
            dataset.append({
                'data_leitura': pd.to_datetime(reading_time_string),
                'latitude': float(latitude_coordinates_list[index]),
                'longitude': float(longitude_coordinates_list[index]),
                'ndvi': normalized_difference_vegetation_index,
                'risco_queimada': calculated_wildfire_risk,
                'umidade_relativa': relative_humidity_percentage,
                'regiao': region_names_list[index]
            })
            
        return pd.DataFrame(dataset)
        
    except Exception as api_connection_error:
        st.error(f"Erro ao conectar com Open-Meteo API: {api_connection_error}. Operando com dataset vazio.")
        return pd.DataFrame()

@st.cache_data
def get_historical_trend() -> pd.DataFrame:
    """
    Busca o histórico de temperatura diária dos últimos 90 dias do Centro do Brasil
    (Cuiabá) para analisar a evolução temporal da vegetação estimada.
    """
    try:
        api_request_url: str = "https://api.open-meteo.com/v1/forecast?latitude=-15.6014&longitude=-56.0979&daily=temperature_2m_max&past_days=90&forecast_days=0&timezone=America%2FSao_Paulo"
        response: requests.Response = requests.get(api_request_url, timeout=10)
        response.raise_for_status()
        api_response_data = response.json()
        
        daily_historical_data: dict = api_response_data.get('daily', {})
        dates_list: pd.DatetimeIndex = pd.to_datetime(daily_historical_data.get('time', []))
        maximum_temperatures_list: list = daily_historical_data.get('temperature_2m_max', [])
        
        # NDVI histórico estimado a partir das temperaturas máximas diárias
        historical_ndvi_trend: list[float] = []
        for temperature_reading in maximum_temperatures_list:
            if temperature_reading is not None:
                vegetation_health_estimation = max(0.1, 1.0 - (temperature_reading / 45.0))
            else:
                vegetation_health_estimation = 0.5
            historical_ndvi_trend.append(vegetation_health_estimation)
        
        return pd.DataFrame({
            'Data': dates_list,
            'Índice Médio': historical_ndvi_trend
        })
    except Exception as api_connection_error:
        st.error(f"Erro ao buscar histórico de tendências: {api_connection_error}. Operando com dataset vazio.")
        return pd.DataFrame()
