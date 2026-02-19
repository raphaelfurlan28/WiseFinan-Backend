import os
import json
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.transport.requests import Request
from services.cache import cached, get_cached_value
from services.indices import get_economic_indices
import numpy as np
from scipy.stats import norm
HAS_BS_LIBS = True
import math


# ==============================================================================
# CONFIGURAÇÃO DE ACESSOS (ADMIN)
# ==============================================================================
# ATENÇÃO: Adicione ou remova e-mails desta lista para controlar o acesso de Administrador.
# O login é gerenciado pelo Firebase, aqui controlamos apenas a permissão de Admin no Backend.
ADMIN_EMAILS = [
    'raphaelfurlan28@gmail.com',  # Admin Principal
    'raphaelfurlan28@hotmail.com'       # Admin Secundário
]
# ==============================================================================

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
            print("Attempting to load credentials from GOOGLE_CREDENTIALS_JSON env var...")
            info = json.loads(os.environ.get('GOOGLE_CREDENTIALS_JSON'))
            return Credentials.from_service_account_info(info, scopes=scopes)
        except json.JSONDecodeError as e:
            print(f"Error decoding GOOGLE_CREDENTIALS_JSON: {e}")
        except Exception as e:
            print(f"Unexpected error loading credentials from env var: {e}")
    
    # Option 2: Local File Search
    backend_creds = os.path.abspath(os.path.join(current_dir, '../service_account.json'))
    paths = [
        SERVICE_ACCOUNT_FILE, # Defined globally as ../../ (Root)
        backend_creds,        # backend/service_account.json
        'service_account.json' # CWD
    ]
    
    print(f"Searching for credentials in local paths: {paths}")
    for path in paths:
        if os.path.exists(path):
            try:
                print(f"Loading credentials from: {path}")
                return Credentials.from_service_account_file(path, scopes=scopes)
            except Exception as e:
                print(f"Error loading credentials from {path}: {e}")
    
    # Fallback/Error
    print(f"CRITICAL: No Google Credentials found. Please ensure GOOGLE_CREDENTIALS_JSON or a service_account.json file exists.")
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
        # 1. Try exact match first (case-insensitive)
        for name in name_options:
            name_upper = name.upper()
            for i, header in enumerate(headers):
                if name_upper == header: 
                    return i
        # 2. Try substring match as fallback
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
    
    # Growth Columns (CAGR)
    idx_cagr_luc = get_col_index(["CAGR/LUC", "CAGR LUCRO", "CAGR LUC"])
    idx_cagr_pat = get_col_index(["CAGR/PAT", "CAGR PATRIMONIO", "CAGR PAT"])
    idx_cagr_roe = get_col_index(["CAGR/ROE", "CAGR ROE"])

    # Variation Columns
    idx_var_12m = get_col_index(["VAR(12M)", "VAR 12M", "VARIAÇÃO 12M"])
    idx_var_1m = get_col_index(["VAR(1M)", "VAR 1M", "VARIAÇÃO MÊS", "VARIAÇÃO 1M"])

    # Debt Columns
    idx_div_ebit = get_col_index(["DIV/EBIT", "DIVIDA/EBIT", "DIVIDA LIQUIDA / EBIT"])
    idx_div_pl = get_col_index(["DIV/PL", "DIVIDA/PL", "DIVIDA LIQUIDA / PL"])

    # Profitability Columns
    idx_roe = get_col_index(["ROE"])
    idx_roa = get_col_index(["ROA"])
    idx_roic = get_col_index(["ROIC"])

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
            "change_day": get_cached_value(t, 'variation', get_val(get_col_index(["VARIAÇÃO DIA", "VARIAÇÃO DO DIA", "VARIAÇÃO", "CHANGE"]))),
            "vol_ano": vol_ano_raw,
            "last_close": get_val(get_col_index(["ULTIMO FECHAMENTO", "FECHAMENTO ANTERIOR", "FECHAMENTO"])),
            "about": get_val(get_col_index(["SOBRE", "DESCRIÇÃO"])),
            "cagr_luc": get_val(idx_cagr_luc),
            "cagr_pat": get_val(idx_cagr_pat),
            "cagr_roe": get_val(idx_cagr_roe),
            "var_12m": get_val(idx_var_12m),
            "var_1m": get_val(idx_var_1m),
            "div_ebit": get_val(idx_div_ebit),
            "div_pl": get_val(idx_div_pl),
            "roe_val": get_val(idx_roe),
            "roa_val": get_val(idx_roa),
            "roic_val": get_val(idx_roic)
        })
        
    return stocks

