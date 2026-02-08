import yfinance as yf
import pandas as pd
from datetime import datetime
from services.cache import cached
import concurrent.futures

def process_ticker(t):
    """
    Helper function to process a single ticker.
    Returns a tuple (dividend_events_list, earnings_events_list)
    """
    div_events = []
    earn_events = []
    
    clean_ticker = t.replace(".SA", "")
    current_year = datetime.now().year
    
    try:
        tik = yf.Ticker(t)
        
        # --- 1. Dividends (Probability) ---
        try:
            hist = tik.dividends
            if not hist.empty:
                # timezone fix
                if hasattr(hist.index, 'tz') and hist.index.tz is not None:
                    hist.index = hist.index.tz_localize(None)
                    
                # Filter last 24 months
                cutoff = pd.Timestamp.now() - pd.DateOffset(months=24)
                recent = hist[hist.index >= cutoff]
                
                # Sort by date desc
                recent_sorted = recent.sort_index(ascending=False)
                
                seen_months = set()
                for date in recent_sorted.index:
                    m = date.month
                    if m not in seen_months:
                        d = date.day
                        seen_months.add(m)
                        
                        # Project to current year
                        try:
                            proj_date = datetime(current_year, m, d)
                            div_events.append({
                                "date": proj_date.strftime("%Y-%m-%d"),
                                "ticker": clean_ticker,
                                "type": "Dividend",
                                "confidence": "High"
                            })
                        except ValueError:
                            pass
        except Exception as e:
            # print(f"Error fetching dividends for {t}: {e}")
            pass

        # --- 2. Earnings Calendar ---
        try:
            cal = tik.calendar
            next_date = None
            if cal is not None:
                keys = cal.keys() if hasattr(cal, 'keys') else []
                if 'Earnings Date' in keys:
                    d_list = cal['Earnings Date']
                    if d_list:
                        next_date = d_list[0]
                elif hasattr(cal, 'iloc'): 
                        if 'Earnings Date' in cal.index:
                            next_date = cal.loc['Earnings Date'].iloc[0]
            
            if next_date:
                fmt_date = next_date
                if isinstance(next_date, (datetime, pd.Timestamp)):
                        fmt_date = next_date.strftime("%Y-%m-%d")
                
                earn_events.append({
                    "ticker": clean_ticker,
                    "date": str(fmt_date),
                    "type": "Earnings",
                    "estimated": True
                })
        except Exception as e:
            pass
            
    except Exception as outer_e:
        print(f"Error processing {t}: {outer_e}")
        
    return div_events, earn_events

@cached(ttl_seconds=3600*12) # Cache for 12 hours
def get_calendar_data(tickers):
    """
    Fetches dividend history and next earnings calendar for a list of tickers.
    Uses ThreadPoolExecutor for parallel fetching.
    """
    dividend_events = []
    earnings_events = []
    
    unique_tickers = list(set([t.upper() + ".SA" if not t.endswith(".SA") else t.upper() for t in tickers]))
    
    if not unique_tickers: return {"dividend_events": [], "earnings_events": []}

    print(f"[CALENDAR SERVICE] Fetching data for {len(unique_tickers)} tickers using threading...")
    
    # Use ThreadPoolExecutor to fetch in parallel
    # Max workers = 10 to be safe on Render
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(process_ticker, unique_tickers))
        
    for res_divs, res_earns in results:
        dividend_events.extend(res_divs)
        earnings_events.extend(res_earns)

    return {
        "dividend_events": dividend_events,
        "earnings_events": earnings_events
    }

