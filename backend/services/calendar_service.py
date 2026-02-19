import yfinance as yf
import pandas as pd
from datetime import datetime
from services.cache import cached
import requests
from bs4 import BeautifulSoup
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

    except Exception as outer_e:
        print(f"Error processing {t}: {outer_e}")

    return div_events, [] # Return empty list for earnings (handled by scraper now)

@cached(ttl_seconds=3600*4) # Cache scraper for 4 hours
def scrape_earnings_investidor10():
    URL = "https://investidor10.com.br/acoes/agenda-resultados/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    results = []
    print(f"[CALENDAR SERVICE] Scraping {URL}...")
    try:
        response = requests.get(URL, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"[CALENDAR SERVICE] Scraper failed with status {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table')
        
        # If no table, try finding grid items (fallback logic from debugging)
        if not table:
             print("[CALENDAR SERVICE] No table found in scraper.")
             return []

        rows = table.find_all('tr')
        
        for row in rows[1:]: # Skip header
            cols = row.find_all('td')
            if len(cols) >= 4:
                # 0: Favorites, 1: Company, 2: Date, 3: Period
                
                # Ticker extraction from link in 2nd column
                company_col = cols[1]
                link = company_col.find('a')
                ticker = ""
                if link and 'href' in link.attrs:
                    href = link['href']
                    parts = href.strip('/').split('/')
                    if len(parts) > 0:
                        ticker = parts[-1].upper()
                
                if not ticker: continue

                # Date: dd/mm/yyyy -> yyyy-mm-dd
                date_text = cols[2].get_text(strip=True)
                try:
                    dt = datetime.strptime(date_text, "%d/%m/%Y")
                    fmt_date = dt.strftime("%Y-%m-%d")
                except:
                    fmt_date = date_text

                results.append({
                    "ticker": ticker,
                    "date": fmt_date,
                    "type": "Earnings",
                    "estimated": False # Confirmed data from site
                })
                
        print(f"[CALENDAR SERVICE] Scraped {len(results)} earnings events.")
        return results
            
    except Exception as e:
        print(f"[CALENDAR SERVICE] Scraper error: {e}")
        return []

@cached(ttl_seconds=3600*12) # Cache dividends for 12 hours
def get_calendar_data(tickers):
    """
    Fetches dividend history (yfinance) and earnings calendar (Investidor10).
    """
    dividend_events = []
    earnings_events = []
    
    # Normalize tickers for yfinance (add .SA) and for filtering (clean)
    unique_tickers_sa = list(set([t.upper() + ".SA" if not t.endswith(".SA") else t.upper() for t in tickers]))
    valid_tickers_clean = set([t.upper().replace(".SA", "") for t in tickers]) # Set for fast lookup
    
    if not unique_tickers_sa: return {"dividend_events": [], "earnings_events": []}

    # 1. Fetch Dividends via yfinance (Threaded)
    print(f"[CALENDAR SERVICE] Fetching dividends for {len(unique_tickers_sa)} tickers...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(process_ticker, unique_tickers_sa))
        
    for res_divs, _ in results: # _ is empty earnings list
        dividend_events.extend(res_divs)

    # 2. Fetch Earnings via Scraper
    scraped_earnings = scrape_earnings_investidor10()
    
    # 3. Filter Earnings (Only keep tickers present in our list)
    filtered_earnings = [
        e for e in scraped_earnings 
        if e['ticker'] in valid_tickers_clean
    ]
    earnings_events = filtered_earnings

    print(f"[CALENDAR SERVICE] Returning {len(dividend_events)} dividends and {len(earnings_events)} earnings (filtered from {len(scraped_earnings)}).")

    return {
        "dividend_events": dividend_events,
        "earnings_events": earnings_events
    }

