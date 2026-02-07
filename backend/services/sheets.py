import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from services.cache import cached, get_cached_value

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
# Resolve service_account.json relative to this file
# This file is in backend/services/sheets.py
# Root is ../../
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, '../../'))
SERVICE_ACCOUNT_FILE = os.path.join(root_dir, 'service_account.json')

def get_credentials():
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    # Option 1: Env Var (Render/Cloud)
    if os.environ.get('GOOGLE_CREDENTIALS_JSON'):
        try:
            info = json.loads(os.environ.get('GOOGLE_CREDENTIALS_JSON'))
            return Credentials.from_service_account_info(info, scopes=scopes)
        except json.JSONDecodeError:
            print("Error decoding GOOGLE_CREDENTIALS_JSON")
    
    # Option 2: Local File Search
    # Check: Global definition, Backend dir (../), Current Dir
    backend_creds = os.path.abspath(os.path.join(current_dir, '../service_account.json'))
    paths = [
        SERVICE_ACCOUNT_FILE, # Defined globally as ../../ (Root)
        backend_creds,        # backend/service_account.json
        'service_account.json' # CWD
    ]
    
    for path in paths:
        if os.path.exists(path):
            try:
                # print(f"Loading from: {path}")
                return Credentials.from_service_account_file(path, scopes=scopes)
            except Exception as e:
                print(f"Error loading credentials from {path}: {e}")
    
    # Fallback/Error
    print(f"Warning: No Google Credentials found. Searched: {paths}")
    return None

@cached(ttl_seconds=300)
def get_sheet_data():
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    
    # Read BASE sheet
    # Assuming range A:AZ covers all needed columns
    RANGE_NAME = "BASE!A:AZ"
    
    try:
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=RANGE_NAME).execute()
        values = result.get('values', [])
    except Exception as e:
        print(f"Error fetching sheet data: {e}")
        return []

    if not values:
        print('No data found.')
        return []

    # Parse headers (Row 1, index 0)
    headers = [h.strip().upper() for h in values[0]]
    
    # Try to identify columns dynamically
    def get_col_index(name_options):
        for name in name_options:
            name_upper = name.upper()
            for i, header in enumerate(headers):
                if name_upper in header: 
                    return i
        return -1

    idx_ticker = get_col_index(["TICKER", "ATIVO", "CÓDIGO"])
    idx_price = get_col_index(["PREÇO", "COTAÇÃO", "VALOR ATUAL"])
    idx_min_12m = get_col_index(["MÍNIMA 12 MESES", "MIN 12M", "MINIMA"])
    idx_max_12m = get_col_index(["MÁXIMA 12 MESES", "MAX 12M", "MAXIMA"])
    
    # Valuation Columns
    idx_falta = get_col_index(["FALTA"])
    # User calls it "Menor Valor", UI shows "Custo Baixo". Add both.
    idx_min_val = get_col_index(["MENOR VALOR", "CUSTO BAIXO", "CUSTO", "VALOR MINIMO", "MIN VALOR"])
    idx_max_val = get_col_index(["MAIOR VALOR", "CUSTO ALTO", "VALOR MAXIMO", "MAX VALOR"])

    # Fallback to defaults if not found (based on user image logic)
    # But dynamic search is safer.
    
    stocks = []
    
    for row in values[1:]:
        # Helper to get value safely
        def get_val(idx):
             if idx == -1: return ""
             return row[idx] if 0 <= idx < len(row) else ""
             
        t = get_val(idx_ticker).strip()
        if not t: continue
        
        # Helper for float
        def to_float(val):
            if isinstance(val, str):
                is_pct = '%' in val
                val = val.replace('R$', '').replace(' ', '').replace('%', '')
                # Brazil format: 1.000,00 -> 1000.00
                val = val.replace('.', '').replace(',', '.')
            try:
                f = float(val)
                return f / 100.0 if 'is_pct' in locals() and is_pct else f
            except:
                return 0.0

        price_raw = get_val(idx_price)
        min_12m_raw = get_val(idx_min_12m)
        max_12m_raw = get_val(idx_max_12m)
        
        # Get volatile values with cache fallback
        min_val_raw = get_cached_value(t, 'min_val', get_val(idx_min_val))
        max_val_raw = get_cached_value(t, 'max_val', get_val(idx_max_val))
        falta_raw = get_cached_value(t, 'falta', get_val(idx_falta))
        vol_ano_raw = get_cached_value(t, 'vol_ano', get_val(get_col_index(["VOLATILIDADE", "VOL ANO"])))
        
        # Calculate Falta %
        # Sheet might have it as 0.09 or 9% or -0.09
        falta_val = to_float(falta_raw)
        falta_pct_val = falta_val * 100
        falta_pct_str = f"{falta_pct_val:.2f}%"
        
        stocks.append({
            "ticker": t,
            "company_name": get_val(get_col_index(["EMPRESA", "NOME"])), # Try find name
            "sector": get_val(get_col_index(["SETOR"])),
            "price": price_raw,
            "min_12m": min_12m_raw,
            "max_12m": max_12m_raw,
            "min_val": min_val_raw, # Custo Baixo
            "max_val": max_val_raw,
            "falta_pct": falta_pct_str,
            "falta_val": falta_pct_val, # Use percentage value relative to 100 (e.g. -9.0)
            "image_url": get_val(get_col_index(["LOGO", "IMAGEM"])),
            "dividend": get_val(get_col_index(["DIVIDEND", "DY"])),
            "payout": get_val(get_col_index(["PAYOUT"])),
            "change_day": get_val(get_col_index(["VARIAÇÃO", "CHANGE"])),
            "vol_ano": vol_ano_raw,
            "last_close": get_val(get_col_index(["ULTIMO FECHAMENTO", "FECHAMENTO ANTERIOR", "FECHAMENTO"])),
            "about": get_val(get_col_index(["SOBRE", "DESCRIÇÃO"]))
        })
        
    return stocks

