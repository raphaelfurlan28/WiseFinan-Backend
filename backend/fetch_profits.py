import sys
import os
import pandas as pd
import yfinance as yf
from datetime import datetime

# Setup path to import services
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Set SPREADSHEET_ID specifically for this script
os.environ['SPREADSHEET_ID'] = '1L2lfL6h4eoYU_U276e0dYFgENAgGruxiWJWOfgazD74'

try:
    from services.sheets import get_sheet_data
except ImportError:
    # Fallback if run from root
    sys.path.append(os.path.join(current_dir, 'backend'))
    from services.sheets import get_sheet_data

def format_currency(val):
    if pd.isna(val): return "N/A"
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def main():
    print("Fetching tickers from Google Sheets...")
    stocks = get_sheet_data()
    if not stocks:
        print("Error: No stocks found or credentials failed.")
        return

    tickers = [s['ticker'] for s in stocks if s.get('ticker')]
    print(f"Found {len(tickers)} tickers.")
    
    # Filter for uniques and add .SA
    unique_tickers = list(set([t.upper() + ".SA" if not t.endswith(".SA") else t.upper() for t in tickers]))
    
    results = []
    
    print("Fetching financial data (this may take a minute)...")
    
    for t in unique_tickers:
        clean_ticker = t.replace(".SA", "")
        print(f"Processing {clean_ticker}...")
        
        try:
            tik = yf.Ticker(t)
            # Fetch quarterly financials
            fin = tik.quarterly_income_stmt
            
            if fin is None or fin.empty:
                results.append(f"{clean_ticker}: Dados não encontrados")
                continue
                
            # Convert index to datetime if needed (usually columns are dates)
            # yfinance returns dates as columns
            cols = fin.columns
            
            # Find closest column to 2025-09-30
            # Note: Dates are usually Timestamp objects
            target_date = pd.Timestamp("2025-09-30")
            
            # Find column exactly matching or falling in Q3 (July-Sept)??
            # Usually report date is 2025-09-30 for Q3.
            
            # Filter columns that are close
            found_col = None
            for col in cols:
                # Check directly or check within a few days margin
                try:
                    # Parse col to date
                    d = pd.to_datetime(col)
                    if d.year == 2025 and d.month == 9 and d.day == 30:
                        found_col = col
                        break
                except: pass
            
            # Look for Net Income
            net_income = None
            if found_col:
                try:
                    # Row names can vary: "Net Income", "Net Income Common Stockholders", etc.
                    # Try loc
                    if "Net Income" in fin.index:
                        net_income = fin.loc["Net Income", found_col]
                    elif "Net Income Common Stockholders" in fin.index:
                        net_income = fin.loc["Net Income Common Stockholders", found_col]
                    elif "Net Income From Continuing And Discontinued Operation" in fin.index:
                         net_income = fin.loc["Net Income From Continuing And Discontinued Operation", found_col]
                except: pass
            
            if net_income is not None:
                results.append(f"{clean_ticker}: {format_currency(net_income)}")
            else:
                # If exact date not found, list available dates?
                avail_dates = [str(c.date()) for c in cols]
                results.append(f"{clean_ticker}: Dados de 30/09/2025 não encontrados. Datas disp: {avail_dates[0:3]}")
                
        except Exception as e:
            results.append(f"{clean_ticker}: Erro - {str(e)}")

    # Save to file
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    filepath = os.path.join(desktop, "lucro_liquido_3T25.txt")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("RELATÓRIO DE LUCRO LÍQUIDO - 3T25 (30/09/2025)\n")
        f.write("="*50 + "\n\n")
        for line in results:
            f.write(line + "\n")
            
    print(f"Done! Saved to: {filepath}")

if __name__ == "__main__":
    main()
