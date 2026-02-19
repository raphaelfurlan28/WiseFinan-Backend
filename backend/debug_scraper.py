import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime

URL = "https://investidor10.com.br/acoes/agenda-resultados/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def fetch_calendar():
    print(f"Fetching {URL}...")
    try:
        response = requests.get(URL, headers=headers, timeout=10)
        response.raise_for_status()
        print("Request successful.")
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # The table seems to be a standard table based on the screenshot.
        # Let's try to find the table rows.
        # Inspecting the site structure is hard without access, but usually it's a <table> or a list of divs.
        # Based on common structures, I'll look for 'table' or classes like 'agenda-results'.
        
        # Let's print the first 500 chars of the body to see if we got content
        # print(soup.body.get_text()[:500])
        
        # Try to find the table
        table = soup.find('table')
        if not table:
            # Maybe it's a list of divs?
            # Let's print all h2 or h3 to see headings
            print("No table found. Checking grid...")
            grid_items = soup.find_all('div', class_='card-body')
            if not grid_items:
                 print("No grid items found. Saving HTML for inspection.")
                 with open("debug_investidor10.html", "w", encoding="utf-8") as f:
                     f.write(soup.prettify())
                 return

        rows = table.find_all('tr')
        print(f"Found {len(rows)} rows.")
        
        results = []
        for row in rows[1:]: # Skip header
            cols = row.find_all('td')
            if len(cols) >= 4:
                # 0: Favorites (heart)
                # 1: Company (Name + Link)
                # 2: Date
                # 3: Period
                
                # Company Name
                company_col = cols[1]
                company_name = company_col.get_text(strip=True)
                
                # Ticker extraction
                link = company_col.find('a')
                ticker = ""
                if link and 'href' in link.attrs:
                    href = link['href']
                    # /acoes/romi3/ -> extract romi3
                    parts = href.strip('/').split('/')
                    if len(parts) > 0:
                        ticker = parts[-1].upper()
                
                else: 
                     # Backup: sometimes ticker is in a span with class 'ticker' or we have to guess
                     pass

                date_text = cols[2].get_text(strip=True)
                period_text = cols[3].get_text(strip=True)
                
                results.append({
                    "ticker": ticker,
                    "company": company_name,
                    "date": date_text,
                    "period": period_text
                })
                
        # Print first 5 results
        for r in results[:5]:
            print(r)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fetch_calendar()
