import asyncio
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.main_loop = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """
        Envia os dados em tempo real para todos os clientes conectados.
        Não depende de MQTT: Pode ser chamado diretamente por qualquer serviço Python (Simulator, etc).
        """
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WS] Erro ao enviar mensagem para um cliente: {e}")
                continue

manager = ConnectionManager()
