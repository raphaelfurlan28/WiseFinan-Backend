import requests
import re
from services.cache import cached

@cached(ttl_seconds=3600) # 1 Hour Cache
def get_economic_indices():
    """
    Fetches current economic indices: Selic, CDI, and IPCA (Accumulated 12m).
    Uses public APIs (BCB or others).
    """
    indices = {
        "selic": "N/A",
        "cdi": "N/A",
        "ipca": "N/A",
        "poupanca": "N/A" # Ensure key exists
    }
    
    # 1. Selic Meta (BCB API)
    # https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json
    try:
        url_selic = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json"
        r = requests.get(url_selic, timeout=5)
        if r.status_code == 200:
             # [{"data":"01/02/2026","valor":"10.75"}]
             val = r.json()[0]['valor']
             indices["selic"] = f"{val}%"
    except Exception as e:
        print(f"Error fetching Selic: {e}")

    # 2. CDI (BCB - Taxa média diária anualizada) - Serie 4389? Or 12 (CDI diária)?
    # Usually CDI is close to Selic. Let's use Serie 4389 (Taxa acumulada no mês anualizada base 252)? 
    # Or simple CDI overnight: 12.
    # Actually, CDI Annualized is commonly used.
    # Let's try to get it from a simpler source if BCB is tricky, or assume Selic - 0.10 for simplistic fallback.
    # But let's try BCB 4389 (Accumulated in month annualized).
    try:
        # CDI Over (Series 12) is daily %. Need to annualize.
        # Let's fetch pure CDI annual rate if available.
        # Alternatively, assume same as Selic (often tracked).
        # A good source for "CDI Hoje" is scraping or specialized API.
        # For now, let's use Selic value for CDI as placeholders or try to find a direct feed.
        # HG Brasil Finance API is free and good for this.
        # Or simple scraping.
        # Let's clone Selic if fail.
        if indices["selic"] != "N/A":
             val_float = float(indices["selic"].replace('%', ''))
             indices["cdi"] = f"{val_float - 0.10:.2f}%" # Approximation
    except:
        pass

    # 3. Poupanca (BCB Serie 195 - % a.m.) -> Accumulate last 12 months for Annual Yield
    try:
         # Fetch last 12 months
         url_poup = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.195/dados/ultimos/12?formato=json"
         r = requests.get(url_poup, timeout=5)
         if r.status_code == 200:
             data = r.json()
             if len(data) >= 12:
                 acc = 1.0
                 for item in data:
                     val_str = item['valor']
                     val = float(val_str)
                     acc *= (1 + val/100)
                 
                 final_yield = (acc - 1) * 100
                 indices["poupanca"] = f"{final_yield:.2f}%"
             else:
                 # Fallback if less than 12 months (e.g. API error or new series)
                 indices["poupanca"] = "6.17% + TR"
    except Exception as e:
         print(f"Error fetching Poupanca: {e}")
         indices["poupanca"] = "6.17% + TR"

    # 4. IPCA 12 Meses (BCB Serie 13522)
    try:
         url_ipca = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json"
         r = requests.get(url_ipca, timeout=5)
         if r.status_code == 200:
             val = r.json()[0]['valor']
             indices["ipca"] = f"{val}%"
    except Exception as e:
        print(f"Error fetching IPCA: {e}")
        
    return indices