# get_stock_history moved to below with yfinance implementation


@cached(ttl_seconds=300)
def get_options_data(ticker_filter=None):
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    RANGE_NAME = "Opcoes!A:AZ" 
    
    try:
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=RANGE_NAME).execute()
    except Exception as e:
        print(f"Error fetching options: {e}")
        return []

    values = result.get('values', [])
    if not values: return []
    
    headers = [h.strip().upper() for h in values[0]]
    
    def get_col_index(name_options):
        for name in name_options:
            name_upper = name.upper()
            for i, header in enumerate(headers):
                if name_upper in header: 
                    return i
        return -1

    # Mapping based on user provided image:
    # Updated to be case-insensitive and match likely header names in image
    idx_subjacente = get_col_index(["SUBJACENTE", "TICKER", "CODIGO", "subjacent", "AT. OBJ.", "PAPEL", "BASE"])
    idx_vencimento = get_col_index(["VENCIMENTO", "EXPIRATION", "vencimento"])
    idx_ativo = get_col_index(["ATIVO", "OPCAO", "OPTION", "ativo"])
    idx_tipo = get_col_index(["TIPO", "TYPE", "tipo"]) # CALL/PUT
    idx_strike = get_col_index(["STRIKE", "strike"])
    idx_preco = get_col_index(["PREÇO", "PRICE", "preco", "preço"])
    idx_negocios = get_col_index(["NEGOCIOS", "TRADES", "negocios"])
    idx_volume = get_col_index(["VOLUME", "volume"])
    idx_premio = get_col_index(["PREMIO", "PREMIUM", "premio", "prêmio"]) # Percentual
    idx_distancia = get_col_index(["DISTANCIA", "DISTANCE", "distancia", "distância"])

    options = []
    
    for row in values[1:]:
        def get_val_safe(r, i):
            if i == -1: return ""
            return r[i] if 0 <= i < len(r) else ""

        subjacente = ""
        if idx_subjacente != -1:
            subjacente = get_val_safe(row, idx_subjacente).strip()
            
        option_ticker = ""
        if idx_ativo != -1:
            option_ticker = get_val_safe(row, idx_ativo).strip()
        
        # Filter Logic: Match Underlying OR Option Ticker
        if ticker_filter:
            tf = ticker_filter.upper()
            if subjacente.upper() != tf and option_ticker.upper() != tf:
                continue

        # Formatter helpers
        def to_float(val):
            if isinstance(val, str):
                is_pct = '%' in val
                val = val.replace('.', '').replace(',', '.').replace('%', '')
            try:
                f = float(val)
                return f / 100.0 if 'is_pct' in locals() and is_pct else f
            except:
                return 0.0
                
        # Helper for internal use (redundant but keeps existing structure below)
        def get_val(idx):
            return get_val_safe(row, idx)

        # Premio is percentage. e.g. "0,1216" -> 12.16%
        premio_raw = get_val(idx_premio)
        premio_val = to_float(premio_raw)
        premio_pct = f"{premio_val * 100:.2f}%"

        dist_raw = get_val(idx_distancia)
        dist_val = to_float(dist_raw)
        dist_pct = f"{dist_val * 100:.2f}%"

        options.append({
            "ticker": option_ticker,
            "underlying": subjacente, # ADDED
            "expiration": get_val(idx_vencimento), 
            "type": get_val(idx_tipo),
            "strike": get_val(idx_strike),
            "price": get_val(idx_preco), 
            "price_val": to_float(get_val(idx_preco)), # Added Float version
            "trades": get_val(idx_negocios),
            "volume": get_val(idx_volume),
            "premium": premio_pct,
            "premium_val": premio_val, # Float for filtering
            "distance": dist_pct,
            "dist_val": dist_val # For UI logic
        })
        
    return options

