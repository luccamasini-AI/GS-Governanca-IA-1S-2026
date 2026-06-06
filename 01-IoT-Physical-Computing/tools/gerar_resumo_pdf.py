from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "resumo-projeto-astroagro.pdf"


TITLE = "Resumo do Projeto - AstroAgro Sentinel"
SUBTITLE = "Global Solution 2026.1 - IoT e Nova Economia Espacial"

SECTIONS = [
    (
        "Integrantes",
        [
            "Lucca Phelipe Masini (RM 564121)",
            "Igor Paixão Sarak (RM 563726)",
            "Bernardo Braga Perobeli (RM 562468)",
        ],
    ),
    (
        "Objetivo",
        [
            "O projeto desenvolve uma solução IoT fictícia para agricultura sustentável dentro do tema da nova economia espacial. A proposta conecta sensores locais instalados em uma área agrícola a uma plataforma IoT que simula o uso de dados orbitais para apoiar decisões de irrigação, alerta e monitoramento.",
        ],
    ),
    (
        "O que foi implementado",
        [
            "Firmware para ESP32 com leitura de sensores, envio de telemetria via MQTT e recebimento de comandos remotos de irrigação.",
            "Fluxo Node-RED para orquestração, cálculo do Índice AstroAgro de Risco, gravação em SQLite, dashboard e alertas.",
            "Banco SQLite com estrutura para armazenar medições, estado da aplicação, risco calculado e recomendação operacional.",
            "Simulador Python para demonstrar o projeto sem hardware físico, gerando cenários normais, críticos e de falha operacional.",
            "Documentação de demonstração e roteiro de pitch para apresentação de até 5 minutos.",
        ],
    ),
    (
        "Arquitetura final",
        [
            "O ESP32, ou o simulador Python, publica leituras no tópico MQTT astroagro/sensores. O Node-RED processa essas mensagens, atualiza o dashboard, registra os dados em SQLite e publica alertas no tópico astroagro/alertas. A plataforma também envia comandos para astroagro/comandos/irrigacao, permitindo ligar ou desligar a irrigação.",
        ],
    ),
    (
        "Critérios atendidos",
        [
            "Aplicação alinhada ao tema espacial, usando um índice orbital simulado como complemento aos dados dos sensores.",
            "Uso de múltiplos sensores e atuador: umidade do solo, temperatura, umidade do ar, luminosidade, nível de água, fluxo e relé/LED de irrigação.",
            "Transmissão de dados por MQTT, orquestração por Node-RED, armazenamento em SQLite e visualização em dashboard.",
            "Alertas externos por Telegram, quando configurado, e publicação de alertas no broker MQTT.",
            "Comunicação bidirecional entre dispositivo e plataforma, com comandos remotos para irrigação.",
            "Inovação por meio do Índice AstroAgro de Risco, que classifica o cenário como baixo, médio ou alto e gera recomendação prática.",
        ],
    ),
    (
        "Resultado final",
        [
            "O resultado é um protótipo acadêmico funcional e demonstrável. Ele permite simular ou executar uma solução IoT completa, mostrando coleta de dados, processamento em nuvem, armazenamento, dashboard, alertas e acionamento remoto. O projeto evidencia como dados espaciais e sensores terrestres podem trabalhar juntos para economia de água, sustentabilidade agrícola e tomada de decisão em tempo real.",
        ],
    ),
]


def pdf_escape(text: str) -> str:
    encoded = text.encode("cp1252", errors="replace").decode("cp1252")
    return encoded.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def add_text_line(commands, text, x, y, size=10, bold=False):
    font = "F2" if bold else "F1"
    commands.append(f"BT /{font} {size} Tf {x} {y} Td ({pdf_escape(text)}) Tj ET")


def build_pages():
    pages = []
    commands = []
    y = 790

    def new_page():
        nonlocal commands, y
        if commands:
            pages.append(commands)
        commands = []
        y = 790

    add_text_line(commands, TITLE, 50, y, 18, True)
    y -= 24
    add_text_line(commands, SUBTITLE, 50, y, 11)
    y -= 26

    for heading, paragraphs in SECTIONS:
        if y < 110:
            new_page()
        add_text_line(commands, heading, 50, y, 13, True)
        y -= 18

        for paragraph in paragraphs:
            prefix = "- " if len(paragraphs) > 1 else ""
            wrapped = textwrap.wrap(prefix + paragraph, width=92)
            for line in wrapped:
                if y < 55:
                    new_page()
                add_text_line(commands, line, 58, y, 10)
                y -= 14
            y -= 4
        y -= 6

    if commands:
        pages.append(commands)
    return pages


def make_pdf(output: Path):
    page_commands = build_pages()
    objects = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    font_regular = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    font_bold = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

    page_ids = []
    content_ids = []

    for commands in page_commands:
        stream = "\n".join(commands).encode("cp1252", errors="replace")
        content = b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream"
        content_ids.append(add_object(content))
        page_ids.append(None)

    pages_id = len(objects) + len(page_commands) + 1

    for index, content_id in enumerate(content_ids):
        page = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode("ascii")
        page_ids[index] = add_object(page)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    pages = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")
    real_pages_id = add_object(pages)
    assert real_pages_id == pages_id

    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("ascii"))

    chunks = [b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"]
    offsets = [0]
    current = len(chunks[0])
    for number, obj in enumerate(objects, start=1):
        offsets.append(current)
        chunk = f"{number} 0 obj\n".encode("ascii") + obj + b"\nendobj\n"
        chunks.append(chunk)
        current += len(chunk)

    xref_offset = current
    xref = [f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii")]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n".encode("ascii"))
    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("ascii")

    output.write_bytes(b"".join(chunks + xref + [trailer]))


if __name__ == "__main__":
    make_pdf(OUTPUT)
    print(OUTPUT)
