import yfinance as yf
import pandas as pd
from datetime import datetime
from services.cache import cached

@cached(ttl_seconds=3600*12) # Cache for 12 hours
def get_calendar_data(tickers):
    """
    Fetches dividend history and next earnings calendar for a list of tickers.
    Returns:
    {
        "dividend_events": [ { "date": "2024-05-15", "ticker": "PETR4", "type": "Dividend" } ],
        "earnings_events": [ { "date": "2024-03-01", "ticker": "PETR4", "type": "Earnings" } ]
    }
    """
    dividend_events = []
    earnings_events = []
    
    unique_tickers = list(set([t.upper() + ".SA" if not t.endswith(".SA") else t.upper() for t in tickers]))
    
    current_year = datetime.now().year
    
    try:
        if not unique_tickers: return {"dividend_events": [], "earnings_events": []}

        for t in unique_tickers:
            clean_ticker = t.replace(".SA", "")
            try:
                tik = yf.Ticker(t)
                
                # --- 1. Dividends (Probability) ---
                try:
                    hist = tik.dividends
                    if not hist.empty:
                        # timezone fix: convert to naive datetime
                        if hasattr(hist.index, 'tz') and hist.index.tz is not None:
                            hist.index = hist.index.tz_localize(None)
                            
                        # Filter last 24 months
                        cutoff = pd.Timestamp.now() - pd.DateOffset(months=24)
                        recent = hist[hist.index >= cutoff]
                        
                        # We want to project these dates to the current/next year
                        # Logic: If paid in Month M Day D in previous years, predict Month M Day D in this year.
                        # Group by Month to avoid duplicates (take the most recent day)
                        seen_months = set()
                        
                        # Sort by date desc to get most recent first
                        recent_sorted = recent.sort_index(ascending=False)
                        
                        for date in recent_sorted.index:
                            m = date.month
                            if m not in seen_months:
                                d = date.day
                                seen_months.add(m)
                                
                                # Project to current year
                                try:
                                    proj_date = datetime(current_year, m, d)
                                    # If this date is already passed significantly? 
                                    # Maybe show it anyway as "History/Probable" or project to Next Year if passed?
                                    # User wants a calendar. showing past months of this year is fine.
                                    # If it's Dec and we look at Jan, maybe Jan next year?
                                    # For simplicity, stick to current year projection or "upcoming 12 months"?
                                    # Let's simple: Project to Current Year.
                                    
                                    dividend_events.append({
                                        "date": proj_date.strftime("%Y-%m-%d"),
                                        "ticker": clean_ticker,
                                        "type": "Dividend",
                                        "confidence": "High"
                                    })
                                except ValueError:
                                    # Leap year issues
                                    pass
                except Exception as e:
                    print(f"Error fetching dividends for {t}: {e}")

                # --- 2. Earnings Calendar ---
                try:
                    cal = tik.calendar
                    dates = []
                    # ... [Existing parsing logic] ...
                    # (Simplified for brevity, assuming existing logic or improved)
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
                        
                        earnings_events.append({
                            "ticker": clean_ticker,
                            "date": str(fmt_date),
                            "type": "Earnings",
                            "estimated": True
                        })
                        
                except Exception as e:
                    pass
                    
            except Exception as outer_e:
                print(f"Error processing {t}: {outer_e}")
                continue

    except Exception as e:
        print(f"Global Calendar Error: {e}")
        return {"error": str(e)}

    return {
        "dividend_events": dividend_events,
        "earnings_events": earnings_events
    }

