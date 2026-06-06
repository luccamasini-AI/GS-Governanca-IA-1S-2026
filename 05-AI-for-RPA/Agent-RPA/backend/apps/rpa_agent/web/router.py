import time
import os
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, FileResponse
from backend.apps.rpa_agent.services.orchestrator import execute_triage
from backend.shared_infra.config import settings

router = APIRouter()

@router.get("/reports/{filename}")
async def download_report(filename: str):
    """Serve o relatório gerado para download do browser."""
    safe_name = os.path.basename(filename)
    filepath = os.path.join(settings.temp_reports_dir, safe_name)
    if not os.path.exists(filepath):
        return JSONResponse(status_code=404, content={"status": "error", "message": "Relatório não encontrado."})
    
    if safe_name.endswith(".pdf"):
        media_type = "application/pdf"
    elif safe_name.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(filepath, filename=safe_name, media_type=media_type)

@router.post("/execute")
async def execute_rpa(request: Request):
    start_time = time.time()
    
    content_type = request.headers.get("content-type", "")
    
    if "application/json" in content_type:
        payload = await request.json()
        simulate_date = payload.get("simulate_date")
    elif "multipart/form-data" in content_type:
        form = await request.form()
        simulate_date = form.get("simulate_date")
        file = form.get("file")
        if file and hasattr(file, "filename"):
            file_path = os.path.join(settings.temp_reports_dir, file.filename)
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            print(f"Novo arquivo de dados recebido: {file.filename}")
    else:
        return JSONResponse(status_code=400, content={"status": "error", "message": "Content-Type não suportado."})

    if not simulate_date:
        return JSONResponse(status_code=400, content={"status": "error", "message": "Data não fornecida."})
        
    try:
        # Pipeline RPA executado via orquestrador
        result = execute_triage(simulate_date)
        
        # Adiciona tempo de processamento à resposta
        result["processing_time"] = round(time.time() - start_time, 2)
        
        return result
        
    except Exception as e:
        print(f"Erro RPA: {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

import sqlite3

@router.get("/database/tables")
async def get_tables():
    db_path = settings.cmapss_database_path
    if not os.path.exists(db_path):
        return JSONResponse(status_code=404, content={"status": "error", "message": "Banco de dados não encontrado."})
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return {"tables": tables}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@router.get("/database/tables/{table_name}")
async def get_table_data(table_name: str, limit: int = 100):
    db_path = settings.cmapss_database_path
    if not os.path.exists(db_path):
        return JSONResponse(status_code=404, content={"status": "error", "message": "Banco de dados não encontrado."})
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        if table_name not in tables:
            conn.close()
            return JSONResponse(status_code=404, content={"status": "error", "message": "Tabela não encontrada."})
            
        cursor.execute(f'SELECT * FROM "{table_name}" LIMIT ?', (limit,))
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"data": rows}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
