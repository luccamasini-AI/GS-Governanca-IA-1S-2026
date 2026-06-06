import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from ui.theme import COLORS

def create_spatial_risk_map_chart(telemetry_dataframe: pd.DataFrame) -> go.Figure:
    """
    Cria o mapa de dispersão interativo com as coordenadas críticas brasileiras
    e a intensidade do risco de queimadas.
    """
    # Guard clause para tratar dataframe vazio
    if telemetry_dataframe.empty:
        empty_map_figure = go.Figure()
        empty_map_figure.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', 
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color=COLORS["text"], family="Inter, sans-serif"),
            annotations=[dict(text="Nenhum dado de satélite encontrado para os filtros selecionados.", showarrow=False)]
        )
        return empty_map_figure
        
    spatial_risk_map_figure: go.Figure = px.scatter_mapbox(
        telemetry_dataframe, 
        lat="latitude", 
        lon="longitude", 
        color="risco_queimada",
        size="risco_queimada",
        color_continuous_scale=[COLORS["success"], COLORS["warning"], COLORS["danger"]],
        range_color=[0.0, 1.0],
        hover_name="regiao",
        hover_data={"ndvi": True, "umidade_relativa": True, "latitude": False, "longitude": False, "regiao": False},
        mapbox_style="carto-darkmatter",
        zoom=3.8,
        center={"lat": -14.2350, "lon": -51.9253} # Centralizado geograficamente no Brasil
    )
    
    spatial_risk_map_figure.update_layout(
        height=550,
        margin={"r":0, "t":30, "l":0, "b":0},
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color=COLORS["text"], family="Inter, sans-serif")
    )
    return spatial_risk_map_figure

def create_ndvi_trend_historical_chart(historical_trend_dataframe: pd.DataFrame) -> go.Figure:
    """
    Gera gráfico de linha cobrindo a tendência de degradação vegetal média
    dos últimos 90 dias.
    """
    # Guard clause para tratar dataframe vazio
    if historical_trend_dataframe.empty:
        empty_trend_figure = go.Figure()
        empty_trend_figure.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', 
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color=COLORS["text"], family="Inter, sans-serif"),
            annotations=[dict(text="Sem dados históricos de tendência disponíveis.", showarrow=False)]
        )
        return empty_trend_figure

    trend_figure = go.Figure()
    
    trend_figure.add_trace(go.Scatter(
        x=historical_trend_dataframe["Data"], 
        y=historical_trend_dataframe["Índice Médio"],
        mode='lines+markers',
        line=dict(color=COLORS["info"], width=3, shape='spline'),
        fill='tozeroy',
        fillcolor='rgba(99, 110, 250, 0.15)',
        marker=dict(size=5, symbol='circle', line=dict(width=1, color=COLORS["text"]))
    ))
    
    trend_figure.update_layout(
        height=450,
        margin={"r":10, "t":80, "l":10, "b":20},
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color=COLORS["text"], family="Inter, sans-serif"),
        xaxis=dict(showgrid=False, zeroline=False, visible=True),
        yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', zeroline=False),
        title=dict(text="Evolução do Índice de Vegetação Estimado (NDVI)", font=dict(size=14))
    )
    return trend_figure

def create_moisture_risk_correlation_chart(telemetry_dataframe: pd.DataFrame) -> go.Figure:
    """
    Gera o gráfico de dispersão correlacionando a Umidade Relativa (%) ao
    Risco de Queimadas calculado para as zonas de monitoramento.
    """
    # Guard clause para tratar dataframe vazio
    if telemetry_dataframe.empty:
        empty_correlation_figure = go.Figure()
        empty_correlation_figure.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', 
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(color=COLORS["text"], family="Inter, sans-serif"),
            annotations=[dict(text="Nenhum dado encontrado para analisar correlação.", showarrow=False)]
        )
        return empty_correlation_figure
        
    correlation_figure: go.Figure = px.scatter(
        telemetry_dataframe,
        x="umidade_relativa",
        y="risco_queimada",
        color="risco_queimada",
        color_continuous_scale=[COLORS["success"], COLORS["warning"], COLORS["danger"]]
    )
    correlation_figure.update_traces(
        marker=dict(size=9, opacity=0.85, line=dict(width=0.8, color='white'))
    )
    correlation_figure.update_layout(
        height=450,
        margin={"r":10, "t":80, "l":10, "b":20},
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color=COLORS["text"], family="Inter, sans-serif"),
        xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', title="Umidade Relativa do Ar (%)"),
        yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', title="Risco Estimado de Queimada"),
        title=dict(text="Correlação Direta: Umidade vs Risco de Queimada", font=dict(size=14))
    )
    return correlation_figure