@cached(ttl_seconds=300)
def get_filtered_opportunities():
    """
    Returns stocks that are 'Low Cost' opportunities.
    """
    from datetime import datetime
    import numpy as np

    try:
        stocks = get_sheet_data()
        all_options = get_options_data(None)
    except Exception as e:
        print(f"Error filtering opportunities: {e}")
        return []

    print(f"Filtering: {len(stocks) if stocks else 0} stocks, {len(all_options) if all_options else 0} options.")
    if not stocks: return []

    # Map Options by Underlying
    options_by_ticker = {}
    if all_options:
        for opt in all_options:
            unk = opt.get('underlying', '').strip().upper()
            if not unk: continue
            if unk not in options_by_ticker:
                options_by_ticker[unk] = []
            options_by_ticker[unk].append(opt)
    
    opportunities = []
    
    today_date = datetime.now().date()
    
    def get_business_days(expiry_str):
        try:
            if "/" in expiry_str:
                exp_date = datetime.strptime(expiry_str, "%d/%m/%Y").date()
            elif "-" in expiry_str:
                exp_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
            else:
                return 999
            
            if exp_date <= today_date:
                return 0
            
            try:
                return int(np.busday_count(today_date, exp_date))
            except:
                return (exp_date - today_date).days
        except:
            return 999

    filtered_results = []
    
    for stock in stocks:
        try:
            ticker = stock.get('ticker', 'UNKNOWN').strip().upper()
            falta_val = stock.get('falta_val', -999.0)
            
            # Category Logic
            is_cheap = falta_val >= -15.0
            is_expensive = falta_val <= -50.0

            if not is_cheap and not is_expensive:
                continue
                
            # Helper to parse price
            def parse_price(val):
                try:
                    if isinstance(val, (int, float)): return float(val)
                    if isinstance(val, str):
                        clean = val.replace('R$', '').replace(' ', '').replace('%', '')
                        if ',' in clean and '.' in clean:
                            clean = clean.replace('.', '').replace(',', '.')
                        else:
                            clean = clean.replace(',', '.')
                        return float(clean)
                    return 0.0
                except:
                    return 0.0

            stock_price = parse_price(stock.get('price', 0.0))
            cost_val = parse_price(stock.get('min_val', 0.0))
            max_val = parse_price(stock.get('max_val', 0.0))
            
            # --- FILTER FIX: Don't show stocks with invalid targets ---
            # If both Min and Max targets are missing/0, it's not a valid opportunity
            if cost_val <= 0 and max_val <= 0:
                continue

            # Check Options
            stock_opts = options_by_ticker.get(ticker, [])
            
            valid_puts = []
            valid_calls = []

            # Helper for strict float parsing inside loop
            def smart_float(v):
                if isinstance(v, (int, float)): return float(v)
                if isinstance(v, str):
                    clean = v.replace('R$', '').strip()
                    if ',' in clean and '.' in clean: 
                        clean = clean.replace('.', '').replace(',', '.')
                    else:
                        clean = clean.replace(',', '.')
                    return float(clean)
                return 0.0

            for opt in stock_opts:
                try:
                    otype = opt.get('type', '').upper()
                    strike = smart_float(opt.get('strike', 0))
                    prem_val = float(opt.get('premium_val', 0.0))
                    
                    if strike <= 0: continue
                    
                    exp = opt.get('expiration', '')
                    bdays = get_business_days(exp)
                    
                    # --- CHEAP (DISCOUNTED) STRATEGY ---
                    if is_cheap:
                        if 'PUT' in otype or 'VENDA' in otype:
                            limit_strike = 0.0
                            if cost_val > 0:
                                limit_strike = cost_val * 1.05
                                if strike > limit_strike: continue
                            else:
                                if strike > stock_price * 1.05: continue
 
                            if prem_val <= 0.01: continue
                            if bdays > 60: continue
                            
                            opt['yield_display'] = f"{prem_val*100:.2f}%"
                            opt['last_price'] = opt.get('price_val', 0.0)
                            valid_puts.append(opt)

                        elif 'CALL' in otype or 'COMPRA' in otype:
                            if prem_val > 0.02: continue
                            if bdays < 63: continue
                            
                            opt['cost_display'] = f"{prem_val*100:.2f}%"
                            opt['last_price'] = opt.get('price_val', 0.0)
                            valid_calls.append(opt)

                    # --- EXPENSIVE STRATEGY ---
                    elif is_expensive:
                        # Calls (Venda Coberta)
                        if 'CALL' in otype or 'VENDA' in otype:
                             if strike <= stock_price: continue
                             if max_val > 0 and strike <= max_val: continue
                             if prem_val <= 0.01: continue 

                             opt['yield_display'] = f"{prem_val*100:.2f}%"
                             opt['last_price'] = opt.get('price_val', 0.0)
                             valid_calls.append(opt)

                        # Puts (Compra a Seco)
                        elif 'PUT' in otype or 'COMPRA' in otype:
                             if bdays < 63: continue
                             # Premium <= 2% (User requested "no maximo 2%")
                             if prem_val > 0.02: continue
                             
                             # Strike Rule: Max 20% distance (Strike must be >= 80% of price)
                             if strike < stock_price * 0.80: continue

                             opt['cost_display'] = f"{prem_val*100:.2f}%"
                             opt['last_price'] = opt.get('price_val', 0.0)
                             valid_puts.append(opt)

                except Exception as loop_e:
                    continue

            # Add count to stock object and Filter
            if len(valid_puts) > 0 or len(valid_calls) > 0:
                stock_copy = stock.copy()
                stock_copy['puts_count'] = len(valid_puts)
                stock_copy['calls_count'] = len(valid_calls)
                stock_copy['max_val'] = max_val
                
                # Helper for distance
                dist = 0.0
                if cost_val > 0:
                     dist = falta_val / 100.0

                filtered_results.append({
                    "stock": stock_copy,
                    "options": {
                        "puts": valid_puts,
                        "calls": valid_calls
                    },
                    "category": "CHEAP" if is_cheap else "EXPENSIVE",
                    "distance_cost": dist
                })

        except Exception as e:
            print(f"Error processing stock {stock.get('ticker')}: {e}")
            continue

    # --- FIXED INCOME STRATEGY ---
    fixed_data = []
    try:
        raw_fixed = get_fixed_income_data()
        
        # 1. Reserva (Selic)
        reserva = next((x for x in raw_fixed if "SELIC" in x.get('titulo', '').upper()), None)
        
        # 2. Proteção (IPCA+ Curto/Médio) - First IPCA found
        protecao = next((x for x in raw_fixed if "IPCA" in x.get('titulo', '').upper() and "JUROS" not in x.get('titulo', '').upper()), None)
        
        # 3. Longo Prazo (Renda+ ou IPCA+ Longo)
        # Try Renda+ first
        longo = next((x for x in raw_fixed if "RENDA+" in x.get('titulo', '').upper()), None)
        # If no Renda+, try the last IPCA+ (assuming sorted by date usually, or just a different one)
        if not longo and protecao:
             # Find an IPCA+ that is NOT the protection one (preferably longer date)
             candidates = [x for x in raw_fixed if "IPCA" in x.get('titulo', '').upper() and x['titulo'] != protecao['titulo']]
             if candidates:
                 longo = candidates[-1] # Take the last one (often longer maturity)

        if reserva: 
            reserva['type_display'] = "Reserva de Emergência"
            fixed_data.append(reserva)
        if protecao: 
            protecao['type_display'] = "Proteção (Inflação)"
            fixed_data.append(protecao)
        if longo: 
            longo['type_display'] = "Longo Prazo"
            fixed_data.append(longo)

        # 4. Melhor Pré-Fixado (Highest Rate)
        pref = [x for x in raw_fixed if "PREFIXADO" in x.get('titulo', '').upper() and "JUROS" not in x.get('titulo', '').upper()]
        if pref:
            # Sort by rate (parse "10,50%" -> 10.50)
            def parse_rate(r):
                try:
                    return float(r.replace('%','').replace(',','.'))
                except: return 0.0
            
            best_pref = sorted(pref, key=lambda x: parse_rate(x.get('taxa_compra', '0')), reverse=True)[0]
            best_pref['type_display'] = "Melhor Pré-Fixado"
            fixed_data.append(best_pref)
            
    except Exception as e:
        print(f"Error filtering fixed income: {e}")

    # --- GUARANTEE (LFTS11) ---
    guarantee_data = []
    try:
        from services.market_data import get_treasury_etfs
        etfs = get_treasury_etfs()
        # Find LFTS11
        lfts = next((x for x in etfs if 'LFTS11' in x.get('titulo', '').upper()), None)
        if lfts:
            guarantee_data.append(lfts)
    except Exception as e:
        print(f"Error fetching guarantee etf: {e}")

    # Split lists
    return {
        "cheap": [x for x in filtered_results if x['category'] == 'CHEAP'],
        "expensive": [x for x in filtered_results if x['category'] == 'EXPENSIVE'],
        "fixed_income": fixed_data,
        "guarantee": guarantee_data
    }

