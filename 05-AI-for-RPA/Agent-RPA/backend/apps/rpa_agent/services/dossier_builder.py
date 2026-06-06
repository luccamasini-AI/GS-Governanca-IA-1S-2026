import os
import re
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fpdf import FPDF

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'assets', 'fonts')

# --- Paleta de cores do tema industrial ---
THEME_PRIMARY = (0, 255, 204)
COLOR_DARK_BG = (2, 6, 23)
COLOR_CARD_BG = (15, 23, 42)
COLOR_BORDER = (30, 41, 59)
COLOR_WHITE = (248, 250, 252)
COLOR_MUTED = (148, 163, 184)

STATUS_COLORS = {
    "Operacional": (34, 197, 94),
    "Alerta": (234, 179, 8),
    "Manutenção Iminente": (249, 115, 22),
    "Manutencao Iminente": (249, 115, 22),
    "Risco Crítico": (239, 68, 68),
    "Risco Critico": (239, 68, 68),
}

class DossierPDF(FPDF):
    """PDF customizado com cabeçalho e rodapé industriais para o Dossiê Técnico."""

    def __init__(self, simulate_date):
        super().__init__()
        self.simulate_date = simulate_date
        self._register_fonts()

    def _register_fonts(self):
        arial_regular = os.path.join(FONTS_DIR, 'arial.ttf')
        arial_bold = os.path.join(FONTS_DIR, 'arialbd.ttf')

        if os.path.exists(arial_regular):
            self.add_font('ArialUTF', '', arial_regular)
        if os.path.exists(arial_bold):
            self.add_font('ArialUTF', 'B', arial_bold)

        self._has_custom_font = os.path.exists(arial_regular)

    def _font(self, style='', size=10):
        """Define a fonte com fallback para Helvetica se a custom não existir."""
        family = 'ArialUTF' if self._has_custom_font else 'Helvetica'
        self.set_font(family, style, size)

    def _safe_text(self, text):
        """Retorna texto seguro: limpa markdown e garante compatibilidade com a fonte."""
        cleaned = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        cleaned = re.sub(r'#{1,6}\s*', '', cleaned)
        cleaned = re.sub(r'^---+$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'\u2011', '-', cleaned)
        if self._has_custom_font:
            return cleaned
        return cleaned.encode('latin-1', 'replace').decode('latin-1')

    def header(self):
        self._font('B', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, self._safe_text('DIGITAL TWIN PLATFORM — DOSSIÊ TÉCNICO DE ENGENHARIA'), 0, 0, 'L')
        self.cell(0, 8, self._safe_text(f'Data: {self.simulate_date}'), 0, 1, 'R')

        # Linha decorativa com cor primária
        self.set_draw_color(*THEME_PRIMARY)
        self.set_line_width(0.8)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self._font('', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, self._safe_text(f'Página {self.page_no()}/{{nb}}'), 0, 0, 'L')
        self.cell(0, 10, self._safe_text('Gerado automaticamente por Digital Twin Platform (RPA + IA)'), 0, 0, 'R')

    def section_title(self, number, title):
        self.ln(6)
        self.set_draw_color(*THEME_PRIMARY)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)
        self._font('B', 13)
        self.set_text_color(0, 0, 0)
        self.cell(0, 10, self._safe_text(f'{number}. {title}'), 0, 1)
        self.ln(2)

    def kpi_row(self, label, value, color=(0, 0, 0)):
        self._font('', 10)
        self.set_text_color(80, 80, 80)
        self.cell(80, 8, self._safe_text(label), 0, 0)
        self._font('B', 11)
        self.set_text_color(*color)
        self.cell(0, 8, self._safe_text(str(value)), 0, 1)


