@ECHO OFF
SETLOCAL EnableDelayedExpansion

CHCP 65001 > NUL

ECHO ======================================================================
ECHO                Digital Twin Platform - STARTUP SYSTEM
ECHO ======================================================================

ECHO [1/3] Preparando Ambiente Python...
IF EXIST ".venv" GOTO :START_SERVICES
ECHO [INFO] Criando ambiente virtual...
python -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\pip install -r requirements.txt

:START_SERVICES
ECHO.
ECHO [2/3] Iniciando Backend e Banco de Dados...
SET PYTHONPATH=.

START "Digital Twin - Backend API" /D "." .venv\Scripts\python -m uvicorn api.index:app --reload --port 8010

ECHO [INFO] Aguardando o backend inicializar...
timeout /t 3 /nobreak > NUL

ECHO.
ECHO [3/3] Iniciando Frontend...
IF NOT EXIST "frontend\node_modules" (
    ECHO [INFO] Instalando dependencias do frontend ^(Legacy Mode^)...
    PUSHD frontend
    CALL npm install --legacy-peer-deps
    POPD
)
START "Digital Twin - Frontend (Vite)" /D "frontend" npm run dev

ECHO.
ECHO ======================================================================
ECHO SISTEMA DIGITAL TWIN EM EXECUCAO COMPLETA
ECHO ======================================================================
ECHO Pressione qualquer tecla para encerrar os servicos...
PAUSE

taskkill /FI "WINDOWTITLE eq Digital Twin - Backend*" /F /T
taskkill /FI "WINDOWTITLE eq Digital Twin - Frontend*" /F /T
EXIT /B
