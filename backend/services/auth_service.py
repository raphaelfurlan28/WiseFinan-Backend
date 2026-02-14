
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
from datetime import datetime, timezone
import os

_db = None

def _get_db():
    global _db
    if _db is not None:
        return _db

    try:
        app = firebase_admin.get_app()
    except ValueError:
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

def register_user_session(email, device_id=None):
    """
    Generates a new session token for the user and saves it to Firestore.
    If user has an authorized_device, only that device can register a session.
    If no authorized_device exists yet, the current device_id becomes authorized.
    """
    try:
        db = _get_db()
        now = datetime.now(timezone.utc)
        
        doc_ref = db.collection('active_sessions').document(email)
        doc = doc_ref.get()
        
        # Check device authorization
        if device_id and doc.exists:
            data = doc.to_dict()
            authorized_device = data.get('authorized_device')
            
            if authorized_device and authorized_device != device_id:
                print(f"[AUTH] Device rejected for {email}. Incoming: {device_id[-8:]} | Authorized: {authorized_device[-8:]}")
                return {"error": "device_not_authorized", "message": "Este dispositivo não está autorizado para esta conta."}
        
        token = str(uuid.uuid4())
        
        session_data = {
            'token': token,
            'last_login_at': now,
            'last_activity': now,
            'email': email
        }
        
        # Bind device on first login or keep existing binding
        if device_id:
            if doc.exists:
                existing = doc.to_dict()
                session_data['authorized_device'] = existing.get('authorized_device') or device_id
            else:
                session_data['authorized_device'] = device_id
        
        doc_ref.set(session_data)
        
        print(f"[AUTH] Session registered for {email}: token={token[-8:]}, device={device_id[-8:] if device_id else 'none'}")
        return {"success": True, "token": token}
        
    except Exception as e:
        print(f"[AUTH ERROR] register_user_session: {e}")
        return {"error": str(e)}

def validate_user_session(email, token, device_id=None):
    """
    Checks token + device_id + inactivity timeout.
    """
    try:
        db = _get_db()
        doc_ref = db.collection('active_sessions').document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"valid": False, "reason": "no_session"}
            
        data = doc.to_dict()
        active_token = data.get('token')
        
        # Check token
        if active_token != token:
            print(f"[AUTH] Token Mismatch for {email}. Incoming: {token[-8:]} | Active: {active_token[-8:]}")
            return {"valid": False, "reason": "token_mismatch"}
        
        # Check device
        if device_id:
            authorized_device = data.get('authorized_device')
            if authorized_device and authorized_device != device_id:
                print(f"[AUTH] Device Mismatch for {email}. Incoming: {device_id[-8:]} | Authorized: {authorized_device[-8:]}")
                return {"valid": False, "reason": "device_not_authorized"}
        
        # Check inactivity timeout
        last_activity = data.get('last_activity')
        if last_activity:
            elapsed = (datetime.now(timezone.utc) - last_activity).total_seconds()
            # REMOVED AUTO-LOGOUT PER USER REQUEST
            # if elapsed > INACTIVITY_TIMEOUT_SECONDS:
            #     print(f"[AUTH] Inactivity timeout for {email}: {elapsed:.0f}s idle")
            #     doc_ref.delete()
            #     return {"valid": False, "reason": "inactivity_timeout"}
        
        # All checks passed — update last_activity
        doc_ref.update({'last_activity': datetime.now(timezone.utc)})
        return {"valid": True}
            
    except Exception as e:
        print(f"[AUTH ERROR] validate_user_session: {e}")
        return {"error": str(e)}

def reset_device_binding(email):
    """
    Clears the authorized_device for a user, allowing them to login from a new device.
    """
    try:
        db = _get_db()
        doc_ref = db.collection('active_sessions').document(email)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"success": True, "message": "No active session found, device binding cleared."}
        
        doc_ref.update({'authorized_device': firestore.DELETE_FIELD})
        print(f"[AUTH] Device binding reset for {email}")
        return {"success": True, "message": f"Device binding reset for {email}. Next login will bind to new device."}
        
    except Exception as e:
        print(f"[AUTH ERROR] reset_device_binding: {e}")
        return {"error": str(e)}