@cached(ttl_seconds=1800)
def get_stock_history(ticker_filter=None):
    if not ticker_filter: return []
    
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    
    range_name = "COTAÇÕES!A:C" # We only need A, B, C (Ticker, Data, Cotacao)
    
    try:
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=range_name).execute()
        values = result.get('values', [])
    except Exception as e:
        print(f"Error fetching history from sheet: {e}")
        return []

    if not values: return []
    
    headers = [h.strip().upper() for h in values[0]]
    
    idx_ticker = -1
    idx_date = -1
    idx_close = -1
    
    for i, h in enumerate(headers):
        if "TICKER" in h: idx_ticker = i
        if "DATA" in h: idx_date = i
        if "COTAÇÃO" in h or "PRICE" in h: idx_close = i
        
    if idx_ticker == -1 or idx_close == -1:
        # Fallback hardcoded indices if headers are standard but not matched 
        if len(headers) >= 3:
             idx_ticker = 0
             idx_date = 1
             idx_close = 2
        else:
             return []
        
    data = []
    target_ticker = ticker_filter.upper().replace(".SA", "")
    
    for row in values[1:]:
        if len(row) <= idx_close: continue
        
        t = row[idx_ticker].strip().upper() if len(row) > idx_ticker else ""
        if t != target_ticker: continue
        
        date_raw = row[idx_date] if idx_date != -1 and len(row) > idx_date else ""
        close_raw = row[idx_close]
        
        # Parse Date: 01/06/2023 -> 2023-06-01
        formatted_date = date_raw
        if "/" in date_raw:
            try:
                parts = date_raw.split("/")
                if len(parts) == 3:
                    # YYYY-MM-DD
                    formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
            except: pass
            
        def parse_float(v):
            if isinstance(v, str):
                return float(v.replace('R$', '').replace('.', '').replace(',', '.'))
            return float(v)
            
        try:
            val = parse_float(close_raw)
            data.append({
                "date": formatted_date,
                "price": val
            })
        except:
            continue
            
    data.sort(key=lambda x: x['date'])
    return data

