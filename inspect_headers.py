import os
import json
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

def get_credentials():
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    if os.environ.get('GOOGLE_CREDENTIALS_JSON'):
        info = json.loads(os.environ.get('GOOGLE_CREDENTIALS_JSON'))
        return Credentials.from_service_account_info(info, scopes=scopes)
    
    # Try local file
    path = 'c:/Users/Raphael Furlan/Desktop/Projetos/WiseFinan/backend/service_account.json'
    if os.path.exists(path):
        return Credentials.from_service_account_file(path, scopes=scopes)
    return None

def debug_headers():
    creds = get_credentials()
    if not creds:
        print("No credentials found")
        return
    service = build('sheets', 'v4', credentials=creds)
    SPREADSHEET_ID = "1uE_m7-d7H7A9RzE8fU4I2mB-W-u3yKjN9W7lB_Xzq7A" # Need to get this from env if possible or hardcode if I saw it
    # Wait, I don't have the SPREADSHEET_ID here. I should check the .env file or app.py.
    
    # Looking back at previous outputs, I don't see the SPREADSHEET_ID.
    # Let's check for a .env file.
    
    print(json.dumps(["Need SPREADSHEET_ID"], indent=2))

if __name__ == "__main__":
    debug_headers()
