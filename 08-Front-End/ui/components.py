import streamlit as st
from ui.theme import COLORS

def render_status_indicator_card(title: str, description: str, status_level: str) -> None:
    """
    Exibe um card de status estilizado com Glassmorphism e borda semântica.
    
    Parâmetros:
    - title: Título destacado no topo do card.
    - description: Texto descritivo de detalhamento.
    - status_level: Nível semântico de status ('success', 'warning', 'danger', 'info').
    """
    semantic_colors = {
        "success": (COLORS["success"], "rgba(16, 185, 129, 0.08)"),
        "warning": (COLORS["warning"], "rgba(245, 158, 11, 0.08)"),
        "danger": (COLORS["danger"], "rgba(239, 68, 68, 0.08)"),
        "info": (COLORS["info"], "rgba(99, 110, 250, 0.08)")
    }
    
    border_color, background_color = semantic_colors.get(
        status_level, 
        semantic_colors["info"]
    )
    
    animation_style = "animation: emergency-pulse 2s infinite;" if status_level == "danger" else ""
    
    styled_html = f"""
    <div style="
        background-color: {background_color};
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-left: 5px solid {border_color};
        padding: 16px;
        border-radius: 8px;
        margin: 12px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        {animation_style}
    ">
        <h5 style="margin: 0 0 6px 0; color: {border_color}; font-size: 1.05rem; font-weight: 600;">
            {title}
        </h5>
        <p style="margin: 0; color: #d1d5db; font-size: 0.9rem; line-height: 1.4;">
            {description}
        </p>
    </div>
    """
    st.markdown(styled_html, unsafe_allow_html=True)
