import streamlit as st
import pandas as pd
from pipelines.data_processing import filter_telemetry_data
from state.session import dispatch_alert, reset_alert
from ui.metrics import render_metric_cards
from ui.charts import (
    create_spatial_risk_map_chart, 
    create_ndvi_trend_historical_chart, 
    create_moisture_risk_correlation_chart
)
from ui.components import render_status_indicator_card

def render_human_in_the_loop(filtered_telemetry_dataframe: pd.DataFrame) -> None:
    """
    Renderiza a seção de aprovação manual de alertas (Human-in-the-loop)
    se houver zonas de calor críticas no dataframe filtrado.
    """
    st.markdown("### 🛑 Sistema de Alerta (Human-in-the-loop)")
    
    # Define limite empírico de risco de 0.25 para acionar o alerta na apresentação
    critical_zones_count: int = len(
        filtered_telemetry_dataframe[filtered_telemetry_dataframe['risco_queimada'] > 0.25]
    )
    
    if critical_zones_count >= 1:
        verb_form: str = "Detectada" if critical_zones_count == 1 else "Detectadas"
        plural_suffix: str = "" if critical_zones_count == 1 else "s"
        
        render_status_indicator_card(
            title="Alerta de Risco Crítico",
            description=f"{verb_form} {critical_zones_count} zona{plural_suffix} com risco ELEVADO de queimada baseada{plural_suffix} em dados climáticos. Requer aprovação para acionar equipes de contenção.",
            status_level="danger"
        )
        
        column_button, column_message = st.columns([1, 4])
        with column_button:
            if not st.session_state.alert_dispatched:
                st.button("Aprovar Alerta Global", on_click=dispatch_alert, type="primary")
            else:
                st.success("Alerta Enviado!", icon="✅")
                st.button("Resetar Alerta", on_click=reset_alert)
        
        with column_message:
            if st.session_state.alert_dispatched:
                st.info(f"O alerta foi disparado com sucesso para as equipes de contenção às {st.session_state.last_alert_time}.")
    else:
        render_status_indicator_card(
            title="Zonas Sob Controle",
            description="Monitoramento espacial em andamento. Nenhuma anormalidade crítica detectada nas zonas atuais.",
            status_level="success"
        )
        if st.session_state.alert_dispatched:
            reset_alert()

def render_dashboard(
    raw_telemetry_dataframe: pd.DataFrame, 
    historical_trend_dataframe: pd.DataFrame, 
    dashboard_filters_tuple: tuple
) -> None:
    """
    Renderiza a interface estruturada em abas do dashboard principal,
    integrando pipelines de dados, cartões de KPI e gráficos do Plotly.
    """
    (
        minimum_risk_threshold, 
        selected_regions_list, 
        start_date_filter, 
        end_date_filter, 
        should_show_raw_data
    ) = dashboard_filters_tuple
    
    # Processa os dados brutos através da pipeline de filtragem lógica
    filtered_telemetry_dataframe: pd.DataFrame = filter_telemetry_data(
        raw_telemetry_dataframe, 
        minimum_risk_threshold, 
        selected_regions_list, 
        start_date_filter, 
        end_date_filter
    )
    
    # Renderiza os KPIs agregados no topo do painel
    render_metric_cards(raw_telemetry_dataframe, filtered_telemetry_dataframe)
    st.markdown("---")
    
    # Organização das visualizações em Abas de navegação
    tab_geographic, tab_predictive, tab_raw_data = st.tabs([
        "🗺️ Visão Geográfica", 
        "📈 Análise Preditiva", 
        "🗄️ Dados Brutos"
    ])
    
    with tab_geographic:
        st.subheader("Mapa de Risco Espacial")
        st.markdown("Visualize as coordenadas críticas de desmatamento ou foco de calor com base nos filtros selecionados.")
        
        spatial_risk_map_figure = create_spatial_risk_map_chart(filtered_telemetry_dataframe)
        st.plotly_chart(spatial_risk_map_figure, width="stretch", key="map_chart")
        
        st.markdown("---")
        render_human_in_the_loop(filtered_telemetry_dataframe)
        
    with tab_predictive:
        column_left, column_right = st.columns(2)
        
        with column_left:
            st.subheader("Evolução Histórica (NDVI)")
            st.markdown("Tendência histórica estimada do índice de vegetação.")
            historical_ndvi_trend_figure = create_ndvi_trend_historical_chart(historical_trend_dataframe)
            st.plotly_chart(historical_ndvi_trend_figure, width="stretch", key="trend_chart")
            
        with column_right:
            st.subheader("Análise de Correlação")
            st.markdown("Umidade no solo vs Risco de Queimada.")
            moisture_risk_correlation_figure = create_moisture_risk_correlation_chart(filtered_telemetry_dataframe)
            st.plotly_chart(moisture_risk_correlation_figure, width="stretch", key="scatter_chart")
            
    with tab_raw_data:
        if should_show_raw_data:
            st.subheader("Dataset (Visualização Bruta)")
            st.dataframe(filtered_telemetry_dataframe, width="stretch")
        else:
            st.info("Habilite a visualização de dados brutos na barra lateral.")