@cached(ttl_seconds=1800)
def get_fundamentals_data(ticker_filter=None):
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    range_name = "LUCRO!A:Z"
    
    try:
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=range_name).execute()
        values = result.get('values', [])
    except Exception as e:
        print(f"Error fetching fundamentals: {e}")
        return []
    
    if not values: return []
    
    headers = [h.strip().upper() for h in values[0]]
    
    idx_ticker = -1
    idx_date = -1
    idx_lucro = -1
    idx_pat = -1
    idx_roe = -1
    
    for i, h in enumerate(headers):
        if "TICKER" in h: idx_ticker = i
        if "DATA" in h: idx_date = i
        
        # Stricter matching for data columns to avoid "TEND" (Trend) columns
        if "LUCRO" in h and "TEND" not in h: idx_lucro = i
        if ("PATRIMONIO" in h or "PATRIMÔNIO" in h or "PL" in h) and "TEND" not in h: idx_pat = i
        if "ROE" in h and "TEND" not in h: idx_roe = i
        
        # If we find exact matches, they take precedence (optional refinement could be added here)
        if h == "LUCRO": idx_lucro = i
        if h == "PATRIMONIO" or h == "PL": idx_pat = i
        if h == "ROE": idx_roe = i
        
    fundamentals = []
    target_ticker = ticker_filter.upper().replace(".SA", "") if ticker_filter else None
    
    for row in values[1:]:
        if len(row) <= idx_ticker: continue
        t = str(row[idx_ticker]).strip().upper()
        if not t: continue
        if target_ticker and t != target_ticker: continue
        
        d = row[idx_date] if idx_date != -1 and len(row) > idx_date else ""
        
        # Format Date
        formatted_date = d
        if "/" in d:
             try:
                parts = d.split("/")
                if len(parts) == 3:
                     formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
             except: pass
        
        def parse(v):
            if not v: return 0.0
            if isinstance(v, str): return float(v.replace('R$', '').replace(' ', '').replace('.','').replace(',','.'))
            return float(v)
            
        lucro = parse(row[idx_lucro]) if idx_lucro != -1 and len(row) > idx_lucro else 0.0
        pat = parse(row[idx_pat]) if idx_pat != -1 and len(row) > idx_pat else 0.0
        roe_val = parse(row[idx_roe]) if idx_roe != -1 and len(row) > idx_roe else 0.0
        
        # Calculate ROE if missing or 0, and we have data
        if roe_val == 0 and pat != 0:
             roe_val = (lucro / pat) * 100
        
        fundamentals.append({
            "ticker": t,
            "date": formatted_date,
            "lucro": lucro,
            "patrimonio": pat,
            "roe": roe_val
        })
        
    # Sort
    fundamentals.sort(key=lambda x: x['date'])
    return fundamentals


