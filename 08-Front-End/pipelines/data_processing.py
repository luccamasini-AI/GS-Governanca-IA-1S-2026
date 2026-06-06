import pandas as pd
from typing import List, Optional
import datetime

def filter_telemetry_data(
    telemetry_dataframe: pd.DataFrame, 
    minimum_risk_threshold: float, 
    selected_regions_list: List[str], 
    start_date_filter: Optional[datetime.date], 
    end_date_filter: Optional[datetime.date]
) -> pd.DataFrame:
    """
    Filtra as telemetrias de satélite com base no risco mínimo de queimada,
    regiões selecionadas e período de leitura.
    """
    # Guard clause para tratar dataframe vazio
    if telemetry_dataframe.empty:
        return telemetry_dataframe

    filtered_telemetry_dataframe: pd.DataFrame = telemetry_dataframe.copy()
    
    # 1. Filtro por limite de risco
    filtered_telemetry_dataframe = filtered_telemetry_dataframe[
        filtered_telemetry_dataframe['risco_queimada'] >= minimum_risk_threshold
    ]
    
    # 2. Filtro por agrupamento de regiões (ignorado se a lista estiver vazia)
    if selected_regions_list:
        filtered_telemetry_dataframe = filtered_telemetry_dataframe[
            filtered_telemetry_dataframe['regiao'].isin(selected_regions_list)
        ]
        
    # 3. Filtro por limites temporais
    if start_date_filter and end_date_filter:
        start_datetime_limit: pd.Timestamp = pd.to_datetime(start_date_filter)
        end_datetime_limit: pd.Timestamp = pd.to_datetime(end_date_filter)
        
        # Ajustar para o último segundo do dia de término para incluir todo o dia
        end_datetime_limit = end_datetime_limit.replace(hour=23, minute=59, second=59)
        
        filtered_telemetry_dataframe = filtered_telemetry_dataframe[
            (filtered_telemetry_dataframe['data_leitura'] >= start_datetime_limit) & 
            (filtered_telemetry_dataframe['data_leitura'] <= end_datetime_limit)
        ]
        
    return filtered_telemetry_dataframe
