import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.sheets import get_filtered_opportunities

print("STARTING DEBUG SCRIPT...", flush=True)
try:
    opps = get_filtered_opportunities()
    print(f"FINISHED. Found {len(opps)} opportunities.", flush=True)
    if opps:
        print(f"Sample: {opps[0]}", flush=True)
except Exception as e:
    print(f"CRASHED: {e}", flush=True)
    import traceback
    traceback.print_exc()
