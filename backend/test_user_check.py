from services.sheets import check_user_allowed
import sys
import os

# Ensure we can import from parent/current dir
sys.path.append(os.getcwd())

print("Testing User Check...")
email = "raphaelfurlan28@gmail.com"
try:
    user = check_user_allowed(email)
    if user:
        print(f"SUCCESS: User found: {user}")
    else:
        print(f"FAILURE: User '{email}' not found in sheet.")
except Exception as e:
    print(f"CRITICAL ERROR: {str(e)}")