@cached(ttl_seconds=600)
def get_fixed_income_data():
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    ranges_to_try = ["TD_Diario!A:Z", "TD Tesouro!A:Z", "TD!A:Z"]
    values = []
    for rng in ranges_to_try:
        try:
             res = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=rng).execute()
             v = res.get('values', [])
             if v:
                 values = v
                 break
        except: continue
        
    if not values: return []
    
    headers = [h.strip().upper() for h in values[0]]
    def get_col_index(name_options):
        for name in name_options:
            name_upper = name.upper()
            for i, header in enumerate(headers):
                if name_upper in header: 
                    return i
        return -1
        
    idx_titulo = get_col_index(["TITULO", "NOME", "TÍTULO"])
    if idx_titulo == -1: idx_titulo = 0
    idx_taxa_compra = get_col_index(["TAXA_COMPRA", "TAXA COMPRA", "RENTABILIDADE"])
    idx_min_inv = get_col_index(["MIN_INVESTIMENTO", "INVESTIMENTO MINIMO", "MÍNIMO"])
    idx_vencimento = get_col_index(["VENCIMENTO", "VENC.", "DATA VENCIMENTO", "MATURITY"])

    data = []
    for row in values[1:]:
        if len(row) <= idx_titulo: continue
        titulo = row[idx_titulo]
        if not titulo: continue
        
        tc = row[idx_taxa_compra] if idx_taxa_compra != -1 and idx_taxa_compra < len(row) else ""
        mi = row[idx_min_inv] if idx_min_inv != -1 and idx_min_inv < len(row) else ""
        venc = row[idx_vencimento] if idx_vencimento != -1 and idx_vencimento < len(row) else ""
        
        category = "Outros"
        ti_upper = titulo.upper()
        
        if "SELIC" in ti_upper:
            category = "Reserva de Emergência"
        elif "IPCA" in ti_upper:
            category = "Proteção contra Inflação"
        elif "PREFIXADO" in ti_upper:
            category = "Pré-fixados"
        elif "RENDA+" in ti_upper or "EDUCA+" in ti_upper:
            category = "Longo Prazo / Aposentadoria"
        
        data.append({
            "titulo": titulo,
            "taxa_compra": tc,
            "min_investimento": mi,
            "vencimento": venc,
            "category": category
        })
    return data

