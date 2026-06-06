import os
import sys
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Adiciona o diretório raiz ao path para que possamos importar de 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importa as rotas dos diferentes domínios da arquitetura Hexagonal / DDD
from backend.apps.digital_twin_core.web.router import router as core_router
from backend.apps.digital_twin_core.web.mock_assets_router import router as mock_asset_router
from backend.apps.rpa_agent.web.router import router as rpa_router
from backend.shared_infra.websocket_manager import manager

from backend.shared_infra.config import settings

app = FastAPI()

# Registro de todas as rotas
app.include_router(mock_asset_router, prefix="/api")
app.include_router(core_router, prefix="/api")
app.include_router(rpa_router, prefix="/api/rpa")

@app.middleware("http")
async def log_requests(request, call_next):
    # Logs desativados em produção para performance
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "online", "system": settings.system_name}

# Rota de WebSocket Genérica da Infraestrutura
@app.websocket("/api/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket Erro: {e}")
        manager.disconnect(websocket)

# A Inicialização do Simulador (nativo Python) substituirá o antigo MQTT
@app.on_event("startup")
async def startup_event():
    import asyncio
    from backend.apps.digital_twin_core.services.simulator import run_native_simulator
    manager.main_loop = asyncio.get_running_loop()
    
    # Inicia o simulador nativo para a Frota 1 de forma desacoplada
    asyncio.create_task(run_native_simulator(unit_number=1, test_table="train_fd001", rul_table="rul_fd001", device_id="Turbofan-01"))
    print("[STARTUP] Simulador Nativo C-MAPSS iniciado em Background Task.")

# Para o Vercel, o objeto 'app' deve estar disponível no nível do módulo
