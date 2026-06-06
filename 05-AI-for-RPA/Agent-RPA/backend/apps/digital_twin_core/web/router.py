import sqlite3
import json
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from backend.shared_infra.config import settings

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
CONFIG_FILE = BASE_DIR / "backend" / "simulator_config.json"

def get_sys_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"running": True, "interval": 5}

@router.get("/config")
async def get_config():
    return get_sys_config()

@router.post("/config")
async def update_config(config: dict):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f)
    except Exception as e:
        print(f"Aviso: Não foi possível salvar no arquivo (ambiente serverless): {e}")
    return config



def determine_status(rul: int) -> str:
    if rul <= 3: return "Risco Maximo"
    elif rul <= 5: return "Perigo"
    elif rul <= 10: return "Alerta"
    elif rul <= 15: return "Manutenção Iminente"
    return "Operacional"

@router.get("/cmapss/query")
async def query_cmapss_telemetry(dataset_id: int, unit: int, cycle: int):
    db_path = settings.cmapss_database_path
    table_train = f"train_fd00{dataset_id}"
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT * FROM {table_train} WHERE unit_number = ? AND time_in_cycles <= ? ORDER BY time_in_cycles ASC", (unit, cycle))
        rows = cursor.fetchall()
        
        cursor.execute(f"SELECT MAX(time_in_cycles) as max_c FROM {table_train} WHERE unit_number = ?", (unit,))
        max_c_res = cursor.fetchone()
        
        conn.close()
        
        if not rows or not max_c_res or max_c_res['max_c'] is None:
            return JSONResponse(status_code=404, content={"status": "error", "message": "Motor ou Ciclo não encontrados."})
            
        max_cycle = int(max_c_res['max_c'])
        
        if cycle > max_cycle:
            return JSONResponse(status_code=400, content={"status": "error", "message": f"Número superior ao total de ciclos desse motor que é de {max_cycle} ciclos."})
        
        current_rul = max_cycle - cycle
        status_label = determine_status(current_rul)
        
        history_rows = rows[-100:]
        current_row = history_rows[-1]
        
        sensors = ["T2", "T24", "T30", "T50", "P2", "P15", "P30", "Nf", "Nc", "epr", "Ps30", 
                   "phi", "NRf", "NRc", "BPR", "farB", "htBleed", "Nf_dmd", "PCNfR_dmd", "W31", "W32"]
                   
        history_payload = {s: [] for s in sensors}
        for r in history_rows:
            for s in sensors:
                if s in r.keys():
                    history_payload[s].append(round(float(r[s]), 4))
        
        payload = {
            "status": "success",
            "data": {
                "unit": unit,
                "cycle": cycle,
                "true_rul": current_rul,
                "system_status": status_label,
                "history": history_payload,
                "op_setting_1": float(current_row['operational_setting_1']) if 'operational_setting_1' in current_row.keys() else 0,
                "op_setting_2": float(current_row['operational_setting_2']) if 'operational_setting_2' in current_row.keys() else 0,
                "op_setting_3": float(current_row['operational_setting_3']) if 'operational_setting_3' in current_row.keys() else 0
            }
        }
        
        for s in sensors:
            if s in current_row.keys():
                payload["data"][s] = round(float(current_row[s]), 4)
                
        return payload
        
    except Exception as e:
        print(f"Erro C-MAPSS Query: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
