@cached(ttl_seconds=300)
def get_market_summary_data():
    """
    Returns lightweight market data: Indices, Fixed Income, ETFs.
    """
    from concurrent.futures import ThreadPoolExecutor
    
    def fetch_indices_data():
        try:
            return get_economic_indices()
        except Exception as e:
            print(f"Error fetching indices: {e}")
            return {}

    def fetch_fixed_income():
        try:
            return get_fixed_income_data()
        except Exception as e:
            print(f"Error fetching fixed income: {e}")
            return []

    def fetch_guarantee_etfs():
        try:
            from services.market_data import get_treasury_etfs
            return get_treasury_etfs()
        except Exception as e:
            print(f"Error fetching ETFs: {e}")
            return []

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_indices = executor.submit(fetch_indices_data)
        future_fixed = executor.submit(fetch_fixed_income)
        future_etfs = executor.submit(fetch_guarantee_etfs)

        indices = future_indices.result()
        fixed_data = future_fixed.result()
        guarantee_data = future_etfs.result()
        
    return {
        "indices": indices,
        "fixed_income": fixed_data,
        "guarantee": guarantee_data
    }

@cached(ttl_seconds=300)
def get_opportunities_data():
    """
    Returns only the heavy calculation part: Stock Opportunities (Cheap/Expensive).
    """
    from datetime import datetime
    import numpy as np
    
    try:
        stocks = get_sheet_data()
    except:
        return {"cheap": [], "expensive": []}
        
    try:
        # This uses the cached singleton we created earlier
        all_options = _fetch_all_raw_options()
    except:
        return {"cheap": [], "expensive": []}

    try:
        indices = get_economic_indices()
        selic_str = indices.get('selic', '10.75').replace('%', '').replace(',', '.')
        r = float(selic_str) / 100.0
    except:
        r = 0.1075

    if not stocks: return {"cheap": [], "expensive": []}

    # Map Options by Underlying
    options_by_ticker = {}
    if all_options:
        for opt in all_options:
            unk = opt.get('underlying', '').strip().upper()
            if not unk: continue
            if unk not in options_by_ticker:
                options_by_ticker[unk] = []
            options_by_ticker[unk].append(opt)
    
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
                
            stock_price = parse_price(stock.get('price', 0.0))
            cost_val = parse_price(stock.get('min_val', 0.0))
            max_val = parse_price(stock.get('max_val', 0.0))
            
            # Get Historical Volatility from Stock Data
            vol_str = str(stock.get('vol_ano', '0')).replace('%', '').replace(',', '.')
            try:
               sigma = float(vol_str) / 100.0
               if sigma <= 0: sigma = 0.40 
            except:
               sigma = 0.40

            if cost_val <= 0 and max_val <= 0:
                continue

            stock_opts = options_by_ticker.get(ticker, [])
            
            valid_puts = []
            valid_calls = []

            for opt in stock_opts:
                try:
                    opt = opt.copy()
                    
                    otype = opt.get('type', '').upper()
                    strike = smart_float(opt.get('strike', 0))
                    prem_yield = float(opt.get('premium_val', 0.0)) 
                    market_price = float(opt.get('price_val', 0.0))

                    if strike <= 0: continue
                    
                    exp = opt.get('expiration', '')
                    bdays = get_business_days(exp)
                    
                    if bdays <= 0: continue
                    T = bdays / 252.0
                    
                    bs_price = 0.0
                    delta = 0.0
                    
                    if HAS_BS_LIBS:
                        bs_type = 'call' if 'CALL' in otype else 'put'
                        try:
                            bs_price = black_scholes_price(stock_price, strike, T, r, sigma, bs_type)
                            delta = calculate_delta(stock_price, strike, T, r, sigma, bs_type)
                        except:
                            bs_price = 0.0
                            delta = 0.0
                    
                    prob_success = 0.0
                    edge_pct = 0.0
                    if bs_price > 0:
                        edge_pct = ((market_price - bs_price) / bs_price)
                    
                    opt['delta'] = delta
                    opt['bs_price'] = bs_price
                    if HAS_BS_LIBS:
                        opt['edge_formatted'] = f"{edge_pct*100:.1f}%"
                    else:
                        opt['edge_formatted'] = None
                    
                    # --- FILTERS ---
                    if is_cheap:
                        if 'PUT' in otype or 'VENDA' in otype: 
                            if prem_yield <= 0.01: continue
                            if bdays > 40: continue
                            if strike > cost_val * 1.08: continue

                            if HAS_BS_LIBS:
                                prob_success = 1 - abs(delta)
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            opt['yield_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                            valid_puts.append(opt)

                        elif 'CALL' in otype or 'COMPRA' in otype: 
                            if prem_yield > 0.02: continue
                            if bdays <= 60: continue
                            if strike <= stock_price * 1.10: continue

                            if HAS_BS_LIBS:
                                prob_success = abs(delta)
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            opt['cost_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                            valid_calls.append(opt)

                    elif is_expensive:
                        if 'PUT' in otype or 'COMPRA' in otype: 
                            if prem_yield > 0.015: continue 
                            if bdays <= 60: continue
                            if strike >= stock_price * 0.90: continue 

                            if HAS_BS_LIBS:
                                prob_success = abs(delta)
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            
                            opt['cost_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                            valid_puts.append(opt)
                            
                        elif 'CALL' in otype or 'VENDA' in otype: 
                            if prem_yield <= 0.01: continue
                            if bdays > 45: continue
                            if strike < max_val * 0.95: continue

                            if HAS_BS_LIBS:
                                prob_success = 1 - abs(delta) 
                                opt['prob_success'] = f"{prob_success*100:.1f}%"
                            
                            opt['yield_display'] = f"{prem_yield*100:.2f}%"
                            opt['last_price'] = market_price
                            opt['sigma'] = f"{sigma*100:.1f}%"
                            opt['delta_val'] = f"{delta:.3f}"
                            opt['bs_price_val'] = f"R$ {bs_price:.2f}"
                            valid_calls.append(opt)

                except Exception as loop_e:
                     continue

            if len(valid_puts) > 0 or len(valid_calls) > 0:
                filtered_results.append({
                    "ticker": ticker,
                    "company_name": stock.get('company_name', ticker),
                    "sector": stock.get('sector', ''),
                    "price": f"R$ {stock_price:.2f}".replace('.', ','),
                    "min_val": f"R$ {cost_val:.2f}".replace('.', ','),
                    "max_val": f"R$ {max_val:.2f}".replace('.', ','),
                    "falta_pct": stock.get('falta_pct', '0%'),
                    "falta_val": falta_val,
                    "image_url": stock.get('image_url', ''),
                    "change_day": stock.get('change_day', '0%'),
                    "category": 'CHEAP' if is_cheap else 'EXPENSIVE',
                    "puts": valid_puts,
                    "calls": valid_calls
                })

        except Exception as e:
            print(f"Error processing stock {stock.get('ticker')}: {e}")
            continue
    
    return {
        "cheap": [x for x in filtered_results if x['category'] == 'CHEAP'],
        "expensive": [x for x in filtered_results if x['category'] == 'EXPENSIVE']
    }
