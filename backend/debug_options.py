
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import os

# Hardcode or load env var if necessary, but usually os.environ works if run from root.
# Assuming SPREADSHEET_ID is set in .env or consistent
# We will just read it from here or expect environment variable

SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
SERVICE_ACCOUNT_FILE = 'service_account.json'
SPREADSHEET_ID = '1Z1tD4rE-J29X4c4F-d5z-6D5b7G7h9j0k1l2m3n4o5' # Replace if you know exact ID, otherwise rely on env

# Better: Read from backend/services/sheets.py if needed, or just hardcode specific ID from user context if available.
# Actually, let's try to grab ID from os.environ or just hardcode the one we saw earlier if possible.
# Wait, I don't have the ID handy. I'll blindly trust os.environ works, otherwise I need to read .env

def debug_options():
    print("--- DEBUG OPTIONS SHEET ---")
    
    # Try to load env if not loaded (basic check)
    if not os.environ.get('SPREADSHEET_ID'):
        # Try to read line from .env if exists
        try:
            with open('.env', 'r') as f:
                for line in f:
                    if line.startswith('SPREADSHEET_ID'):
                        os.environ['SPREADSHEET_ID'] = line.split('=')[1].strip()
        except:
            pass

    creds = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    
    sheet_id = os.environ.get('SPREADSHEET_ID')
    print(f"Using Spreadsheet ID: {sheet_id}")

    # Try fetching headers
    range_name = "Opcoes!A1:Z5"
    try:
        print(f"Fetching range: {range_name}")
        result = service.spreadsheets().values().get(spreadsheetId=sheet_id, range=range_name).execute()
        values = result.get('values', [])
        
        if not values:
            print("No data found in sheet.")
            return

        headers = values[0]
        print(f"Headers Row (Raw): {headers}")
        print(f"Headers (Normalized): {[h.strip().upper() for h in headers]}")
        
        print(f"Total Rows: {len(values)}")
        if len(values) > 1:
            for i in range(1, min(4, len(values))):
                print(f"Row {i}: {values[i]}")

        
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    debug_options()
