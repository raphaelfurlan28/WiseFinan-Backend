
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.sheets import get_filtered_opportunities

try:
    print("Fetching filtered opportunities...")
    data = get_filtered_opportunities()
    
    if not data:
        print("No data returned.")
        sys.exit(0)
        
    def print_opt(category, opts):
        print(f"\n--- {category} ---")
        if not opts:
            print("No options found.")
            return

        # Print first valid option with BS data
        found = False
        for item in opts:
            stock = item['stock']['ticker']
            
            # Check Puts
            for p in item['options']['puts']:
                if 'delta' in p:
                    print(f"Stock: {stock} | PUT | Strike: {p['strike']} | Price: {p['last_price']} | BS Price: {p['bs_price']:.4f} | Delta: {p['delta']:.4f} | Prob: {p.get('prob_success')} | Edge: {p.get('edge_formatted')}")
                    found = True
                    break
            
            # Check Calls
            for c in item['options']['calls']:
                if 'delta' in c:
                    print(f"Stock: {stock} | CALL | Strike: {c['strike']} | Price: {c['last_price']} | BS Price: {c['bs_price']:.4f} | Delta: {c['delta']:.4f} | Prob: {c.get('prob_success')} | Edge: {c.get('edge_formatted')}")
                    found = True
                    break
            
            if found: break
            
    print_opt("CHEAP", data.get('cheap', []))
    print_opt("EXPENSIVE", data.get('expensive', []))

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
