# Guia de Demonstração

Este guia organiza uma demonstração curta, cobrindo os critérios da atividade.

## Preparação

1. Abra o Node-RED.
2. Importe `node-red/astroagro-flow.json`.
3. Configure o broker MQTT usado pelo fluxo.
4. Crie ou aponte o banco SQLite para `database/astroagro.db`.
5. Configure o dashboard em `/ui`.
6. Se for usar Telegram, defina `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`.

## Sem hardware

Use o simulador:

```powershell
cd "D:\Projetos DEV\GS IOT - 1S2026"
python .\simulator\astroagro_simulator.py --mqtt-host localhost --interval 3
```

Se não houver broker MQTT, rode apenas com SQLite:

```powershell
python .\simulator\astroagro_simulator.py --sqlite .\database\astroagro.db --samples 20
```

## Com hardware

1. Abra o sketch `firmware/astroagro_sentinel_esp32/astroagro_sentinel_esp32.ino`.
2. Ajuste `WIFI_SSID`, `WIFI_PASSWORD` e `MQTT_HOST`.
3. Instale as bibliotecas Arduino:
   - `PubSubClient`
   - `DHT sensor library`
   - `ArduinoJson`
4. Grave no ESP32.
5. Abra o monitor serial em 115200 bps.

## Cenário 1 - operação normal

Objetivo: mostrar o alinhamento da aplicação, a transmissão de dados e o dashboard.

1. Mantenha umidade do solo acima de 45%.
2. Temperatura abaixo de 32C.
3. Nível de água acima de 40%.
4. Confirme no dashboard: estado `Normal`, risco baixo e sem alerta.

## Cenário 2 - risco de seca

Objetivo: mostrar orquestração, alerta e recomendação.

1. Reduza a umidade do solo para abaixo de 30%.
2. Aumente temperatura e luminosidade.
3. Confirme que o Node-RED classifica `Atenção` ou `Crítico`.
4. Verifique a mensagem no tópico `astroagro/alertas`.
5. Se o Telegram estiver configurado, mostre a notificação externa.

## Cenário 3 - irrigação remota

Objetivo: mostrar a comunicação da plataforma para o dispositivo.

1. No dashboard, acione o comando de irrigação.
2. Confirme a publicação em `astroagro/comandos/irrigacao`.
3. No ESP32, verifique se o relé/LED foi ligado.
4. Desligue pelo dashboard e confirme o retorno.

## Cenário 4 - falha operacional

Objetivo: mostrar robustez e inovação.

1. Simule reservatório abaixo de 20% ou `flow_detected = false`.
2. Acione a irrigação.
3. Confirme estado `Falha Operacional`.
4. Mostre o alerta com a recomendação de verificar o reservatório ou a bomba.

## Checklist da banca

- Aplicação IoT alinhada ao tema espacial.
- Múltiplos sensores e atuador.
- MQTT funcionando.
- Orquestrador de fluxos no Node-RED.
- Banco de dados armazenando leituras.
- Dashboard com atualização.
- Alerta externo.
- Comando remoto para o dispositivo.
- Funcionalidade inovadora: Índice AstroAgro de Risco.
