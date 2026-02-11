
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
from datetime import datetime
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

def register_user_session(email):
    """
    Generates a new session token for the user and saves it to Firestore.
    Overwrites any existing session, effectively invalidating previous devices.
    """
    try:
        db = _get_db()
        token = str(uuid.uuid4())
        
        # We use the email as the document ID for 'active_sessions'
        # ensuring 1 session per email.
        # Collection: active_sessions
        # Doc: email
        # Fields: token, last_login_at
        
        doc_ref = db.collection('active_sessions').document(email)
        doc_ref.set({
            'token': token,
            'last_login_at': datetime.utcnow(),
            'email': email
        })
        
        print(f"[AUTH] New session registered for {email}: {token}")
        return {"success": True, "token": token}
        
    except Exception as e:
        print(f"[AUTH ERROR] register_user_session: {e}")
        return {"error": str(e)}

def validate_user_session(email, token):
    """
    Checks if the provided token matches the trusted token in Firestore.
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
        
        if active_token == token:
            # Update heartbeat/last_seen if needed? 
            # For now just validate.
            return {"valid": True}
        else:
            return {"valid": False, "reason": "token_mismatch"}
            
    except Exception as e:
        print(f"[AUTH ERROR] validate_user_session: {e}")
        return {"error": str(e)}