def debug_pomo_data_safe():
    try:
        creds = get_credentials()
        service = build('sheets', 'v4', credentials=creds)
        SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
        
        # List all sheets
        sheet_metadata = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
        sheets = sheet_metadata.get('sheets', '')
        sheet_names = [s['properties']['title'] for s in sheets]
        
        # Inspect LUCRO headers
        RANGE_LUCRO = "LUCRO!1:1"
        res_lucro = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE_LUCRO).execute()
        headers_lucro = res_lucro.get('values', [])[0] if res_lucro.get('values') else []
        
        return {
            "all_sheet_names": sheet_names,
            "lucro_headers": headers_lucro
        }
    except Exception as e:
        return {"error": str(e)}

# Alias for backward compatibility
get_history_data = get_stock_history

def get_users():
    """
    Fetches allowed users from the 'User' tab.
    Returns a list of dicts: {'name': ..., 'email': ..., 'photo': ..., 'row': ...}
    """
    creds = get_credentials()
    if not creds: return []
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    RANGE_NAME = "User!A:C" # A=Name, B=Email, C=Photo
    
    try:
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID,
                                    range=RANGE_NAME).execute()
        values = result.get('values', [])
    except Exception as e:
        print(f"Error fetching users: {e}")
        return []

    if not values: return []
    
    headers = [h.strip().upper() for h in values[0]]
    idx_name = 0
    idx_email = 1
    idx_photo = 2
    
    # Try dynamic find
    for i, h in enumerate(headers):
        if "NOME" in h: idx_name = i
        if "E-MAIL" in h or "EMAIL" in h: idx_email = i
        if "FOTO" in h or "PHOTO" in h: idx_photo = i
        
    users = []
    # Start from row 2 (index 1), so row number in sheet is i + 2
    for i, row in enumerate(values[1:]): 
        if len(row) <= idx_email: continue # No Email
        
        email = row[idx_email].strip()
        if not email: continue
        
        name = row[idx_name].strip() if len(row) > idx_name else ""
        photo = row[idx_photo].strip() if len(row) > idx_photo else ""
        
        users.append({
            "name": name,
            "email": email,
            "photo": photo,
            "row_number": i + 2 # 1-based index for API
        })
        
    return users

def check_user_allowed(email):
    """
    Checks if email exists in User sheet. Returns user dict or None.
    """
    users = get_users()
    email_clean = email.strip().lower()
    
    for u in users:
        if u['email'].strip().lower() == email_clean:
            return u
    return None

def update_user_profile(email, new_name=None, new_photo=None):
    """
    Updates Name and/or Photo for a specific email.
    """
    user = check_user_allowed(email)
    if not user:
        return {"error": "User not found"}
        
    row_num = user['row_number']
    
    creds = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    
    # We assume Column A is Name, Column C is Photo based on get_users default logic
    # Or strict ranges: User!A{row} and User!C{row}
    
    try:
        if new_name is not None:
             range_name = f"User!A{row_num}"
             body = {'values': [[new_name]]}
             service.spreadsheets().values().update(
                 spreadsheetId=SPREADSHEET_ID, range=range_name,
                 valueInputOption="RAW", body=body).execute()
                 
        if new_photo is not None:
             range_name = f"User!C{row_num}"
             body = {'values': [[new_photo]]}
             service.spreadsheets().values().update(
                 spreadsheetId=SPREADSHEET_ID, range=range_name,
                 valueInputOption="RAW", body=body).execute()
                 
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

