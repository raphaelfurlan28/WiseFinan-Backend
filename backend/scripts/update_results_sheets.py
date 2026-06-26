import os
import sys
import re
import time
import argparse
import unicodedata
import requests
import gspread
from google.oauth2.service_account import Credentials

# Mapping of tickers to their corresponding page names/tickers on Investidor10 if different.
TICKER_MAPPINGS = {
    "ISAE4": "TRPL4"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def log(msg, force=True):
    if force:
        print(f"[RESULTS AUTOMATION] {msg}", flush=True)

def normalize_label(s):
    if not s:
        return ""
    # Remove HTML tags if any
    s = re.sub(r'<[^>]*>', '', s)
    # Normalize to NFC and remove accents
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    s = s.lower().strip()
    return s

def parse_financial_value(val_list):
    if not val_list or len(val_list) < 2:
        return ""
    val_str = val_list[1].strip()
    # Remove thousand separators (.) and replace decimal separator (,) with (.)
    # e.g., ' 3.885.567.000' -> '3885567000'
    val_str = val_str.replace('.', '').replace(',', '.')
    try:
        if '.' in val_str:
            return float(val_str)
        return int(val_str)
    except ValueError:
        return val_str

def clean_sheet_value(val):
    if not val:
        return ""
    val_str = str(val).strip()
    if not val_str:
        return ""
    if re.match(r'^-?[0-9.,]+$', val_str):
        if ',' in val_str and '.' in val_str:
            val_str = val_str.replace('.', '').replace(',', '.')
        elif ',' in val_str:
            val_str = val_str.replace(',', '.')
        elif '.' in val_str:
            parts = val_str.split('.')
            if len(parts) > 2:
                val_str = val_str.replace('.', '')
            elif len(parts) == 2:
                if len(parts[1]) == 3:
                    val_str = val_str.replace('.', '')
        try:
            if '.' in val_str:
                return float(val_str)
            return int(val_str)
        except ValueError:
            return val_str
    return val_str

def get_company_id(ticker):
    mapped_ticker = TICKER_MAPPINGS.get(ticker, ticker).lower()
    url = f"https://investidor10.com.br/acoes/{mapped_ticker}/"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    html = r.text
    
    # Try finding via AJAX endpoints in scripts
    patterns = [
        r"/api/balancos/balancoresultados/chart/(\d+)/",
        r"/api/balancos/balancopatrimonial/chart/(\d+)/",
        r"/api/balancos/receitaliquida/chart/(\d+)/"
    ]
    for pat in patterns:
        match = re.search(pat, html)
        if match:
            return match.group(1)
            
    # Try finding companyId variable
    match_var = re.search(r"companyId\s*=\s*(\d+)", html)
    if match_var:
        return match_var.group(1)
        
    return None

def fetch_quarterly_data(company_id):
    # Fetch Results (for Lucro Líquido)
    results_url = f"https://investidor10.com.br/api/balancos/balancoresultados/chart/{company_id}/10/quarter/"
    res_r = requests.get(results_url, headers=HEADERS, timeout=15)
    res_r.raise_for_status()
    results_data = res_r.json()
    
    # Fetch Balance Sheet (for Patrimônio Líquido)
    sheet_url = f"https://investidor10.com.br/api/balancos/balancopatrimonial/chart/{company_id}/false/"
    sheet_r = requests.get(sheet_url, headers=HEADERS, timeout=15)
    sheet_r.raise_for_status()
    sheet_data = sheet_r.json()
    
    return results_data, sheet_data

def extract_latest_values(results_json, sheet_json):
    latest_quarter = None
    lucro_val = ""
    pat_val = ""
    
    # 1. Parse Lucro Líquido
    if len(results_json) > 0:
        header_row = results_json[0]
        # Find first quarter column in header (normally index 1)
        quarter_col_idx = None
        for idx, item in enumerate(header_row):
            if idx == 0: continue
            if "T" in item and len(item) == 6: # e.g. "1T2026", "4T2025"
                latest_quarter = item
                quarter_col_idx = idx
                break
                
        if quarter_col_idx is not None:
            for row in results_json[1:]:
                norm_label = normalize_label(row[0])
                if "lucro liquido" in norm_label:
                    lucro_val = parse_financial_value(row[quarter_col_idx])
                    break
                    
    # 2. Parse Patrimônio Líquido Consolidado
    if len(sheet_json) > 0 and latest_quarter is not None:
        header_row = sheet_json[0]
        quarter_col_idx = None
        # Find the column corresponding to the same latest quarter
        for idx, item in enumerate(header_row):
            if item == latest_quarter:
                quarter_col_idx = idx
                break
                
        if quarter_col_idx is not None:
            for row in sheet_json[1:]:
                norm_label = normalize_label(row[0])
                if "patrimonio liquido consolidado" in norm_label or ("patrimonio" in norm_label and "consolidado" in norm_label):
                    pat_val = parse_financial_value(row[quarter_col_idx])
                    break
                    
    return latest_quarter, lucro_val, pat_val

def update_grid(grid, ticker, quarter, value):
    header = grid[0]
    ticker_row_idx = None
    
    # Locate ticker row (case-insensitive)
    for idx, r in enumerate(grid):
        if idx == 0: continue
        if r[0].strip().upper() == ticker.strip().upper():
            ticker_row_idx = idx
            break
            
    if ticker_row_idx is None:
        ticker_row_idx = len(grid)
        new_row = [ticker] + [""] * (len(header) - 1)
        grid.append(new_row)
        
    # Check if quarter exists in header
    if quarter not in header:
        # Insert new quarter at column B (index 1)
        header.insert(1, quarter)
        for idx in range(1, len(grid)):
            grid[idx].insert(1, "")
        col_idx = 1
        log(f"Inserindo nova coluna de trimestre '{quarter}' na posição B da planilha.")
    else:
        col_idx = header.index(quarter)
        
    # Fill value
    while len(grid[ticker_row_idx]) < len(header):
        grid[ticker_row_idx].append("")
    grid[ticker_row_idx][col_idx] = value

def main():
    parser = argparse.ArgumentParser(description="Atualiza planilhas de Lucro Líquido e Patrimônio Líquido no Google Sheets")
    parser.add_argument("--sheet-name", default="Fundamentos Ações", help="Nome da planilha Google Sheets")
    parser.add_argument("--tab-luc", default="LUC LIQ", help="Nome da aba de Lucro Líquido")
    parser.add_argument("--tab-pat", default="PAT LIQ", help="Nome da aba de Patrimônio Líquido")
    parser.add_argument("--cred-file", default="service_account.json", help="Caminho do arquivo service_account.json")
    args = parser.parse_args()
    
    # Resolve credentials file path if not absolute
    cred_path = args.cred_file
    if not os.path.isabs(cred_path):
        # Check standard locations
        bases = [
            os.path.dirname(os.path.abspath(__file__)),
            os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")),
            os.getcwd()
        ]
        found = False
        for base in bases:
            p = os.path.join(base, args.cred_file)
            if os.path.exists(p):
                cred_path = p
                found = True
                break
        if not found:
            log(f"AVISO: {args.cred_file} não encontrado nos caminhos padrão. Tentando caminho direto.", force=True)
            
    log(f"Iniciando atualização de resultados trimestrais.")
    log(f"Usando credenciais de: '{cred_path}'")
    
    try:
        scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
        creds = Credentials.from_service_account_file(cred_path, scopes=scope)
        gc = gspread.authorize(creds)
        sh = gc.open(args.sheet_name)
        
        ws_luc = sh.worksheet(args.tab_luc)
        ws_pat = sh.worksheet(args.tab_pat)
    except Exception as e:
        log(f"ERRO ao conectar com a planilha Google Sheets: {e}", force=True)
        sys.exit(1)
        
    log("Conectado com sucesso à planilha!")
    
    # Read sheet data
    luc_grid = ws_luc.get_all_values()
    pat_grid = ws_pat.get_all_values()
    
    if not luc_grid or len(luc_grid) < 2:
        log("ERRO: Aba de Lucro Líquido está vazia ou sem estrutura.", force=True)
        sys.exit(1)
        
    # Clean existing values to make sure they are parsed and written as actual numbers
    for r_idx in range(1, len(luc_grid)):
        for c_idx in range(1, len(luc_grid[r_idx])):
            luc_grid[r_idx][c_idx] = clean_sheet_value(luc_grid[r_idx][c_idx])
            
    for r_idx in range(1, len(pat_grid)):
        for c_idx in range(1, len(pat_grid[r_idx])):
            pat_grid[r_idx][c_idx] = clean_sheet_value(pat_grid[r_idx][c_idx])
            
    tickers = [row[0].strip().upper() for row in luc_grid[1:] if row[0].strip()]
    log(f"Encontrados {len(tickers)} tickers para processar.")
    
    success_count = 0
    
    for idx, ticker in enumerate(tickers):
        log(f"[{idx+1}/{len(tickers)}] Processando {ticker}...")
        try:
            # 1. Extract company ID
            company_id = get_company_id(ticker)
            if not company_id:
                log(f"  [AVISO] Não foi possível encontrar o ID da empresa para o ticker {ticker}.", force=True)
                continue
                
            # 2. Fetch API data
            res_json, sheet_json = fetch_quarterly_data(company_id)
            
            # 3. Extract values
            quarter, lucro, pat = extract_latest_values(res_json, sheet_json)
            
            if not quarter:
                log(f"  [AVISO] Nenhum dado trimestral encontrado para o ticker {ticker}.", force=True)
                continue
                
            log(f"  Trimestre mais recente: {quarter} | Lucro Líquido: {lucro} | Patrimônio Líquido: {pat}")
            
            # 4. Update memory grids
            update_grid(luc_grid, ticker, quarter, lucro)
            update_grid(pat_grid, ticker, quarter, pat)
            success_count += 1
            
        except Exception as e:
            log(f"  [ERRO] Falha ao processar {ticker}: {e}", force=True)
            
        time.sleep(1.0) # Rate limit delay
        
    log(f"Processamento concluído. Sucesso em {success_count} de {len(tickers)} tickers.")
    
    # 5. Save grid data back to Google Sheets in single batch write calls
    if success_count > 0:
        try:
            log("Salvando dados da aba LUC LIQ no Google Sheets...")
            ws_luc.clear()
            ws_luc.update(values=luc_grid, range_name='A1', value_input_option='USER_ENTERED')
            log("Aba LUC LIQ atualizada com sucesso!")
            
            log("Salvando dados da aba PAT LIQ no Google Sheets...")
            ws_pat.clear()
            ws_pat.update(values=pat_grid, range_name='A1', value_input_option='USER_ENTERED')
            log("Aba PAT LIQ atualizada com sucesso!")
            
        except Exception as e:
            log(f"ERRO ao salvar dados na planilha: {e}", force=True)
            sys.exit(1)
    else:
        log("Nenhum ticker foi atualizado com sucesso. Pulando gravação na planilha.", force=True)
        
    log("Atualização de resultados financeiros trimestrais concluída com sucesso!", force=True)

if __name__ == "__main__":
    main()
