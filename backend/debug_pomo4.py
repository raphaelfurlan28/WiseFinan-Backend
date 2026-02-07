
from services.sheets import get_sheet_data, get_options_data
import os
import sys

# Hack to adjust path if run from root
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Set ENV manually for debug
os.environ['SPREADSHEET_ID'] = '1L2lfL6h4eoYU_U276e0dYFgENAgGruxiWJWOfgazD74'

from services.sheets import get_sheet_data, get_options_data

def debug_pomo4():
    print("--- DEBUGGING POMO4 ---")
    try:
        stocks = get_sheet_data()
        print(f"Loaded {len(stocks)} stocks.")
        
        pomo_stock = next((s for s in stocks if s.get('ticker') == 'POMO4'), None)
        if not pomo_stock:
            print("POMO4 not found in Stocks Sheet!")
            return
            
        print(f"Stock Data: {pomo_stock}")
        
        cost_val = float(str(pomo_stock.get('min_val', '0')).replace('R$', '').replace('.','').replace(',','.'))
        stock_price = float(str(pomo_stock.get('price', '0')).replace('.','').replace(',','.'))
        
        print(f"Price: {stock_price}, Low Cost: {cost_val}")
        print(f"Limit Strike (5% Rule): {cost_val * 1.05} (Cost * 1.05)")
        print(f"Previous Limit (10% Rule): {cost_val * 1.10}")

        print("\nFetching Options...")
        options = get_options_data("POMO4")
        print(f"Found {len(options)} options for POMO4 (Raw from Sheet).")
        
        valid_count = 0
        for opt in options:
            otype = opt.get('type', '').upper()
            if 'PUT' not in otype and 'VENDA' not in otype: continue
            
            strike = float(opt.get('strike', 0))
            prem_val = float(opt.get('premium_val', 0.0))
            
            # Replicating sheets.py logic
            reason = "OK"
            
            if strike <= 0: reason = "Invalid Strike"
            
            limit_strike = cost_val * 1.05
            if strike > limit_strike: reason = f"Strike {strike} > Limit {limit_strike:.2f}"
            
            if prem_val <= 0.01: reason = f"Prem {prem_val} <= 0.01"
            
            # Exp
            from services.sheets import get_filtered_opportunities # Use function if needed? No, logic is inside loop.
            # Simulating business days logic or ignoring for now?
            # Sheets.py had `get_business_days` inner function.
            # I'll just skip bdays check for debug or crude check
            
            if reason == "OK":
                valid_count += 1
                print(f" [ACCEPT] Strike: {strike}, Prem: {prem_val}, Type: {otype}")
            else:
                print(f" [REJECT] Strike: {strike}, Prem: {prem_val}, Type: {otype} -> {reason}")

        print(f"\nTotal Valid Count: {valid_count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_pomo4()
