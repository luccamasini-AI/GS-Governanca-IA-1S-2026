import os
import sqlite3
import pandas as pd
from datetime import datetime
from backend.shared_infra.config import settings
from backend.apps.rpa_agent.services.nlp_agent import generate_nlp_report
from backend.apps.rpa_agent.services.dossier_builder import build_dossier

def execute_triage(simulate_date: str) -> dict:
    """Orquestra o pipeline RPA: coleta de dados, classificação, NLP, PDF e Excel."""
    
    db_path = settings.cmapss_database_path
    
    total_active = 0
    total_failed = 0
    risk_distribution = {"operacional": 0, "alerta": 0, "manutencao_iminente": 0, "risco_critico": 0}
    ruls = []
    report_data = []
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    tables = ['train_fd001', 'train_fd002', 'train_fd003', 'train_fd004']
    
    # 1. Coleta e Classificação de Risco
    for table in tables:
        dataset_id = int(table[-1])
        cursor.execute(f'''
            SELECT unit_number, MAX("simulate-date") as final_date, MAX(time_in_cycles) as max_cycle
            FROM {table}
            GROUP BY unit_number
        ''')
        motors = cursor.fetchall()
        
        for m in motors:
            unit = m['unit_number']
            final_date = m['final_date']
            max_cycle = m['max_cycle']
            
            if final_date <= simulate_date:
                total_failed += 1
            else:
                total_active += 1
                date_format = "%Y-%m-%d"
                fd = datetime.strptime(final_date, date_format).date()
                td = datetime.strptime(simulate_date, date_format).date()
                rul = (fd - td).days
                current_cycle = max_cycle - rul
                ruls.append(rul)
                
                if rul <= 5: 
                    risk_distribution["risco_critico"] += 1
                    status = "Risco Crítico"
                elif rul <= 15: 
                    risk_distribution["manutencao_iminente"] += 1
                    status = "Manutenção Iminente"
                elif rul <= 30: 
                    risk_distribution["alerta"] += 1
                    status = "Alerta"
                else: 
                    risk_distribution["operacional"] += 1
                    status = "Operacional"
                    
                report_data.append({
                    "dataset_id": dataset_id,
                    "Frota": table.upper(),
                    "Motor ID": unit,
                    "cycle": current_cycle,
                    "Status": status,
                    "Vida Útil Restante (RUL)": rul,
                    "Data Limite Predita": final_date
                })
                
    telemetry_data = []
    for table in tables:
        dataset_id = int(table[-1])
        cursor.execute(f'SELECT * FROM {table} WHERE "simulate-date" = ?', (simulate_date,))
        rows = cursor.fetchall()
        for row in rows:
            row_dict = dict(row)
            row_dict['dataset_id'] = dataset_id
            telemetry_data.append(row_dict)
            
    conn.close()
    
    avg_rul_val = int(sum(ruls)/len(ruls)) if ruls else 0
    
    # 2. Exportação Excel
    df_overview = pd.DataFrame(report_data)
    df_telemetry = pd.DataFrame(telemetry_data)
    
    reports_dir = settings.temp_reports_dir
    filename = f"Triagem_RPA_{simulate_date}.xlsx"
    filepath = os.path.join(reports_dir, filename)
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        if not df_overview.empty:
            df_overview.sort_values(by="Vida Útil Restante (RUL)", ascending=True).to_excel(writer, sheet_name="Overview_Frota", index=False)
        if not df_telemetry.empty:
            df_telemetry.to_excel(writer, sheet_name="Telemetria_Completa", index=False)
            
    # 3. Agente NLP (IA)
    critical = [
        m for m in report_data
        if m.get('Status') in ['Risco Crítico', 'Manutenção Iminente', 'Risco Critico', 'Manutencao Iminente']
    ]
    nlp_text = generate_nlp_report(
        critical_motors=critical, 
        total_active=total_active, 
        total_failed=total_failed, 
        risk_distribution=risk_distribution, 
        avg_rul=avg_rul_val
    )
            
    # 4. Construção do Dossiê PDF
    try:
        pdf_filename = build_dossier(
            report_data=report_data, 
            risk_distribution=risk_distribution, 
            simulate_date=simulate_date, 
            reports_dir=reports_dir,
            nlp_text=nlp_text,
            total_active=total_active, 
            total_failed=total_failed, 
            avg_rul=avg_rul_val
        )
    except Exception as e:
        import traceback
        err_path = os.path.join(settings.logs_dir, "error_pdf.log")
        with open(err_path, 'w') as errf:
            traceback.print_exc(file=errf)
            errf.write(f"\nErro: {e}")
        pdf_filename = None

    # 5. Auditoria (Log)
    log_path = os.path.join(settings.logs_dir, "rpa_audit_trail.log")
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] RPA Executado para {simulate_date}: {total_active} Ativos. Excel e PDF gerados.\n")
    
    return {
        "status": "success",
        "total_active": total_active,
        "total_failed": total_failed,
        "avg_rul": avg_rul_val,
        "risk_distribution": risk_distribution,
        "report_file": filename,
        "dossier_file": pdf_filename,
        "agent_report": nlp_text,
        "details": report_data
    }