# get_stock_history moved to below with yfinance implementation


@cached(ttl_seconds=300)
def _fetch_all_raw_options():
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

def get_options_data(ticker_filter=None):
    """
    Returns options list.
    Uses cached _fetch_all_raw_options to avoid re-parsing huge sheet.
    """
    all_options = _fetch_all_raw_options()
    
    if not ticker_filter:
        return all_options
        
    tf = ticker_filter.upper()
    filtered = []
    
    # Pre-fetch data for Greeks if we have a filter
    stock_ref = None
    r = 0.1075 # Default Risk Free
    
    try:
        # Get Stock Data
        stocks = get_sheet_data()
        stock_ref = next((s for s in stocks if s['ticker'] == tf), None)
        
        # Get Risk Free Rate
        indices = get_economic_indices()
        selic_str = indices.get('selic', '10.75').replace('%', '').replace(',', '.')
        r = float(selic_str) / 100.0
    except:
        pass

    for opt in all_options:
        # Check Ticker or Underlying matches
        if opt['underlying'].upper() == tf or opt['ticker'].upper() == tf:
            # Clone dict to avoid mutating cache if we modify it (though cache returns list of dicts, best to be safe)
            # Actually _fetch_all_raw_options returns list of dicts. Modifying them modifies cache? 
            # Yes, if we don't copy.
            opt_copy = opt.copy()
            
            # Add Greeks if we have stock data
            if stock_ref and HAS_BS_LIBS:
                try:
                    stock_price = parse_price(stock_ref.get('price', 0.0))
                    strike = smart_float(opt_copy.get('strike', 0))
                    
                    # Volatility
                    vol_str = str(stock_ref.get('vol_ano', '0')).replace('%', '').replace(',', '.')
                    try:
                       sigma = float(vol_str) / 100.0
                       if sigma <= 0: sigma = 0.40
                    except:
                       sigma = 0.40
                       
                    exp = opt_copy.get('expiration', '')
                    bdays = get_business_days(exp)
                    
                    if bdays > 0 and stock_price > 0 and strike > 0:
                        T = bdays / 252.0
                        bs_type = 'call' if 'CALL' in opt_copy.get('type', '').upper() else 'put'
                        
                        delta = calculate_delta(stock_price, strike, T, r, sigma, bs_type)
                        bs_price = black_scholes_price(stock_price, strike, T, r, sigma, bs_type)
                        
                        # Prob Success (Approx)
                        prob_success = abs(delta) # Standard approximation
                        
                        # Edge
                        market_price = opt_copy.get('price_val', 0.0)
                        edge_pct = 0.0
                        if bs_price > 0:
                            edge_pct = ((market_price - bs_price) / bs_price) * 100
                            
                        opt_copy['delta_val'] = f"{delta:.3f}"
                        opt_copy['bs_price_val'] = f"R$ {bs_price:.2f}"
                        opt_copy['prob_success'] = f"{prob_success*100:.1f}%"
                        opt_copy['edge_formatted'] = f"{edge_pct:.1f}%"
                        opt_copy['sigma'] = f"{sigma*100:.1f}%"
                except:
                    pass
            
            filtered.append(opt_copy)
            
    return filtered

