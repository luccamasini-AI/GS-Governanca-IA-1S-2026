from pathlib import Path
from textwrap import wrap


BASE = Path(__file__).resolve().parent
OUT_DIR = BASE / "output" / "pdf"
PDF_PATH = OUT_DIR / "Resumo_Projeto_NeuroSpace_Alert.pdf"


def esc_pdf(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_op(x, y, text, size=10, font="F1"):
    encoded = esc_pdf(text)
    return f"BT /{font} {size} Tf {x:.1f} {y:.1f} Td ({encoded}) Tj ET\n"


def line_ops(x, y, text, size=10, width=92, leading=14, font="F1"):
    ops = []
    for line in wrap(text, width=width):
        ops.append(text_op(x, y, line, size=size, font=font))
        y -= leading
    return ops, y


def make_pdf():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    page_w, page_h = 595, 842
    x = 56
    y = 790
    ops = []

    ops.append(text_op(x, y, "Resumo do Projeto - NeuroSpace Alert", size=18, font="F2"))
    y -= 28
    ops.append(text_op(x, y, "GS Cluster e Computação Neuromórfica - 1S2026", size=11, font="F2"))
    y -= 26

    integrantes = "Integrantes: Lucca Phelipe Masini (RM 564121), Igor Paixão Sarak (RM 563726) e Bernardo Braga Perobeli (RM 562468)."
    new_ops, y = line_ops(x, y, integrantes, size=10, width=92)
    ops.extend(new_ops)
    y -= 12

    sections = [
        (
            "Objetivo",
            "O projeto propôs e testou um sensor neuromórfico conceitual de baixo consumo para um módulo de operação em Marte. O sensor monitora a combinação de temperatura, radiação e poeira para detectar a evolução de uma condição crítica em ambiente extremo."
        ),
        (
            "Como foi feito",
            "Foi usado o dataset fornecido com 5 horas de operação, contendo leituras a cada 5 minutos. O notebook corrigido foi executado com uma simulação de memristor virtual: as variáveis ambientais são combinadas em V_entrada, comparadas com um limiar e acumuladas em um estado de memória local."
        ),
        (
            "Lógica do sensor",
            "Quando o estado do memristor fica abaixo de 0,35, o LED permanece APAGADO. A partir de 0,35, o LED fica AMARELO e o diagnóstico passa para OBSERVACAO. A partir de 0,65, o LED fica VERMELHO e o diagnóstico passa para ALERTA_CRITICO."
        ),
    ]

    for title, body in sections:
        ops.append(text_op(x, y, title, size=13, font="F2"))
        y -= 17
        new_ops, y = line_ops(x, y, body, size=10, width=91)
        ops.extend(new_ops)
        y -= 12

    ops.append(text_op(x, y, "Ajustes testados e resultados", size=13, font="F2"))
    y -= 20

    headers = ["Ajuste", "Perfil", "V_limiar", "Taxa", "LED amarelo", "LED vermelho"]
    rows = [
        ["A", "Sensível", "24", "0.006", "170 min", "190 min"],
        ["B", "Equilibrado", "28", "0.005", "205 min", "225 min"],
        ["C", "Conservador", "33", "0.004", "260 min", "300 min"],
    ]
    col_x = [x, x + 55, x + 155, x + 230, x + 300, x + 395]
    for i, h in enumerate(headers):
        ops.append(text_op(col_x[i], y, h, size=9, font="F2"))
    y -= 15
    for row in rows:
        for i, value in enumerate(row):
            ops.append(text_op(col_x[i], y, value, size=9))
        y -= 14
    y -= 12

    final_sections = [
        (
            "Resultado final",
            "O Ajuste B foi recomendado como protótipo conceitual final, pois equilibrou sensibilidade e estabilidade. Ele detectou observação aos 205 minutos e alerta crítico aos 225 minutos, sem ser tão antecipado quanto o ajuste sensível nem tão tardio quanto o conservador."
        ),
        (
            "Relevância neuromórfica",
            "A solução usa limiar, memória local e processamento por eventos. Em vez de transmitir todos os dados brutos continuamente, o módulo pode enviar apenas estados relevantes, reduzindo comunicação, consumo energético e dependência de uma central remota."
        ),
        (
            "Entregáveis gerados",
            "Foram produzidos o notebook executado, a tabela resumo_transicoes.csv, o arquivo de saída do Ajuste B e o relatório completo em Markdown e DOCX."
        ),
    ]

    for title, body in final_sections:
        ops.append(text_op(x, y, title, size=13, font="F2"))
        y -= 17
        new_ops, y = line_ops(x, y, body, size=10, width=91)
        ops.extend(new_ops)
        y -= 12

    ops.append(text_op(x, 38, "Arquivo gerado em PDF para resumo direto do projeto.", size=8))

    stream = "".join(ops).encode("cp1252")

    objects = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    page = (
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> "
        b"/Contents 6 0 R >>"
    )
    objects.append(page)
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("ascii") + stream + b"\nendstream")

    data = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(data))
        data.extend(f"{i} 0 obj\n".encode("ascii"))
        data.extend(obj)
        data.extend(b"\nendobj\n")

    xref_pos = len(data)
    data.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    data.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    data.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )

    PDF_PATH.write_bytes(data)
    print(PDF_PATH)


if __name__ == "__main__":
    make_pdf()
