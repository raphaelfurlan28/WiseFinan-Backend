import sys
import os
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from backend.services.market_data import get_market_indicators, get_treasury_etfs
    
    print("--- Testing Market Indicators (BCB/Yahoo) ---")
    try:
        inds = get_market_indicators()
        print("Indicators:", inds)
    except Exception as e:
        print("Error fetching indicators:", e)

    print("\n--- Testing Treasury ETFs (Yahoo) ---")
    try:
        etfs = get_treasury_etfs()
        print("ETFs:", etfs)
    except Exception as e:
        print("Error fetching ETFs:", e)

except ImportError as e:
    print("Import Error (Run from root):", e)
    # Try alternate import if running from backend dir
    try:
        from services.market_data import get_market_indicators, get_treasury_etfs
        print("Imported from services (backend dir?)")
        inds = get_market_indicators()
        print("Indicators:", inds)
    except Exception as e2:
        print("Retry failed:", e2)
