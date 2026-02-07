from services.sheets import get_sheet_data, get_credentials
import os
from googleapiclient.discovery import build
from dotenv import load_dotenv

# Load Env
load_dotenv()
os.environ['SPREADSHEET_ID'] = '1L2lfL6h4eoYU_U276e0dYFgENAgGruxiWJWOfgazD74'
os.environ['FLASK_ENV'] = 'production'

print("--- DEBUGGING HEADERS & COLUMNS ---")

try:
    creds = get_credentials()
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    RANGE_NAME = "BASE!A:AZ"
    
    result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME).execute()
    values = result.get('values', [])
    
    if not values:
        print("No data found.")
        exit()

    headers = [h.strip().upper() for h in values[0]]
    print(f"Total Columns: {len(headers)}")
    for i, h in enumerate(headers):
        print(f"[{i}] {h}")

    print("\n--- IDENTIFYING COLUMNS ---")
    
    def get_col_index(name_options, debug_name):
        for name in name_options:
            name_upper = name.upper()
            for i, header in enumerate(headers):
                if name_upper in header: 
                    print(f"Match for '{debug_name}' ('{name}'): [{i}] {header}")
                    return i
        print(f"NO MATCH for '{debug_name}' using: {name_options}")
        return -1

    idx_ticker = get_col_index(["TICKER", "ATIVO", "CÓDIGO"], "TICKER")
    idx_falta = get_col_index(["FALTA"], "FALTA")
    idx_min_val = get_col_index(["MENOR VALOR", "CUSTO BAIXO", "CUSTO", "VALOR MINIMO", "MIN VALOR"], "MENOR PAGO (MIN VAL)")
    idx_max_val = get_col_index(["MAIOR VALOR", "CUSTO ALTO", "VALOR MAXIMO", "MAX VALOR"], "MAIOR PAGO (MAX VAL)")
    idx_vol_ano = get_col_index(["VOLATILIDADE", "VOL ANO"], "VOL ANO")

    print("\n--- SAMPLE DATA (First 5 Rows) ---")
    for i, row in enumerate(values[1:6]):
        try:
            ticker = row[idx_ticker] if 0 <= idx_ticker < len(row) else "?"
            falta = row[idx_falta] if 0 <= idx_falta < len(row) else "?"
            min_v = row[idx_min_val] if 0 <= idx_min_val < len(row) else "?"
            max_v = row[idx_max_val] if 0 <= idx_max_val < len(row) else "?"
            vol = row[idx_vol_ano] if 0 <= idx_vol_ano < len(row) else "?"
            
            print(f"Row {i+2}: {ticker} | Falta='{falta}' | Min='{min_v}' | Max='{max_v}' | Vol='{vol}'")
        except Exception as e:
            print(f"Row {i+2}: Error {e}")

except Exception as e:
    print(f"Main Error: {e}")