# Helpers
def smart_float(v):
    if isinstance(v, (int, float)): return float(v)
    if isinstance(v, str):
        clean = v.replace('R$', '').replace(' ', '').replace('%', '').strip()
        if ',' in clean and '.' in clean: 
            clean = clean.replace('.', '').replace(',', '.')
        else:
            clean = clean.replace(',', '.')
        try:
            return float(clean)
        except:
            return 0.0
    return 0.0

def parse_price(val):
    return smart_float(val)

def get_business_days(expiry_str):
    from datetime import datetime
    import numpy as np
    today_date = datetime.now().date()
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

def calculate_d1_d2(S, K, T, r, sigma):
    """
    Calculates d1 and d2 for Black-Scholes.
    S: Spot Price
    K: Strike Price
    T: Time to Maturity (in years)
    r: Risk-free rate (annual)
    sigma: Volatility (annual)
    """
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return 0, 0
    
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return d1, d2

def black_scholes_price(S, K, T, r, sigma, option_type='call'):
    """
    Calculates theoretical price using Black-Scholes.
    option_type: 'call' or 'put'
    """
    if T <= 0:
        return max(0, S - K) if option_type == 'call' else max(0, K - S)
    
    d1, d2 = calculate_d1_d2(S, K, T, r, sigma)
    
    if option_type == 'call':
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        
    return price

def calculate_delta(S, K, T, r, sigma, option_type='call'):
    """
    Calculates Delta.
    """
    if T <= 0 or sigma <= 0:
        return 0.0
        
    d1, _ = calculate_d1_d2(S, K, T, r, sigma)
    
    if option_type == 'call':
        return norm.cdf(d1)
    else:
        return norm.cdf(d1) - 1.0


