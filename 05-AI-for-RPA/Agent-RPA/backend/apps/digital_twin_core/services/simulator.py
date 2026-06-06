import sqlite3
import asyncio
import pandas as pd
from backend.shared_infra.websocket_manager import manager
from backend.shared_infra.config import settings

DB_PATH = settings.cmapss_database_path

SENSORS = ["T2", "T24", "T30", "T50", "P2", "P15", "P30", "Nf", "Nc", "epr", "Ps30", 
           "phi", "NRf", "NRc", "BPR", "farB", "htBleed", "Nf_dmd", "PCNfR_dmd", "W31", "W32"]

def determine_status(rul: int) -> str:
    if rul <= 3:
        return "Risco Maximo"
    elif rul <= 5:
        return "Perigo"
    elif rul <= 10:
        return "Alerta"
    elif rul <= 15:
        return "Manutenção Iminente"
    return "Operacional"

async def run_native_simulator(unit_number: int = 1, test_table: str = "train_fd001", rul_table: str = "rul_fd001", device_id: str = "Turbofan-01"):
    """
    Simulador Nativo de Telemetria.
    Lê o banco de dados local da NASA e transmite via WebSocket,
    substituindo o antigo container Docker/MQTT.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        df_test = pd.read_sql_query(f"SELECT * FROM {test_table} WHERE unit_number = ? ORDER BY time_in_cycles ASC", conn, params=(unit_number,))
        
        cursor = conn.cursor()
        cursor.execute(f"SELECT remaining_useful_life FROM {rul_table} WHERE unit_number = ?", (unit_number,))
        res = cursor.fetchone()
        true_rul_last_cycle = int(res[0]) if res else 0
        
        conn.close()
    except Exception as e:
        print(f"[SIMULATOR] Erro SQLite: {e}")
        return

    if df_test.empty:
        return

    max_cycle = df_test['time_in_cycles'].max()
    print(f"[SIMULATOR] Iniciando transmissão nativa para {device_id}...")

    # Loop infinito de simulação (reinicia quando acaba)
    while True:
        for index, row in df_test.iterrows():
            current_cycle = int(row['time_in_cycles'])
            current_rul = (max_cycle - current_cycle) + true_rul_last_cycle
            status = determine_status(current_rul)
            
            # Formato esperado pelo Frontend
            broadcast_data = {
                "topic": f"digitaltwin/telemetry/{device_id}",
                "payload": {
                    "device_id": device_id,
                    "unit_number": unit_number,
                    "cycle": current_cycle,
                    "true_rul": current_rul,
                    "status": status
                },
                "is_generic": False
            }
            
            for sensor in SENSORS:
                broadcast_data["payload"][sensor] = round(float(row[sensor]), 4)
                
            # Dispara diretamente pro Frontend sem passar por rede externa
            if manager.active_connections:
                asyncio.create_task(manager.broadcast(broadcast_data))
                
            await asyncio.sleep(1.0) # 1 segundo por ciclo