def generate_pie_chart(sizes, title, filepath, figsize=(7, 5)):
    labels = ['Operacional', 'Alerta', 'Manutenção Iminente', 'Risco Crítico']
    colors_chart = ['#22c55e', '#eab308', '#f97316', '#ef4444']
    fig, ax = plt.subplots(figsize=figsize)
    fig.patch.set_facecolor('white')
    non_zero = [(s, l, c) for s, l, c in zip(sizes, labels, colors_chart) if s > 0]
    if non_zero:
        sz, lb, cl = zip(*non_zero)
        wedges, texts, autotexts = ax.pie(
            sz, labels=lb, colors=cl, autopct='%1.1f%%',
            startangle=140, pctdistance=0.85,
            wedgeprops=dict(width=0.5, edgecolor='white', linewidth=2 if figsize[0] > 5 else 1)
        )
        for txt in texts:
            txt.set_fontsize(10 if figsize[0] > 5 else 8)
            txt.set_fontweight('bold')
        for at in autotexts:
            at.set_fontsize(9 if figsize[0] > 5 else 7)
            at.set_color('white')
            at.set_fontweight('bold')
    else:
        ax.pie([1], labels=['Nenhum Ativo'], colors=['#94a3b8'])

    ax.set_title(title, fontsize=13 if figsize[0] > 5 else 10, fontweight='bold', pad=20 if figsize[0] > 5 else 10)
    plt.tight_layout()
    plt.savefig(filepath, dpi=150, facecolor='white', bbox_inches='tight')
    plt.close()

