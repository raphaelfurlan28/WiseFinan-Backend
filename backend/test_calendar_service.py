from services.calendar_service import get_calendar_data
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

def test_service():
    # Tickers known to have results (ROMI3, ITUB4) and some random ones
    tickers = ["ROMI3", "ITUB4", "PETR4", "WEGE3", "VALE3", "INVALID"]
    
    print(f"Testing get_calendar_data for: {tickers}")
    data = get_calendar_data(tickers)
    
    print("\n--- Dividends ---")
    for d in data.get('dividend_events', [])[:5]:
        print(d)
        
    print("\n--- Earnings (Should be filtered) ---")
    earnings = data.get('earnings_events', [])
    for e in earnings:
        print(e)
        
    # Validation
    tickers_in_earnings = [e['ticker'] for e in earnings]
    print(f"\nTickers found in earnings: {tickers_in_earnings}")
    
    assert "ROMI3" in tickers_in_earnings or "ITUB4" in tickers_in_earnings, "Should have found ROMI3 or ITUB4"
    assert "INVALID" not in tickers_in_earnings, "Should NOT have found INVALID"
    
    print("\nTest Passed!")

if __name__ == "__main__":
    test_service()
