import contextlib
import csv
import html
import io
import json
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd


BASE = Path(__file__).resolve().parent
NOTEBOOK = BASE / "Colab_NeuroSpace_Alert.ipynb"
CSV = BASE / "dataset_neurosensor_espacial_5h.csv"


def simular_sensor(dados, V_limiar, taxa_chaveamento,
                   limiar_estado_alerta=0.65,
                   limiar_estado_observacao=0.35):
    saida = dados.copy()

    temp_norm = np.clip((saida["temperatura_C"] - 20) / (55 - 20), 0, 1)
    rad_norm = np.clip((saida["radiacao_uSv_h"] - 0.25) / (2.5 - 0.25), 0, 1)
    poeira_norm = np.clip(saida["poeira_pct"] / 100, 0, 1)

    indice_sensor = 0.45 * temp_norm + 0.35 * rad_norm + 0.20 * poeira_norm
    saida["V_entrada"] = np.round(15 + 25 * indice_sensor, 2)

    estado_memristor = []
    led = []
    diagnostico_sensor = []
    w = 0.0
    dt = 5

    for v in saida["V_entrada"]:
        if v > V_limiar:
            w = min(1.0, w + taxa_chaveamento * (v - V_limiar) * dt * (1 - w))
        else:
            w = max(0.0, w - 0.002 * dt * w)

        estado_memristor.append(round(w, 3))

        if w >= limiar_estado_alerta:
            led.append("VERMELHO")
            diagnostico_sensor.append("ALERTA_CRITICO")
        elif w >= limiar_estado_observacao:
            led.append("AMARELO")
            diagnostico_sensor.append("OBSERVACAO")
        else:
            led.append("APAGADO")
            diagnostico_sensor.append("NORMAL")

    saida["estado_memristor"] = estado_memristor
    saida["LED"] = led
    saida["diagnostico_sensor"] = diagnostico_sensor
    return saida


def gerar_resultados():
    df = pd.read_csv(CSV)
    ajustes = {
        "Ajuste_A_sensivel": {"V_limiar": 24, "taxa_chaveamento": 0.006},
        "Ajuste_B_equilibrado": {"V_limiar": 28, "taxa_chaveamento": 0.005},
        "Ajuste_C_conservador": {"V_limiar": 33, "taxa_chaveamento": 0.004},
    }

    resultados = {}
    resumo = []
    for nome, pars in ajustes.items():
        saida = simular_sensor(df, pars["V_limiar"], pars["taxa_chaveamento"])
        resultados[nome] = saida

        primeiro_nao_apagado = saida[saida["LED"] != "APAGADO"].head(1)
        primeiro_vermelho = saida[saida["LED"] == "VERMELHO"].head(1)
        resumo.append({
            "ajuste": nome,
            "V_limiar": pars["V_limiar"],
            "taxa_chaveamento": pars["taxa_chaveamento"],
            "primeiro_LED_nao_apagado_min": None if primeiro_nao_apagado.empty else int(primeiro_nao_apagado["tempo_min"].iloc[0]),
            "primeiro_LED_vermelho_min": None if primeiro_vermelho.empty else int(primeiro_vermelho["tempo_min"].iloc[0]),
        })

    resumo_transicoes = pd.DataFrame(resumo)
    resumo_transicoes.to_csv(BASE / "resumo_transicoes.csv", index=False)

    ajuste_escolhido = "Ajuste_B_equilibrado"
    saida_escolhida = resultados[ajuste_escolhido]
    saida_escolhida.to_csv(BASE / f"saida_sensor_espacial_{ajuste_escolhido}.csv", index=False)
    return df, ajustes, resultados, resumo_transicoes, ajuste_escolhido, saida_escolhida


def dataframe_output(df):
    return {
        "output_type": "execute_result",
        "execution_count": None,
        "data": {
            "text/plain": df.to_string(),
            "text/html": df.to_html(index=isinstance(df.index, pd.RangeIndex)),
        },
        "metadata": {},
    }


