import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import json

# Ensure we can import dotenv
try:
    from dotenv import load_dotenv
    # Load .env from current directory or parent
    if os.path.exists('.env'):
        load_dotenv('.env')
    elif os.path.exists('../.env'):
        load_dotenv('../.env')
except ImportError:
    pass

SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
SERVICE_ACCOUNT_FILE = 'service_account.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

def debug():
    print(f"Spreadsheet ID: {SPREADSHEET_ID}")
    
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print("Service account file not found in current directory!")
        return

    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)
    
    # Read BASE Headers
    try:
        res = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, range="BASE!1:2").execute()
    except Exception as e:
        print(f"Error fetching: {e}")
        return

    vals = res.get('values', [])
    if not vals:
        print("No data in BASE!1:2")
        return

    headers = vals[0]
    print(f"--- BASE Headers ({len(headers)}) ---")
    for i, h in enumerate(headers):
        print(f"{i}: {h}")

    if len(vals) > 1:
        print("\n--- First Row Data ---")
        row = vals[1]
        for i, val in enumerate(row):
            h = headers[i] if i < len(headers) else "UNKNOWN"
            print(f"{h} ({i}): [{val}]")

if __name__ == '__main__':
    debug()
