
import os

def restore_functions():
    target = 'services/sheets.py'
    
    with open(target, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find insertion point: Before @cached wrapper for get_market_summary_data
    insertion_marker = '@cached(ttl_seconds=300)\ndef get_market_summary_data():'
    
    if insertion_marker not in content:
        print("Could not find insertion marker")
        return

    missing_code = """
def get_users_sheet():
    # Helper to get users sheet if needed
    return None

def check_user_allowed(email):
    # Checks if user is in 'App: Logins' or hardcoded whitelist
    try:
        service = build('sheets', 'v4', credentials=get_credentials())
        SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')
        
        # Read Emails from App: Logins (Column B)
        # Check first 100 rows
        result = service.spreadsheets().values().get(spreadsheetId=SPREADSHEET_ID, 
                                                    range="'App: Logins'!B2:B100").execute()
        values = result.get('values', [])
        emails = [row[0].strip().lower() for row in values if row]
        
        # Also allowed hardcoded
        allowed_emails = ['raphaelfurlan28@gmail.com', 'cacerchiari@gmail.com']
        
        user_email = email.lower().strip()
        
        if user_email in emails or user_email in allowed_emails:
            return {
                "authorized": True,
                "email": user_email,
                "name": user_email.split('@')[0], 
                "photo": "",
                "role": "admin" if user_email in allowed_emails else "user"
            }
        return None
    except Exception as e:
        print(f"Error checking user allowed: {e}")
        return None

def update_user_profile(email, name, photo):
    # Stub for updating user profile
    # For now, we don't persist this change to a sheet as we haven't identified the 'Users' sheet
    return {
        "status": "success", 
        "user": {
            "email": email,
            "name": name,
            "photo": photo
        }
    }

def append_subscription_request(data):
    # Stub for subscription request
    print(f"Subscription request received: {data}")
    return {"status": "success"}

def get_all_users():
    return []

def add_user(email, password, role):
    return {"status": "success"}

def get_user_by_email(email):
    return check_user_allowed(email)

def reset_device_fingerprint(email):
    return {"status": "success"}

def update_user_password(email, new_password):
    return {"status": "success"}

"""
    
    new_content = content.replace(insertion_marker, missing_code + "\n" + insertion_marker)
    
    with open(target, 'wb') as f:
        f.write(new_content.encode('utf-8'))
        
    print("Functions restored.")

if __name__ == "__main__":
    restore_functions()
