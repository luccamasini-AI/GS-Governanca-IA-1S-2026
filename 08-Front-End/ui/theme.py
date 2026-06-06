# Configuração de cores semânticas da UI (Glassmorphism e paleta de risco)
COLORS: dict[str, str] = {
    "background": "#0e1117",
    "text": "#ffffff",
    "primary": "#3b82f6",     # Azul para botões e seleção ativa
    "secondary": "#6b7280",   # Cinza suave para textos auxiliares
    "success": "#10b981",     # Verde para florestas saudáveis / monitoramento estável
    "warning": "#f59e0b",     # Laranja para áreas de atenção intermediária
    "danger": "#ef4444",      # Vermelho para queimadas ativas e zonas de emergência
    "info": "#636efa"         # Azul/Roxo neutro para curvas estatísticas e gráficos
}

def get_custom_css() -> str:
    """
    Retorna o bloco de código CSS customizado para injeção no cabeçalho do Streamlit,
    configurando cartões Glassmorphism, responsividade e ocultando menus nativos.
    """
    return f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap');

    /* Animação de Emergência (Glow/Pulse) */
    @keyframes emergency-pulse {{
        0% {{ box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }}
        70% {{ box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }}
        100% {{ box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }}
    }}

    /* Ocultar elementos nativos do Streamlit para manter a aparência premium de painel integrado */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    div[data-testid="stDecoration"] {{display: none;}}
    .stDeployButton {{display: none;}}


    /* Estilização personalizada dos cartões de métrica (Efeito Glassmorphism com hover dinâmico) */
    div[data-testid="metric-container"] {{
        background-color: rgba(30, 35, 43, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 5% 5% 5% 10%;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        transition: transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out;
    }}
    
    div[data-testid="metric-container"]:hover {{
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.5);
    }}
    
    /* Configurações tipográficas para sans-serif de alta fidelidade (Inter / Outfit) */
    h1, h2, h3, h4 {{
        font-family: 'Inter', 'Outfit', sans-serif !important;
        font-weight: 600 !important;
    }}
    
    /* Ajustes estruturais para as abas (Tabs) de navegação */
    .stTabs [data-baseweb="tab-list"] {{
        gap: 28px;
    }}
    
    .stTabs [data-baseweb="tab"] {{
        height: 48px;
        white-space: pre-wrap;
        background-color: transparent;
        border-radius: 4px 4px 0px 0px;
        gap: 1px;
        padding-top: 8px;
        padding-bottom: 8px;
        font-size: 0.95rem;
    }}
    
    .stTabs [aria-selected="true"] {{
        background-color: rgba(255, 255, 255, 0.04);
        border-bottom: 2.5px solid {COLORS["primary"]};
    }}
    </style>
    """