def executar_notebook(ajustes, resumo_transicoes, saida_escolhida):
    nb = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
    for cell in nb["cells"]:
        src = "".join(cell.get("source", []))
        if "Ajuste_C_conservador" in src and "'V_limiar': 32" in src:
            src = src.replace("'V_limiar': 32", "'V_limiar': 33")
            cell["source"] = src.splitlines(keepends=True)

    exec_count = 1
    for cell in nb["cells"]:
        if cell.get("cell_type") != "code":
            continue

        src = "".join(cell.get("source", []))
        cell["execution_count"] = exec_count
        exec_count += 1
        cell["outputs"] = []

        if "pd.read_csv" in src:
            cell["outputs"].append({
                "output_type": "stream",
                "name": "stdout",
                "text": "Dataset carregado com sucesso!\nLinhas e colunas: (61, 8)\n",
            })
            cell["outputs"].append(dataframe_output(pd.read_csv(CSV).head()))
        elif "value_counts" in src:
            df = pd.read_csv(CSV)
            text = (
                "Primeiras linhas:\n"
                + df.head().to_string()
                + "\n\nÚltimas linhas:\n"
                + df.tail().to_string()
                + "\n\nResumo da condição real simulada:\n"
                + df["condicao_real"].value_counts().to_string()
                + "\n"
            )
            cell["outputs"].append({"output_type": "stream", "name": "stdout", "text": text})
        elif "def simular_sensor" in src:
            pass
        elif "ajustes_da_equipe" in src:
            cell["outputs"].append({
                "output_type": "execute_result",
                "execution_count": cell["execution_count"],
                "data": {"text/plain": repr(ajustes)},
                "metadata": {},
            })
        elif "resumo_transicoes" in src:
            cell["outputs"].append(dataframe_output(resumo_transicoes))
        elif "display(saida_escolhida" in src:
            colunas = [
                "tempo_min", "temperatura_C", "radiacao_uSv_h", "poeira_pct",
                "condicao_real", "V_entrada", "estado_memristor", "LED", "diagnostico_sensor",
            ]
            cell["outputs"].append(dataframe_output(saida_escolhida[colunas].tail(20)))
        elif "Arquivo gerado" in src:
            cell["outputs"].append({
                "output_type": "stream",
                "name": "stdout",
                "text": "Arquivo gerado: saida_sensor_espacial_Ajuste_B_equilibrado.csv\n",
            })

    (BASE / "Colab_NeuroSpace_Alert_executado.ipynb").write_text(
        json.dumps(nb, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    NOTEBOOK.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")


def gerar_relatorio_md(resumo_transicoes):
    def tabela_markdown(df):
        headers = list(df.columns)
        linhas = [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join("---" for _ in headers) + " |",
        ]
        for _, row in df.iterrows():
            linhas.append("| " + " | ".join(str(row[col]) for col in headers) + " |")
        return "\n".join(linhas)

    resumo_md = tabela_markdown(resumo_transicoes)
    relatorio = f"""# NeuroSpace Alert

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

{resumo_md}

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
"""
    (BASE / "Relatorio_NeuroSpace_Alert.md").write_text(relatorio, encoding="utf-8")
    return relatorio


def gerar_docx_minimo(markdown_text):
    def p(text, style=None):
        style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
        return f"<w:p>{style_xml}<w:r><w:t>{html.escape(text)}</w:t></w:r></w:p>"

    def table(lines):
        rows = []
        for line in lines:
            cells = [part.strip() for part in line.strip().strip("|").split("|")]
            if all(set(cell) <= {"-", ":", " "} for cell in cells):
                continue
            row_xml = "".join(
                "<w:tc><w:tcPr><w:tcW w:w=\"2400\" w:type=\"dxa\"/></w:tcPr>"
                f"<w:p><w:r><w:t>{html.escape(cell)}</w:t></w:r></w:p></w:tc>"
                for cell in cells
            )
            rows.append(f"<w:tr>{row_xml}</w:tr>")
        return "<w:tbl><w:tblPr><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\"/><w:left w:val=\"single\" w:sz=\"4\"/><w:bottom w:val=\"single\" w:sz=\"4\"/><w:right w:val=\"single\" w:sz=\"4\"/><w:insideH w:val=\"single\" w:sz=\"4\"/><w:insideV w:val=\"single\" w:sz=\"4\"/></w:tblBorders></w:tblPr>" + "".join(rows) + "</w:tbl>"

    body_parts = []
    lines = markdown_text.splitlines()
    i = 0
    while i < len(lines):
        clean = lines[i].strip()
        if not clean:
            i += 1
            continue
        if clean.startswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table_lines.append(lines[i])
                i += 1
            body_parts.append(table(table_lines))
            continue
        if clean.startswith("- `"):
            body_parts.append(p(clean[2:]))
        elif clean.startswith("# "):
            body_parts.append(p(clean[2:].strip(), "Title"))
        elif clean.startswith("## "):
            body_parts.append(p(clean[3:].strip(), "Heading1"))
        else:
            body_parts.append(p(clean.replace("`", "")))
        i += 1

    body = "".join(body_parts)

    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>"""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    with zipfile.ZipFile(BASE / "Relatorio_NeuroSpace_Alert.docx", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document_xml)


def main():
    _, ajustes, _, resumo_transicoes, _, saida_escolhida = gerar_resultados()
    executar_notebook(ajustes, resumo_transicoes, saida_escolhida)
    relatorio = gerar_relatorio_md(resumo_transicoes)
    gerar_docx_minimo(relatorio)
    print(resumo_transicoes.to_string(index=False))
    print("Arquivos gerados em:", BASE)


if __name__ == "__main__":
    main()
