import streamlit as st
import pandas as pd

def render_metric_cards(
    raw_telemetry_dataframe: pd.DataFrame, 
    filtered_telemetry_dataframe: pd.DataFrame
) -> None:
    """
    Exibe cartões com métricas principais (KPIs) dinâmicas baseadas
    nos dataframes brutos e filtrados.
    """
    column_one, column_two, column_three = st.columns(3)
    
    total_monitored_zones: int = len(raw_telemetry_dataframe)
    critical_zones_count: int = len(filtered_telemetry_dataframe)
    
    # Tratamento de caso vazio para cálculo da média
    if not filtered_telemetry_dataframe.empty:
        average_relative_humidity: float = filtered_telemetry_dataframe['umidade_relativa'].mean()
    else:
        average_relative_humidity = 0.0
        
    with column_one:
        st.metric(
            label="Zonas Monitoradas (Total)", 
            value=total_monitored_zones
        )
        
    with column_two:
        # A cor delta vermelha no streamlit indica criticidade (com inverse=True)
        st.metric(
            label="Áreas Críticas (Filtro)", 
            value=critical_zones_count,
            delta=f"{critical_zones_count - (total_monitored_zones // 4)} vs Média",
            delta_color="inverse"
        )
        
    with column_three:
        st.metric(
            label="Umidade Média (Filtrada)", 
            value=f"{average_relative_humidity:.1f}%",
            delta="-2.5%", # Indicativo simulado de queda de umidade no solo
            delta_color="inverse"
        )
