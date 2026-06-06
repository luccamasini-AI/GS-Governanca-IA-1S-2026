# Roteiro de Pitch - AstroAgro Sentinel

Duração-alvo: até 5 minutos.

## 1. Abertura - problema

Apresentar o contexto da nova economia espacial: satélites apoiam agricultura, clima, logística e sustentabilidade. O problema é que imagens e índices orbitais mostram o risco regional, mas não medem a condição exata do solo em cada propriedade.

Frase guia:
"O AstroAgro Sentinel conecta dados espaciais simulados a sensores IoT no campo para decidir quando alertar e quando irrigar."

## 2. Solução proposta

Explicar que o projeto usa ESP32, sensores ambientais e MQTT para enviar dados em tempo real a uma plataforma IoT. A plataforma calcula o Índice AstroAgro de Risco, armazena histórico, mostra o dashboard e envia alertas externos.

## 3. Hardware e sensores

Mostrar ou descrever:
- Sensor de umidade do solo: identifica risco de seca.
- DHT22: temperatura e umidade do ar.
- LDR: intensidade luminosa.
- Sensor de nível ou fluxo: verifica a disponibilidade de água.
- Relé/LED: simula o acionamento da bomba.
- LED/buzzer: alerta local.

## 4. Plataforma IoT

Demonstrar:
- Mensagens chegando no tópico `astroagro/sensores`.
- Node-RED processando o fluxo.
- Dados gravados em SQLite.
- Dashboard com temperatura, umidade do solo, nível de água, índice de risco e estado.
- Comando remoto ligando e desligando a irrigação.

## 5. Alertas e IA fictícia

Mostrar um cenário crítico:
- Solo abaixo de 25%.
- Temperatura acima de 34C.
- Luminosidade alta.
- Índice orbital elevado.

Explicar que o sistema classifica o risco como baixo, médio ou alto e recomenda uma ação. Se o risco for alto, ele envia mensagem por Telegram e pode acionar a irrigação automaticamente, desde que exista água no reservatório.

## 6. Encerramento - impacto

Fechar com impacto:
- Economia de água.
- Decisão agrícola baseada em dados.
- Complemento entre satélite e sensores locais.
- Aplicação alinhada à sustentabilidade e ao crescimento econômico da nova economia espacial.

Frase final:
"O AstroAgro Sentinel transforma dados orbitais e IoT terrestre em decisão prática para uma agricultura mais eficiente, resiliente e sustentável."
