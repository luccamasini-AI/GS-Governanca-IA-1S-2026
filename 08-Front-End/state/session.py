import streamlit as st
import datetime

def init_session_state() -> None:
    """
    Inicializa as variáveis de estado de sessão globais do Streamlit.
    """
    if 'alert_dispatched' not in st.session_state:
        st.session_state.alert_dispatched = False
        
    if 'last_alert_time' not in st.session_state:
        st.session_state.last_alert_time = None

def dispatch_alert() -> None:
    """
    Registra o envio e ativação do alerta no estado global da sessão,
    marcando a data e hora do despacho.
    """
    st.session_state.alert_dispatched = True
    current_timestamp: datetime.datetime = datetime.datetime.now()
    st.session_state.last_alert_time = current_timestamp.strftime("%Y-%m-%d %H:%M:%S")

def reset_alert() -> None:
    """
    Reseta o estado do alerta para False.
    """
    st.session_state.alert_dispatched = False
