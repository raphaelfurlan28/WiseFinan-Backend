
# =========================== MAIN EXECUTION ===========================
import argparse
import sys
import os

def log(msg, debug=False, force=False):
    if debug or force or True:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet-name", required=True)
    parser.add_argument("--tab-diario", required=True)
    parser.add_argument("--tab-hist", required=False)
    parser.add_argument("--cred-file", required=True)
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--force-selenium", action="store_true")
    args = parser.parse_args()

    log("Iniciando atualização de Renda Fixa...", force=True)

    # 1. Fetch Data
    try:
        raw_data = fetch_td_raw(force_selenium=args.force_selenium, debug=args.debug)
    except Exception as e:
        log(f"Erro no fetch: {e}", force=True)
        sys.exit(1)

    # 2. Normalize
    try:
        df = normalize_td(raw_data, debug=args.debug)
    except Exception as e:
        log(f"Erro na normalização: {e}", force=True)
        sys.exit(1)

    # 3. Save to Sheets
    try:
        from gspread_dataframe import set_with_dataframe
        
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = Credentials.from_service_account_file(args.cred_file, scopes=scope)
        gc = gspread.authorize(creds)
        
        sh = gc.open(args.sheet_name)
        try:
            ws = sh.worksheet(args.tab_diario)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=args.tab_diario, rows=100, cols=20)
            
        ws.clear()
        set_with_dataframe(ws, df, include_index=False, include_column_header=True)
        log("Planilha (Diário) atualizada com sucesso!", force=True)
        
    except Exception as e:
        log(f"Erro ao salvar no Google Sheets: {e}", force=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
