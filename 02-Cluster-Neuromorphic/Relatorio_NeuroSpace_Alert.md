# NeuroSpace Alert

## 1. Integrantes

- Lucca Phelipe Masini (RM 564121)
- Igor Paixão Sarak (RM 563726)
- Bernardo Braga Perobeli (RM 562468)

## 2. Cenário escolhido e condição crítica

O cenário escolhido é um módulo de operação em Marte. O módulo precisa monitorar sinais locais em um ambiente extremo, com comunicação limitada, energia restrita e necessidade de resposta autônoma.

A condição crítica monitorada é o aumento combinado de temperatura, radiação e poeira. Em Marte, esses fatores podem afetar sensores, painéis solares, eletrônica embarcada e a segurança operacional do módulo.

## 3. Sensor neuromórfico proposto

O protótipo usa a ideia de um sensor neuromórfico de baixo consumo com processamento local. O sistema combina temperatura, radiação e poeira em uma tensão conceitual de entrada, chamada `V_entrada`.

Quando `V_entrada` ultrapassa o limiar definido em cada ajuste, o estado de um memristor virtual começa a mudar. Esse estado representa uma memória local do risco acumulado. Assim, o sensor não reage apenas a uma leitura isolada, mas ao histórico recente da condição ambiental.

O LED funciona como indicação por evento:

| Estado do memristor | LED | Diagnóstico |
|---|---|---|
| Abaixo de 0,35 | APAGADO | NORMAL |
| A partir de 0,35 | AMARELO | OBSERVACAO |
| A partir de 0,65 | VERMELHO | ALERTA_CRITICO |

Essa abordagem reduz a necessidade de enviar todos os dados brutos continuamente, pois o módulo pode transmitir apenas mudanças de estado ou alertas críticos.

## 4. Ajustes finais testados

| Ajuste | Perfil | V_limiar | taxa_chaveamento |
|---|---|---:|---:|
| Ajuste_A_sensivel | Mais sensível | 24 | 0.006 |
| Ajuste_B_equilibrado | Equilibrado | 28 | 0.005 |
| Ajuste_C_conservador | Mais conservador | 33 | 0.004 |

O ajuste C foi alterado de 32 para 33, mantendo o valor dentro da faixa sugerida no enunciado.

## 5. Transições do LED

| ajuste | V_limiar | taxa_chaveamento | primeiro_LED_nao_apagado_min | primeiro_LED_vermelho_min |
| --- | --- | --- | --- | --- |
| Ajuste_A_sensivel | 24 | 0.006 | 170 | 190 |
| Ajuste_B_equilibrado | 28 | 0.005 | 205 | 225 |
| Ajuste_C_conservador | 33 | 0.004 | 260 | 300 |

## 6. Comparação dos resultados

O Ajuste A foi o mais sensível. Ele detectou primeiro a condição de observação e também chegou primeiro ao alerta crítico. Esse comportamento é útil quando a prioridade é detectar risco o mais cedo possível, mas pode aumentar a chance de alertas prematuros.

O Ajuste C foi o mais conservador. Ele demorou mais para acionar o LED amarelo e o LED vermelho, o que reduz sensibilidade a pequenas oscilações, mas pode atrasar uma resposta importante em ambiente extremo.

O Ajuste B apresentou o melhor equilíbrio. Ele não dispara tão cedo quanto o ajuste sensível, mas ainda detecta a evolução do risco antes de a operação permanecer por muito tempo em condição crítica.

## 7. Ajuste recomendado

O ajuste recomendado é o Ajuste_B_equilibrado, com `V_limiar = 28` e `taxa_chaveamento = 0.005`.

Esse ajuste é adequado para o protótipo conceitual porque equilibra sensibilidade e estabilidade. Para um módulo em Marte, é importante detectar a piora ambiental com antecedência, mas sem gerar alertas excessivos que consumam comunicação, energia e atenção operacional.

## 8. Relação com computação neuromórfica e baixo consumo

O sensor simulado se relaciona com computação neuromórfica porque usa limiar, memória local e processamento por eventos. A memória memristiva virtual acumula o efeito das leituras ao longo do tempo, de forma semelhante a um mecanismo de integração temporal.

Essa lógica favorece baixo consumo porque o sistema pode processar os dados localmente e transmitir apenas eventos relevantes: NORMAL, OBSERVACAO ou ALERTA_CRITICO. Em missões espaciais, essa estratégia reduz tráfego de comunicação e evita depender de envio contínuo de dados brutos para uma central.

## 9. Conexão com ODS

A proposta se conecta ao ODS 9, Indústria, inovação e infraestrutura, porque explora sensores inteligentes, sistemas autônomos e infraestrutura tecnológica resiliente para ambientes extremos.

Também dialoga com o ODS 13, Ação contra a mudança global do clima, pois tecnologias de monitoramento remoto, baixo consumo e comunicação eficiente podem ser adaptadas para estações ambientais isoladas na Terra, apoiando resposta rápida a riscos ambientais.

## 10. Arquivos anexos

- `Colab_NeuroSpace_Alert_executado.ipynb`
- `resumo_transicoes.csv`
- `saida_sensor_espacial_Ajuste_B_equilibrado.csv`
- `dataset_neurosensor_espacial_5h.csv`