def build_dossier(report_data, risk_distribution, simulate_date, reports_dir,
                  nlp_text, total_active=0, total_failed=0, avg_rul=0):
    """Gera o Dossiê Técnico em PDF com layout profissional, dado o texto do agente IA."""

    chart_path = os.path.join(reports_dir, f"chart_{simulate_date}.png")

    # --- Gráfico de pizza geral ---
    sizes = [
        risk_distribution.get("operacional", 0),
        risk_distribution.get("alerta", 0),
        risk_distribution.get("manutencao_iminente", 0),
        risk_distribution.get("risco_critico", 0)
    ]
    generate_pie_chart(sizes, f'Distribuição de Risco Global ({simulate_date})', chart_path)

    # --- Gráficos por Frota ---
    fleets = sorted(list(set([m.get('Frota', 'Unknown') for m in report_data])))
    fleet_charts = []
    for fleet in fleets:
        f_motors = [m for m in report_data if m.get('Frota') == fleet]
        counts = {"Operacional": 0, "Alerta": 0, "Manutenção Iminente": 0, "Risco Crítico": 0, "Manutencao Iminente": 0, "Risco Critico": 0}
        for m in f_motors:
            counts[m.get('Status', '')] += 1
        
        f_sizes = [
            counts["Operacional"],
            counts["Alerta"],
            counts["Manutenção Iminente"] + counts["Manutencao Iminente"],
            counts["Risco Crítico"] + counts["Risco Critico"]
        ]
        f_path = os.path.join(reports_dir, f"chart_{simulate_date}_{fleet}.png")
        generate_pie_chart(f_sizes, f'Frota {fleet.replace("TRAIN_", "")}', f_path, figsize=(4, 3))
        fleet_charts.append(f_path)

    # --- Filtra críticos para a tabela ---
    critical = [
        m for m in report_data
        if m.get('Status') in ['Risco Crítico', 'Manutenção Iminente', 'Risco Critico', 'Manutencao Iminente']
    ]

    # --- Construção do PDF ---
    pdf = DossierPDF(simulate_date)
    pdf.alias_nb_pages()
    pdf.add_page()

    # Título principal
    pdf._font('B', 20)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 14, pdf._safe_text('Dossiê Técnico de Engenharia'), 0, 1, 'C')
    pdf._font('', 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, pdf._safe_text(f'Triagem Preditiva RPA — Simulação: {simulate_date}'), 0, 1, 'C')
    pdf.ln(4)

    # Seção 1: Indicadores Chave
    pdf.section_title(1, 'Indicadores Chave da Frota')

    pdf.kpi_row('Motores Ativos:', str(total_active))
    pdf.kpi_row('Motores em Fim de Vida (Falhas):', str(total_failed), (239, 68, 68))
    pdf.kpi_row('RUL Médio da Frota:', f'{avg_rul} ciclos', (0, 180, 150))
    pdf.kpi_row('Motores em Risco Crítico:', str(risk_distribution.get('risco_critico', 0)), (239, 68, 68))
    pdf.kpi_row('Motores em Manutenção Iminente:', str(risk_distribution.get('manutencao_iminente', 0)), (249, 115, 22))
    pdf.kpi_row('Motores em Alerta:', str(risk_distribution.get('alerta', 0)), (234, 179, 8))
    pdf.kpi_row('Motores Operacionais:', str(risk_distribution.get('operacional', 0)), (34, 197, 94))

    # Seção 2: Distribuição de Risco (Geral e Frotas)
    pdf.section_title(2, 'Distribuição de Risco Global e por Frota')
    pdf.image(chart_path, x=30, w=150)
    pdf.ln(5)

    # Adicionando os gráficos das frotas em grid 2x2
    x_positions = [20, 110]
    y_start = pdf.get_y()
    
    for i, f_chart in enumerate(fleet_charts):
        if i > 0 and i % 2 == 0:
            pdf.ln(60)
            y_start = pdf.get_y()
            if y_start > 220:
                pdf.add_page()
                y_start = pdf.get_y()
        pdf.image(f_chart, x=x_positions[i % 2], y=y_start, w=80)
    
    pdf.ln(65)

    # Seção 3: Parecer Técnico IA
    pdf.section_title(3, 'Parecer Técnico Multimodal (IA Generativa)')

    # Borda lateral decorativa
    start_y = pdf.get_y()
    pdf._font('', 10)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 6, pdf._safe_text(nlp_text))
    end_y = pdf.get_y()

    pdf.set_draw_color(*THEME_PRIMARY)
    pdf.set_line_width(1.5)
    pdf.line(10, start_y, 10, end_y)

    # Seção 4: Motores Críticos (tabela)
    pdf.section_title(4, 'Motores Críticos (Prioridade de Manutenção)')

    sorted_critical = sorted(critical, key=lambda x: x.get('Vida Útil Restante (RUL)', 0))

    if sorted_critical:
        # Cabeçalho da tabela
        pdf._font('B', 10)
        pdf.set_fill_color(30, 41, 59)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(50, 9, '  Frota', 1, 0, 'L', True)
        pdf.cell(30, 9, 'Motor ID', 1, 0, 'C', True)
        pdf.cell(50, 9, 'RUL (ciclos)', 1, 0, 'C', True)
        pdf.cell(60, 9, 'Status', 1, 1, 'C', True)

        # Linhas da tabela
        pdf._font('', 10)
        for index, motor in enumerate(sorted_critical):
            fill = index % 2 == 0
            if fill:
                pdf.set_fill_color(240, 245, 250)
            else:
                pdf.set_fill_color(255, 255, 255)

            pdf.set_text_color(40, 40, 40)
            frota_display = motor.get('Frota', '').replace('TRAIN_', 'Frota ')
            pdf.cell(50, 8, pdf._safe_text(f'  {frota_display}'), 1, 0, 'L', fill)
            pdf.cell(30, 8, pdf._safe_text(f'#{motor.get("Motor ID", "")}'), 1, 0, 'C', fill)
            pdf.cell(50, 8, pdf._safe_text(str(motor.get('Vida Útil Restante (RUL)', 0))), 1, 0, 'C', fill)

            status = motor.get('Status', '')
            status_color = STATUS_COLORS.get(status, (40, 40, 40))
            pdf.set_text_color(*status_color)
            pdf._font('B', 10)
            pdf.cell(60, 8, pdf._safe_text(status), 1, 1, 'C', fill)
            pdf._font('', 10)
    else:
        pdf._font('', 10)
        pdf.set_text_color(34, 197, 94)
        pdf.cell(0, 8, pdf._safe_text('Nenhum motor em estado crítico ou de manutenção iminente.'), 0, 1)

    # Salvar PDF
    pdf_filename = f"Dossie_Tecnico_{simulate_date}.pdf"
    pdf_filepath = os.path.join(reports_dir, pdf_filename)
    pdf.output(pdf_filepath)

    # Limpar gráfico temporário
    try:
        os.remove(chart_path)
        for f_chart in fleet_charts:
            os.remove(f_chart)
    except OSError:
        pass

    return pdf_filename
