import pandas as pd
import pytest
import datetime
from pipelines.data_processing import filter_telemetry_data

@pytest.fixture
def sample_telemetry_dataframe() -> pd.DataFrame:
    """
    Retorna um DataFrame simulado com dados climáticos para execução de testes unitários.
    """
    return pd.DataFrame({
        'data_leitura': pd.to_datetime(['2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28']),
        'risco_queimada': [0.1, 0.4, 0.6, 0.9],
        'regiao': ['Norte', 'Sul', 'Norte', 'Nordeste']
    })

def test_filter_telemetry_by_risk(sample_telemetry_dataframe: pd.DataFrame) -> None:
    """
    Testa se o filtro de limite de risco mínimo funciona corretamente.
    """
    filtered_dataframe = filter_telemetry_data(
        telemetry_dataframe=sample_telemetry_dataframe, 
        minimum_risk_threshold=0.5, 
        selected_regions_list=[], 
        start_date_filter=None, 
        end_date_filter=None
    )
    
    assert len(filtered_dataframe) == 2
    assert all(filtered_dataframe['risco_queimada'] >= 0.5)

def test_filter_telemetry_by_region(sample_telemetry_dataframe: pd.DataFrame) -> None:
    """
    Testa se o filtro de região restringe corretamente o dataset ou é ignorado se vazio.
    """
    # Filtrando apenas a região 'Norte'
    filtered_norte_dataframe = filter_telemetry_data(
        telemetry_dataframe=sample_telemetry_dataframe, 
        minimum_risk_threshold=0.0, 
        selected_regions_list=['Norte'], 
        start_date_filter=None, 
        end_date_filter=None
    )
    assert len(filtered_norte_dataframe) == 2
    assert all(filtered_norte_dataframe['regiao'] == 'Norte')
    
    # Filtro vazio (deve ignorar a restrição regional e retornar todas as regiões)
    filtered_all_dataframe = filter_telemetry_data(
        telemetry_dataframe=sample_telemetry_dataframe, 
        minimum_risk_threshold=0.0, 
        selected_regions_list=[], 
        start_date_filter=None, 
        end_date_filter=None
    )
    assert len(filtered_all_dataframe) == 4

def test_filter_telemetry_by_date(sample_telemetry_dataframe: pd.DataFrame) -> None:
    """
    Testa se a filtragem por datas remove corretamente dados fora do intervalo selecionado.
    """
    start_date_filter: datetime.date = datetime.date(2026, 5, 26)
    end_date_filter: datetime.date = datetime.date(2026, 5, 27)
    
    filtered_date_dataframe = filter_telemetry_data(
        telemetry_dataframe=sample_telemetry_dataframe, 
        minimum_risk_threshold=0.0, 
        selected_regions_list=[], 
        start_date_filter=start_date_filter, 
        end_date_filter=end_date_filter
    )
    
    assert len(filtered_date_dataframe) == 2
    assert filtered_date_dataframe.iloc[0]['risco_queimada'] == 0.4
    assert filtered_date_dataframe.iloc[1]['risco_queimada'] == 0.6
