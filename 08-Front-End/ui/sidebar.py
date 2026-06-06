import streamlit as st
import datetime

def render_sidebar_filters() -> tuple[float, list[str], datetime.date, datetime.date, bool]:
    """
    Renderiza todos os filtros de controle climático na barra lateral do painel
    e retorna as escolhas configuradas pelo usuário.
    """
    st.sidebar.header("Filtros de Análise")
    
    # Filtro 1: Risco Mínimo de Queimada (Threshold)
    minimum_risk_threshold: float = st.sidebar.slider(
        "Nível Mínimo de Risco (Queimada)", 
        min_value=0.0, 
        max_value=1.0, 
        value=0.0, 
        step=0.05,
        help="Filtra áreas no mapa com risco acima deste valor."
    )
    
    # Filtro 2: Seleção de Regiões Brasileiras (Multiselect)
    available_brazilian_regions: list[str] = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]
    selected_regions_list: list[str] = st.sidebar.multiselect(
        "Selecione as Regiões",
        options=available_brazilian_regions,
        default=[],
        help="Deixe vazio para visualizar todas as regiões brasileiras ou selecione regiões específicas."
    )
    
    # Filtro 3: Intervalo de Datas de Monitoramento
    current_date: datetime.date = datetime.date.today()
    start_default_date: datetime.date = current_date - datetime.timedelta(days=7)
    
    selected_date_range = st.sidebar.date_input(
        "Intervalo de Datas",
        value=(start_default_date, current_date),
        max_value=current_date,
        help="Selecione o período de leitura para monitoramento."
    )
    
    # Tratamento defensivo caso o usuário selecione apenas uma única data no calendário
    if len(selected_date_range) == 2:
        start_date_filter, end_date_filter = selected_date_range
    else:
        start_date_filter = selected_date_range[0]
        end_date_filter = selected_date_range[0]
        
    st.sidebar.markdown("---")
    should_show_raw_data: bool = st.sidebar.checkbox(
        "Mostrar Tabela de Dados Brutos", 
        value=False
    )
    
    # Exibe o status da conexão da API através do componente de UI reutilizável
    st.sidebar.markdown("---")
    from ui.components import render_status_indicator_card
    render_status_indicator_card(
        title="Status da Conexão",
        description="Sensores climáticos em tempo real ativos via Open-Meteo.",
        status_level="success"
    )
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Projeto:** Global Solution 2026.1")
    st.sidebar.markdown("**Disciplina:** Front End & Mobile")
    
    return (
        minimum_risk_threshold, 
        selected_regions_list, 
        start_date_filter, 
        end_date_filter, 
        should_show_raw_data
    )
