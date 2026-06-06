import streamlit as st
import pandas as pd

# Configuração inicial do Streamlit (deve anteceder qualquer chamada estrutural)
st.set_page_config(
    page_title="Monitor Espacial GS 2026",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Importações dos módulos estruturados da arquitetura do projeto
from ui.theme import get_custom_css
from providers.data_provider import fetch_real_climate_data, get_historical_trend
from ui.sidebar import render_sidebar_filters
from features.dashboard_feature import render_dashboard
from state.session import init_session_state

# Injeta CSS customizado para habilitar o visual Glassmorphism e ocultar menus nativos
st.markdown(get_custom_css(), unsafe_allow_html=True)

def main() -> None:
    """
    Função principal que orquestra a inicialização de estados,
    carregamento de APIs e renderização do dashboard de Inteligência Climática.
    """
    # 1. Inicializa o estado global de variáveis na sessão
    init_session_state()
    
    st.title("🛰️ Dashboard de Inteligência Climática")
    st.markdown("Transformando dados satelitais massivos em decisões ágeis para agricultura e contenção de desastres.")
    
    # 2. Executa chamadas assíncronas/APIs sob interface de carregamento (Design para Latência)
    with st.spinner('Conectando aos sensores climáticos em tempo real (Open-Meteo API)...'):
        raw_telemetry_dataframe: pd.DataFrame = fetch_real_climate_data()
        historical_trend_dataframe: pd.DataFrame = get_historical_trend()
    
    # 3. Renderiza a barra de filtros laterais e retorna escolhas do usuário
    dashboard_filters: tuple = render_sidebar_filters()
    
    # 4. Renderiza a feature principal da aplicação conectando dados e filtros
    render_dashboard(raw_telemetry_dataframe, historical_trend_dataframe, dashboard_filters)

if __name__ == "__main__":
    main()
