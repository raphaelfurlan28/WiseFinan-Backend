import os
import json
from google.oauth2.service_account import Credentials

# Mocking the variables from sheets.py
current_dir = os.path.dirname(os.path.abspath(__file__))
# Note: In sheets.py, it is in backend/services/sheets.py, so __file__ depth is different.
# If we run this script from backend/, __file__ is backend/debug_creds.py.
# In sheets.py: current_dir = backend/services
# root_dir (../../) = backend/ (if relative to services?) NO.
# Let's replicate EXACT logic from sheets.py but adapted to run from backend/

# Logic from sheets.py
def check_creds_logic():
    print("--- Diagnostic Start ---")
    
    # 1. Determine Paths as sheets.py sees them
    # sheets.py is in backend/services
    sheets_py_dir = os.path.join(os.getcwd(), 'services')
    root_dir_calc = os.path.abspath(os.path.join(sheets_py_dir, '../../')) # Should be WiseFinan/
    
    SERVICE_ACCOUNT_FILE_GLOBAL = os.path.join(root_dir_calc, 'service_account.json')
    
    print(f"CWD: {os.getcwd()}")
    print(f"Calculated sheets.py dir: {sheets_py_dir}")
    print(f"Calculated root_dir (../../): {root_dir_calc}")
    print(f"Global SERVICE_ACCOUNT_FILE: {SERVICE_ACCOUNT_FILE_GLOBAL}")
    
    # Files Check
    check_paths = [
        SERVICE_ACCOUNT_FILE_GLOBAL,
        os.path.abspath(os.path.join(sheets_py_dir, '../service_account.json')), # backend/services/../ = backend/
        'service_account.json'
    ]
    
    for p in check_paths:
        exists = os.path.exists(p)
        print(f"Path: {p} | Exists? {exists}")
        
    # Logic Test
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    found = False
    
    for path in check_paths:
        if os.path.exists(path):
            print(f"SUCCESS: Would load from {path}")
            try:
                creds = Credentials.from_service_account_file(path, scopes=scopes)
                print("Credentials Object Created Successfully.")
                found = True
                break
            except Exception as e:
                print(f"FAILED to load credentials: {e}")
                
    if not found:
        print("FAILURE: No credentials found in any path.")

if __name__ == "__main__":
    check_creds_logic()
