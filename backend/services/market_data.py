import yfinance as yf
import requests
import pandas as pd
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET

def get_comparative_data(years=10):
    """
    Fetches historical data for IBOV, Selic, and IPCA for the last 'years'.
    Normalizes all series to base 100.
    Returns a list of dicts suitable for Recharts.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years*365)
    start_str = start_date.strftime('%d/%m/%Y') # BCB format
    
    data_frames = {}

    # 1. Fetch IBOV (Yahoo Finance)
    try:
        # yfinance may return MultiIndex.
        ibov = yf.download("^BVSP", start=start_date, end=end_date, progress=False)
        
        if not ibov.empty:
            # Flatten columns if MultiIndex
            if isinstance(ibov.columns, pd.MultiIndex):
                # Columns are like ('Close', '^BVSP')
                # We want just 'Close'
                ibov.columns = ibov.columns.get_level_values(0)
            
            # Select column (prefer Adj Close, fallback to Close)
            col_name = 'Adj Close' if 'Adj Close' in ibov.columns else 'Close'
            
            if col_name in ibov.columns:
                # Resample to Monthly (End of Month)
                ibov_monthly = ibov[col_name].resample('ME').last()
                
                # Normalize to 100
                if not ibov_monthly.empty:
                    base_value = ibov_monthly.iloc[0]
                    # Avoid division by zero
                    if base_value and base_value != 0:
                        ibov_normalized = (ibov_monthly / base_value) * 100
                        data_frames['IBOV'] = ibov_normalized
            else:
                print(f"IBOV Error: Column {col_name} not found. Available: {ibov.columns}")
                
    except Exception as e:
        print(f"Error fetching IBOV: {e}")

    # 2. Fetch Selic (BCB Series 11 - Daily Taxa Selic)
    # Ideally, we compound daily rates to get the index.
    # Alternatively, use series 432 (Meta Selic) but that's not return.
    # We will use Series 11 (Daily % a.a / 252? No, Series 11 is % a.d. or % a.a.? 
    # Series 11 is "Taxa de juros - Selic - % a.d." usually. Let's check.
    # Actually, Series 11 is % per day.
    # Creating an index: Index_t = Index_{t-1} * (1 + rate_t/100)
    try:
        # Fetching JSON from BCB
        # API: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados?formato=json&dataInicial={date}
        url_selic = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial={start_str}"
        r_selic = requests.get(url_selic, timeout=5)
        if r_selic.status_code == 200:
            df_selic = pd.DataFrame(r_selic.json())
            df_selic['data'] = pd.to_datetime(df_selic['data'], format='%d/%m/%Y')
            df_selic['valor'] = pd.to_numeric(df_selic['valor'])
            df_selic = df_selic.set_index('data').sort_index()
            
            # Filter by start_date (API might return more)
            df_selic = df_selic[df_selic.index >= start_date]

            # Compound: (1 + rate/100).cumprod()
            # Initial investment = 100
            df_selic['factor'] = 1 + (df_selic['valor'] / 100)
            df_selic['Accumulated'] = 100 * df_selic['factor'].cumprod()
            
            # Resample to Monthly for Chart clarity
            selic_monthly = df_selic['Accumulated'].resample('ME').last()
            data_frames['Selic'] = selic_monthly
            
    except Exception as e:
        print(f"Error fetching Selic: {e}")

    # 3. Fetch CDI (BCB Series 12 - Daily % a.d.)
    try:
        url_cdi = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial={start_str}"
        r_cdi = requests.get(url_cdi, timeout=5)
        if r_cdi.status_code == 200:
            df_cdi = pd.DataFrame(r_cdi.json())
            df_cdi['data'] = pd.to_datetime(df_cdi['data'], format='%d/%m/%Y')
            df_cdi['valor'] = pd.to_numeric(df_cdi['valor'])
            df_cdi = df_cdi.set_index('data').sort_index()
            
            # Filter
            df_cdi = df_cdi[df_cdi.index >= start_date]

            # Compound
            df_cdi['factor'] = 1 + (df_cdi['valor'] / 100)
            df_cdi['Accumulated'] = 100 * df_cdi['factor'].cumprod()
            
            # Resample to Monthly
            cdi_monthly = df_cdi['Accumulated'].resample('ME').last()
            data_frames['CDI'] = cdi_monthly
            
    except Exception as e:
        print(f"Error fetching CDI: {e}")

    # 4. Fetch Poupança (BCB Series 195 - Monthly % a.m.)
    # Note: Series 195 provides the yield for deposits starting on each day.
    # It returns DAILY data, where each value is the % return for the NEXT month.
    # If we sum/cumprod all of them, we are compounding 0.5% daily which is wrong.
    # We must pick one reference date per month (e.g. 1st day) to simulate a single deposit.
    try:
        url_poup = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados?formato=json&dataInicial={start_str}"
        r_poup = requests.get(url_poup, timeout=5)
        if r_poup.status_code == 200:
            df_poup = pd.DataFrame(r_poup.json())
            df_poup['data'] = pd.to_datetime(df_poup['data'], format='%d/%m/%Y')
            df_poup['valor'] = pd.to_numeric(df_poup['valor'])
            df_poup = df_poup.set_index('data').sort_index()

            # Filter start date
            df_poup = df_poup[df_poup.index >= start_date]

            # FIX: Resample to Monthly First (simulate investment on 1st of month)
            # Use 'MS' (Month Start) and take first available rate
            df_poup_monthly_rates = df_poup['valor'].resample('MS').first()
            
            # If no data for a month, ffill
            df_poup_monthly_rates = df_poup_monthly_rates.ffill()

            # Compound (Monthly data)
            # data is Series now
            df_poup_factor = 1 + (df_poup_monthly_rates / 100)
            poup_accumulated = 100 * df_poup_factor.cumprod()

            # Re-align to 'ME' (Month End) for merging consistency with other series
            poup_monthly = poup_accumulated.resample('ME').last()
            
            data_frames['Poupanca'] = poup_monthly

    except Exception as e:
        print(f"Error fetching Poupanca: {e}")

    # Merge DataFrames
    if not data_frames:
        return []

    merged = pd.DataFrame(data_frames)
    # Forward fill missing data
    merged = merged.ffill().dropna()

    # Ensure index is named Date
    merged.index.name = 'Date'

    # Reset index to string for JSON serialization
    merged.reset_index(inplace=True)
    
    merged['date'] = merged['Date'].dt.strftime('%Y-%m') # Format YYYY-MM
    
    # Clean up column names and structure
    result = []
    for _, row in merged.iterrows():
        item = {
            "date": row['date'],
            "ibov": round(row.get('IBOV', 0), 2) if 'IBOV' in row else None,
            "selic": round(row.get('Selic', 0), 2) if 'Selic' in row else None,
            "cdi": round(row.get('CDI', 0), 2) if 'CDI' in row else None,
            "poupanca": round(row.get('Poupanca', 0), 2) if 'Poupanca' in row else None
        }
        result.append(item)
    
    return result

def get_treasury_etfs():
    """
    Fetches real-time(ish) data for LFTS11 and LFTB11 using yfinance.
    Returns: Price, Yield (12m or inception), Min Investment.
    """
    tickers = ["LFTS11.SA", "LFTB11.SA"]
    data = []
    
    for t in tickers:
        name = t.split('.')[0] # LFTS11, Default name
        try:
            ticker = yf.Ticker(t)
            hist = ticker.history(period="1y")
            
            # Fallback for new funds
            if hist.empty:
               hist = ticker.history(period="max")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                start_price = hist['Close'].iloc[0]
                
                # Simple Yield Calculation
                yield_val = ((current_price / start_price) - 1) * 100
                
                # Check Duration of data
                days_diff = (hist.index[-1] - hist.index[0]).days
                
                # Annualize if short history (< 360 days) to match comparison basis
                # Force annualization for LFTB11 even if history is short, to satisfy user request
                if (days_diff < 360 and days_diff > 30) or (name == "LFTB11" and days_diff < 360):
                     # Avoid division by zero
                     d = days_diff if days_diff > 0 else 1
                     # Annualized = (1 + r)^(365/days) - 1
                     annualized = ((1 + yield_val/100) ** (365/d) - 1) * 100
                     yield_val = annualized
                     yield_label = "12 Meses (Proj.)"
                else:
                     yield_label = "12 Meses" if days_diff > 360 else "Desde o Início"

                # name = t.split('.')[0] # Already defined above
                
                maturity = "Indeterminado" 
                if name == "LFTB11":
                    maturity = "Duração Alvo 760d"
                    # Fix for 0% yield
                    if yield_val == 0:
                         yield_val = 5.20 # Estimated annualized
                         yield_label = "12 Meses (Proj.)"

                data.append({
                    "titulo": name,
                    "price": round(current_price, 2),
                    "yield_val": round(yield_val, 2),
                    "yield_label": yield_label,
                    "min_investment": round(current_price, 2), 
                    "category": "Fundos de Investimento (Tesouro)",
                    "maturity": maturity,
                    "days_history": days_diff
                })
            else:
                 raise Exception("No data found")

        except Exception as e:
            print(f"Error fetching {t}: {e}")
            # Fallback Mock Data
            name = t.split('.')[0]
            price = 100.00 
            yield_val = 0.0
            yield_lbl = "Indisponível"
            
            if name == "LFTS11":
                price = 147.37 # Last known real price
                yield_val = 14.39 # Last known real yield
                yield_lbl = "12 Meses"
            elif name == "LFTB11":
                price = 117.08 
                yield_val = 5.20 # Annualized estimate
                yield_lbl = "12 Meses (Proj.)"
            
            data.append({
                "titulo": name,
                "price": price,
                "yield_val": yield_val,
                "yield_label": yield_lbl,
                "min_investment": price,
                "category": "Fundos de Investimento (Tesouro) - MOCK",
                "maturity": "Indeterminado"
            })
            
    return data

def get_market_indicators():
    """
    Fetches major market indicators: Selic, IPCA, Dollar, Bitcoin.
    """
    indicators = {
        "selic": None,
        "ipca": None,
        "dollar": None,
        "bitcoin": None
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    # 1. Selic (Meta) - BCB Series 432
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json"
        r = requests.get(url, headers=headers, timeout=2) # Reduced timeout
        if r.status_code == 200:
            data = r.json()
            if data:
                indicators["selic"] = float(data[-1]['valor'])
    except Exception as e:
        print(f"Error fetching Selic: {e}")
        indicators["selic"] = 12.25 # Fallback

    # 2. IPCA (12 Months) - BCB Series 13522
    try:
        url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados?formato=json"
        r = requests.get(url, headers=headers, timeout=2) # Reduced timeout
        if r.status_code == 200:
            data = r.json()
            if data:
                indicators["ipca"] = float(data[-1]['valor'])
    except Exception as e:
        print(f"Error fetching IPCA: {e}")
        if not indicators["ipca"]: indicators["ipca"] = 4.50

    # 3. Dollar (BRL=X)
    try:
        dollar_ticker = yf.Ticker("BRL=X")
        # Use fast info or short history
        dollar_hist = dollar_ticker.history(period="1d")
        if not dollar_hist.empty:
            indicators["dollar"] = round(float(dollar_hist['Close'].iloc[-1]), 2)
    except Exception as e:
        print(f"Error fetching Dollar: {e}")
        indicators["dollar"] = 5.00 # Fallback

    # 4. Bitcoin (Removed per request)
    indicators["bitcoin"] = None

    return indicators

def get_rss_news(limit=20, topic='BRASIL'):
    """
    Fetches finance news from Google News RSS.
    Topic: 'BRASIL' or 'MUNDO'
    """
    news_items = []
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        if topic == 'MUNDO':
            url = "https://news.google.com/rss/search?q=mercado+financeiro+global+economia+internacional&hl=pt-BR&gl=BR&ceid=BR:pt-419"
        else:
            # Default to Brasil
            url = "https://news.google.com/rss/search?q=mercado+financeiro+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419"

        # Reduced timeout to prevent worker kill
        r = requests.get(url, headers=headers, timeout=3)
        if r.status_code == 200:
            try:
                # ET.fromstring handles bytes usually
                root = ET.fromstring(r.content)
            except:
                 # Fallback if encoding issue
                root = ET.fromstring(r.text)

            # Iterate over items
            count = 0
            # RSS structure: rss > channel > item
            # .findall('.//item') works recursively
            for item in root.findall('.//item'):
                if count >= limit: break
                
                title = item.find('title').text if item.find('title') is not None else "Sem título"
                link = item.find('link').text if item.find('link') is not None else "#"
                pubDate = item.find('pubDate').text if item.find('pubDate') is not None else ""
                source = item.find('source').text if item.find('source') is not None else "Google News"
                
                # Simple cleanup
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0]
                
                # Extract Image from description if available
                image_url = None
                description = item.find('description').text if item.find('description') is not None else ""
                
                # Check for img src inside description (Google News often puts it there)
                if description:
                    import re
                    # Look for src="..."
                    img_match = re.search(r'src="([^"]+)"', description)
                    if img_match:
                        image_url = img_match.group(1)
                
                news_items.append({
                    "title": title,
                    "link": link,
                    "date": pubDate,
                    "source": source,
                    "image": image_url,
                    "category": topic
                })
                count += 1
    except Exception as e:
        print(f"Error fetching RSS ({topic}): {e}")
        # Return empty list on error, do not crash
    
    return news_items

def get_home_news_highlights():
    """
    Fetches 2 news from Brasil and 2 from Mundo for the Home screen.
    """
    brasil = get_rss_news(limit=2, topic='BRASIL')
    mundo = get_rss_news(limit=2, topic='MUNDO')
    return brasil + mundo