@cached(ttl_seconds=300)
def get_filtered_opportunities():
    """
    Returns stocks that are 'Low Cost' opportunities.
    Optimized: Fetches data sources in PARALLEL.
    """
    from datetime import datetime
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor

    # Helper functions for parallel execution
    def fetch_stocks_data():
        try:
            return get_sheet_data()
        except Exception as e:
            print(f"Error fetching stocks in parallel: {e}")
            return []

    def fetch_all_options():
        try:
            return get_options_data(None)
        except Exception as e:
            print(f"Error fetching options in parallel: {e}")
            return []

    def fetch_indices_data():
        try:
            return get_economic_indices()
        except Exception as e:
            print(f"Error fetching indices in parallel: {e}")
            return {}

    def fetch_fixed_income():
        try:
            return get_fixed_income_data()
        except Exception as e:
            print(f"Error fetching fixed income in parallel: {e}")
            return []

    def fetch_guarantee_etfs():
        try:
            from services.market_data import get_treasury_etfs
            return get_treasury_etfs()
        except Exception as e:
            print(f"Error fetching ETFs in parallel: {e}")
            return []

    # --- PARALLEL FETCHING ---
    stocks = []
    all_options = []
    indices = {}
    raw_fixed = []
    etfs = []

    print("[OPPORTUNITIES] Starting parallel fetch...")
    start_time = datetime.now()

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_stocks = executor.submit(fetch_stocks_data)
        future_options = executor.submit(fetch_all_options)
        future_indices = executor.submit(fetch_indices_data)
        future_fixed = executor.submit(fetch_fixed_income)
        future_etfs = executor.submit(fetch_guarantee_etfs)

        stocks = future_stocks.result()
        all_options = future_options.result()
        indices = future_indices.result()
        raw_fixed = future_fixed.result()
        etfs = future_etfs.result()

    end_time = datetime.now()
    print(f"[OPPORTUNITIES] Parallel fetch done in {(end_time - start_time).total_seconds():.2f}s")
    
    # --- PROCESSING (CPU Bound) ---
    try:
        # Get Risk-Free Rate (Selic)
        selic_str = indices.get('selic', '10.75').replace('%', '').replace(',', '.')
        try:
            r = float(selic_str) / 100.0
        except:
            r = 0.1075 # Fallback
            
    except Exception as e:
        print(f"Error filtering opportunities: {e}")
        return []

    print(f"Filtering: {len(stocks) if stocks else 0} stocks, {len(all_options) if all_options else 0} options. Risk-Free Rate: {r}")
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
    filtered_results = []
    
    # Process Filter Logic
    for stock in stocks:
        try:
            ticker = stock.get('ticker', 'UNKNOWN').strip().upper()
            falta_val = stock.get('falta_val', -999.0)
            
            # Category Logic
            is_cheap = falta_val >= -15.0
            is_expensive = falta_val <= -50.0

            if not is_cheap and not is_expensive:
                continue
                
            stock_price = parse_price(stock.get('price', 0.0))
            cost_val = parse_price(stock.get('min_val', 0.0))
            max_val = parse_price(stock.get('max_val', 0.0))
            
            # Get Historical Volatility from Stock Data
            vol_str = str(stock.get('vol_ano', '0')).replace('%', '').replace(',', '.')
            try:
               sigma = float(vol_str) / 100.0
               if sigma <= 0: sigma = 0.40 # Default to 40% if missing
            except:
               sigma = 0.40

            # --- FILTER FIX: Don't show stocks with invalid targets ---
            if cost_val <= 0 and max_val <= 0:
                continue

            # Check Options
            stock_opts = options_by_ticker.get(ticker, [])
            
            valid_puts = []
            valid_calls = []

            for opt in stock_opts:
                try:
                    # COPY TO AVOID MODIFYING CACHED OBJECTS
                    opt = opt.copy()
                    
                    otype = opt.get('type', '').upper()
                    strike = smart_float(opt.get('strike', 0))
                    # prem_val IS THE YIELD (Premium / Stock Price), e.g. 0.01 = 1%
                    prem_yield = float(opt.get('premium_val', 0.0)) 
                    # market_price IS THE ACTUAL OPTION PRICE (R$)
                    market_price = float(opt.get('price_val', 0.0))

                    if strike <= 0: continue
                    
                    exp = opt.get('expiration', '')
                    bdays = get_business_days(exp)
                    
                    # Calculate T (Years)
                    if bdays <= 0: continue
                    T = bdays / 252.0
                    
                    # Black-Scholes Calculation
                    bs_price = 0.0
                    delta = 0.0
                    
                    if HAS_BS_LIBS:
                        is_call_opt = 'CALL' in otype or 'COMPRA' in otype
                        bs_type = 'call' if 'CALL' in otype else 'put'
                        
                        try:
                            bs_price = black_scholes_price(stock_price, strike, T, r, sigma, bs_type)
                            delta = calculate_delta(stock_price, strike, T, r, sigma, bs_type)
                        except Exception as bs_e:
                            print(f"BS Error: {bs_e}")
                            bs_price = 0.0
                            delta = 0.0
                    
                    # Probability of Success (ITM/OTM probability roughly)
                    # For Sellers: 1 - |Delta| (Probability of expiring OTM)
                    # For Buyers: |Delta| (Probability of expiring ITM)
                    prob_success = 0.0
                    
                    # Edge (Vantagem): (Market - BS) / BS
                    # Positive Edge => Expensive Option (Good to Sell)
                    # Negative Edge => Cheap Option (Good to Buy)
                    edge_pct = 0.0
                    if bs_price > 0:
                        edge_pct = ((market_price - bs_price) / bs_price)
                    
                    # Store Metrics
                    opt['delta'] = delta
                    opt['bs_price'] = bs_price
                    if HAS_BS_LIBS:
                        opt['edge_formatted'] = f"{edge_pct*100:.1f}%"
                    else:
                        opt['edge_formatted'] = None
                    
                    # --- FILTERS ---

                    # --- CHEAP (DISCOUNTED) STRATEGY ---
                    if is_cheap:
                        if 'PUT' in otype or 'VENDA' in otype: # PUT SALE (Income)
                            # Logic: Premium > 1%, Exp <= 40bd, Strike <= LowCost * 1.08
                            if prem_yield <= 0.01: continue
                            if bdays > 40: continue
                            if strike > cost_val * 1.08: continue

                            if HAS_BS_LIBS:
                                prob_success = 1 - abs(delta)
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            opt['yield_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            # --- ADDED GREEKS FOR UI ---
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                            
                            # Edge Calculation
                            edge_pct = 0.0
                            if bs_price > 0:
                                edge_pct = ((market_price - bs_price) / bs_price) * 100
                            opt['edge_formatted'] = f"{edge_pct:.1f}%"
                            
                            valid_puts.append(opt)

                        elif 'CALL' in otype or 'COMPRA' in otype: # CALL BUY (Upside)
                            # Logic: Premium <= 2%, Exp > 60bd, Strike > Price * 1.10
                            if prem_yield > 0.02: continue
                            if bdays <= 60: continue
                            if strike <= stock_price * 1.10: continue

                            if HAS_BS_LIBS:
                                prob_success = abs(delta)
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            opt['cost_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            # --- ADDED GREEKS FOR UI ---
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"

                            # Edge Calculation
                            edge_pct = 0.0
                            if bs_price > 0:
                                edge_pct = ((market_price - bs_price) / bs_price) * 100
                            opt['edge_formatted'] = f"{edge_pct:.1f}%"

                            valid_calls.append(opt)

                    # --- EXPENSIVE STRATEGY ---
                    elif is_expensive:
                        # Calls (Venda Coberta)
                        if 'CALL' in otype or 'VENDA' in otype:
                             # Logic: Premium > 1%, Exp <= 40bd, Strike > HighCost AND > Price
                             if prem_yield <= 0.01: continue
                             if bdays > 40: continue
                             if strike <= max_val or strike <= stock_price: continue

                             if HAS_BS_LIBS:
                                 prob_success = 1 - abs(delta)
                                 opt['prob_success'] = f"{prob_success*100:.1f}%"
                             opt['yield_display'] = f"{prem_yield*100:.2f}%"
                             opt['last_price'] = market_price
                             # --- ADDED GREEKS FOR UI ---
                             opt['sigma'] = f"{sigma*100:.1f}%"
                             opt['delta_val'] = f"{delta:.3f}"
                             opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                             
                             # Edge Calculation
                             edge_pct = 0.0
                             if bs_price > 0:
                                 edge_pct = ((market_price - bs_price) / bs_price) * 100
                             opt['edge_formatted'] = f"{edge_pct:.1f}%"
                             
                             valid_calls.append(opt)

                        # Puts (Compra a Seco)
                        elif 'PUT' in otype or 'COMPRA' in otype:
                             # Logic: Premium <= 2%, Exp > 60bd, Strike < Price * 0.90
                             if prem_yield > 0.02: continue
                             if bdays <= 60: continue
                             if strike >= stock_price * 0.90: continue

                             if HAS_BS_LIBS:
                                 prob_success = abs(delta)
                                 opt['prob_success'] = f"{prob_success*100:.1f}%"
                             opt['cost_display'] = f"{prem_yield*100:.2f}%"
                             opt['last_price'] = market_price
                             # --- ADDED GREEKS FOR UI ---
                             opt['sigma'] = f"{sigma*100:.1f}%"
                             opt['delta_val'] = f"{delta:.3f}"
                             opt['bs_price_val'] = f"R$ {bs_price:.2f}"

                             # Edge Calculation
                             edge_pct = 0.0
                             if bs_price > 0:
                                 edge_pct = ((market_price - bs_price) / bs_price) * 100
                             opt['edge_formatted'] = f"{edge_pct:.1f}%"

                             valid_puts.append(opt)

                except Exception as loop_e:
                    # print(f"Loop error: {loop_e}")
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

    # --- FIXED INCOME PROCESSING ---
    fixed_data = []
    try:
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

    # --- GUARANTEE (LFTS11) PROCESSING ---
    guarantee_data = []
    try:
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

@cached(ttl_seconds=300)
def get_pozinho_options():
    """
    Returns options priced <= 0.05 (Calls and Puts) grouped by Ticker.
    Calculates Greeks and Probabilities.
    """
    from datetime import datetime
    import numpy as np
    from concurrent.futures import ThreadPoolExecutor

    # Helper functions for parallel execution (reused)
    def fetch_stocks_data():
        try:
            return get_sheet_data()
        except: return []

    def fetch_all_options():
        try:
            return get_options_data(None)
        except: return []
        
    def fetch_indices_data():
        try:
            return get_economic_indices()
        except: return {}

    print("[POZINHO] Starting parallel fetch...")
    start_time = datetime.now()

    stocks = []
    all_options = []
    indices = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_stocks = executor.submit(fetch_stocks_data)
        future_options = executor.submit(fetch_all_options)
        future_indices = executor.submit(fetch_indices_data)

        stocks = future_stocks.result()
        all_options = future_options.result()
        indices = future_indices.result()

    end_time = datetime.now()
    print(f"[POZINHO] Parallel fetch done in {(end_time - start_time).total_seconds():.2f}s")

    if not stocks or not all_options: return {}

    # Map Stocks for price reference
    stocks_map = {s['ticker']: s for s in stocks}

    # Get Risk-Free Rate
    try:
        selic_str = indices.get('selic', '10.75').replace('%', '').replace(',', '.')
        r = float(selic_str) / 100.0
    except:
        r = 0.1075

    pozinho_groups = {}
    
    for opt in all_options:
        try:
            # COPY TO AVOID MUTATION ISSUES
            opt = opt.copy()
            
            price_val = float(opt.get('price_val', 0.0))
            
            # Filter: Price <= 0.05
            if price_val > 0.05: continue
            
            # Get Underlying Stock Data
            ticker = opt.get('ticker', '')
            underlying = opt.get('underlying', '')
            
            # Identify parent stock
            parent_stock = None
            if underlying and underlying in stocks_map:
                parent_stock = stocks_map[underlying]
            elif ticker[:4] in stocks_map: # Try prefix
                 parent_stock = stocks_map[ticker[:4]]
            
            if not parent_stock: continue # Skip if we don't know the stock
            
            stock_price = parse_price(parent_stock.get('price', 0.0))
            strike = smart_float(opt.get('strike', 0))
            
            if stock_price <= 0 or strike <= 0: continue

            # Get Volatility
            vol_str = str(parent_stock.get('vol_ano', '0')).replace('%', '').replace(',', '.')
            try:
               sigma = float(vol_str) / 100.0
               if sigma <= 0: sigma = 0.40
            except:
               sigma = 0.40

            # Calculate Greeks
            exp = opt.get('expiration', '')
            bdays = get_business_days(exp)
            if bdays <= 0: continue
            
            T = bdays / 252.0
            bs_type = 'call' if 'CALL' in opt.get('type', '').upper() else 'put'
            
            delta = 0.0
            bs_price = 0.0
            
            if HAS_BS_LIBS:
                try:
                    delta = calculate_delta(stock_price, strike, T, r, sigma, bs_type)
                    bs_price = black_scholes_price(stock_price, strike, T, r, sigma, bs_type)
                except:
                    pass
            
            # Filter: Delta > 0.01 (Avoid impossible options)
            if abs(delta) < 0.01: continue
            
            # Calculate Probabilities & Edge
            prob_success = 0.0
            if HAS_BS_LIBS:
                 # For Buy Strategy: Prob ITM = |Delta| roughly
                 prob_success = abs(delta)
            
            edge_pct = 0.0
            if bs_price > 0:
                edge_pct = ((price_val - bs_price) / bs_price) * 100
            
            # Add Metrics to Option
            opt['delta_val'] = f"{delta:.3f}"
            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
            opt['prob_success'] = f"{prob_success*100:.1f}%"
            opt['edge_formatted'] = f"{edge_pct:.1f}%"
            opt['sigma'] = f"{sigma*100:.1f}%"
            
            # Grouping
            group_key = parent_stock['ticker']
            if group_key not in pozinho_groups:
                pozinho_groups[group_key] = {
                    "stock": parent_stock,
                    "options": []
                }
            
            pozinho_groups[group_key]['options'].append(opt)

        except Exception as e:
            continue

    # Convert to list and sort by number of options
    result_list = []
    for k, v in pozinho_groups.items():
        # Sort options by Strike
        v['options'].sort(key=lambda x: smart_float(x.get('strike', 0)))
        result_list.append(v)
        
    # Sort groups by ticker
    result_list.sort(key=lambda x: x['stock']['ticker'])
    
    print(f"[POZINHO] Found {len(result_list)} companies with valid options.")
    return result_list

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
            try:
                if isinstance(v, str):
                    is_pct = '%' in v
                    # Remove currency, spaces, normalize decimal
                    val = v.replace('R$', '').replace(' ', '').replace('%', '')
                    # Brazil format: 1.000,00 -> 1000.00
                    val = val.replace('.', '').replace(',', '.')
                    f = float(val)
                    return f / 100.0 if is_pct else f
                return float(v)
            except:
                return 0.0
            
        lucro = parse(row[idx_lucro]) if idx_lucro != -1 and len(row) > idx_lucro else 0.0
        pat = parse(row[idx_pat]) if idx_pat != -1 and len(row) > idx_pat else 0.0
        roe_val = parse(row[idx_roe]) if idx_roe != -1 and len(row) > idx_roe else 0.0
        
        # Calculate ROE if missing or 0, and we have data
        if roe_val == 0 and pat != 0:
             roe_val = lucro / pat
        
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
    return []
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
    Verifica se o usuário tem permissão de acesso.
    Como o login é via Firebase, aqui validamos se é um Admin ou usuário comum.
    """
    try:
        user_email = email.lower().strip()
        
        # Verifica se está na lista de Admins definida no topo do arquivo
        is_admin = user_email in [e.lower() for e in ADMIN_EMAILS]
        
        # Por padrão, se o login do Firebase for válido, permitimos acesso como User.
        # Se for um dos emails de admin, damos permissão elevada.
        
        return {
            "authorized": True,
            "email": user_email,
            "name": user_email.split('@')[0], 
            "photo": "",
            "role": "admin" if is_admin else "user",
            "row_number": 0 # Legacy field compatibility
        }
    except Exception as e:
        print(f"Error checking user allowed: {e}")
        # Em caso de erro, permite como user para não bloquear
        return {
            "authorized": True,
            "email": email,
            "role": "user", 
            "row_number": 0
        }

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

def append_subscription_request(data):
    """
    Appends a new subscription request to the 'User' tab.
    Data format: {'nome': ..., 'email': ..., 'whatsapp': ..., 'plano': ...}
    """
    from datetime import datetime, timedelta
    
    creds = get_credentials()
    if not creds: return {"error": "Credentials not found"}
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
    RANGE_NAME = "User!A:F" # Expanded to column F for Date/Time
    
    # Get current time in Brasília (UTC-3)
    # Note: For production on Render, we adjust manually if TZ is not set
    now = datetime.utcnow() - timedelta(hours=3)
    timestamp = now.strftime("%d/%m/%Y %H:%M:%S")
    
    # Rows: Name, Email, Whatsapp, Plan, Status (Pendente), Date/Time
    values = [
        [
            data.get('nome', ''),
            data.get('email', ''),
            data.get('whatsapp', ''),
            data.get('plano', ''),
            'Pendente',
            timestamp
        ]
    ]
    
    body = {
        'values': values
    }
    
    try:
        result = service.spreadsheets().values().append(
            spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME,
            valueInputOption="RAW", body=body).execute()
        return {"status": "success", "updatedRange": result.get('updates', {}).get('updatedRange')}
    except Exception as e:
        print(f"Error appending subscription request: {e}")
        return {"error": str(e)}

