
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
from datetime import datetime, timezone
import os

# Reusing the db connection logic to ensure singleton behavior if possible, 
# or safe re-initialization.
_db = None

def _get_db():
    global _db
    if _db is not None:
        return _db

    try:
        app = firebase_admin.get_app()
    except ValueError:
        # Not initialized
        basedir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cred_path = os.path.join(basedir, 'service_account.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
        elif os.environ.get('FIREBASE_CREDENTIALS'):
            import json
            cred_dict = json.loads(os.environ.get('FIREBASE_CREDENTIALS'))
            cred = credentials.Certificate(cred_dict)
            app = firebase_admin.initialize_app(cred)
        else:
            app = firebase_admin.initialize_app()

    _db = firestore.client()
    return _db

INACTIVITY_TIMEOUT_SECONDS = 15 * 60  # 15 minutes

def register_user_session(email):
    """
    Generates a new session token for the user and saves it to Firestore.
    Overwrites any existing session, effectively invalidating previous devices.
    """
    try:
        db = _get_db()
        token = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # We use the email as the document ID for 'active_sessions'
        # ensuring 1 session per email.
        # Collection: active_sessions
        # Doc: email
        # Fields: token, last_login_at
        
        doc_ref = db.collection('active_sessions').document(email)
        doc_ref.set({
            'token': token,
            'last_login_at': now,
            'last_activity': now,
            'email': email
        })
        
        print(f"[AUTH] New session registered for {email}: {token[-8:]}")
        return {"success": True, "token": token}
        
    except Exception as e:
        print(f"[AUTH ERROR] register_user_session: {e}")
        return {"error": str(e)}

def validate_user_session(email, token):
    """
    Checks if the provided token matches the trusted token in Firestore.
    Also checks for inactivity timeout (15 minutes).
    """
    try:
        db = _get_db()
        doc_ref = db.collection('active_sessions').document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            # No session found ??? implies invalid or expired
            return {"valid": False, "reason": "no_session"}
            
        data = doc.to_dict()
        active_token = data.get('token')
        
        if active_token != token:
            print(f"[AUTH] Token Mismatch for {email}. Incoming: {token[-8:]} | Active: {active_token[-8:]}")
            return {"valid": False, "reason": "token_mismatch"}
        
        # Check inactivity timeout
        last_activity = data.get('last_activity')
        if last_activity:
            elapsed = (datetime.now(timezone.utc) - last_activity).total_seconds()
            if elapsed > INACTIVITY_TIMEOUT_SECONDS:
                print(f"[AUTH] Inactivity timeout for {email}: {elapsed:.0f}s idle")
                # Delete the session so they must re-login
                doc_ref.delete()
                return {"valid": False, "reason": "inactivity_timeout"}
        
        # Token matches and session is active — update last_activity
        doc_ref.update({'last_activity': datetime.now(timezone.utc)})
        return {"valid": True}
            
    except Exception as e:
        print(f"[AUTH ERROR] validate_user_session: {e}")
        return {"error": str(e)}
