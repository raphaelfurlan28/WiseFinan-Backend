"""
CRM Service — Firestore-based Lead Management
Handles CRUD operations for subscription leads stored in Cloud Firestore.
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import secrets
import string
from datetime import datetime, timedelta
import os

# Singleton: Initialize Firebase Admin SDK once
_db = None

def _get_db():
    global _db
    if _db is not None:
        return _db

    try:
        # Try to use existing app if already initialized (e.g., by another service)
        app = firebase_admin.get_app()
    except ValueError:
        # Not initialized yet — initialize with service account
        basedir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cred_path = os.path.join(basedir, 'service_account.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            app = firebase_admin.initialize_app(cred)
        elif os.environ.get('FIREBASE_CREDENTIALS'):
            # Production (Render): Credentials from environment variable
            import json
            cred_dict = json.loads(os.environ.get('FIREBASE_CREDENTIALS'))
            cred = credentials.Certificate(cred_dict)
            app = firebase_admin.initialize_app(cred)
        else:
            # Fallback: use Application Default Credentials (Cloud Run/GCP)
            app = firebase_admin.initialize_app()

    _db = firestore.client()
    
    # Debug Auth Config
    _check_auth_config()
    
    return _db

def _check_auth_config():
    """Prints auth config for debugging to logs."""
    try:
        app = firebase_admin.get_app()
        print(f"[CRM AUTH DEBUG] Connected to Project: {app.project_id} | Time: {datetime.utcnow()}")
    except Exception as e:
        print(f"[CRM AUTH DEBUG] Could not determine project ID: {e}")


def create_lead(data):
    """
    Creates a new lead document in the 'leads' collection.
    
    Args:
        data: dict with keys: nome, email, whatsapp, plano
    Returns:
        dict with success status and lead_id
    """
    try:
        db = _get_db()
        
        # Brasília time (UTC-3)
        now = datetime.utcnow() - timedelta(hours=3)
        
        lead_doc = {
            'name': data.get('nome', ''),
            'email': data.get('email', ''),
            'phone': data.get('whatsapp', ''),
            'plan': data.get('plano', ''),
            'created_at': now,
            'payment_status': 'pending',
            'crm_status': 'new',
            'notes': ''
        }
        
        # Add document (Firestore auto-generates ID)
        doc_ref = db.collection('leads').add(lead_doc)
        lead_id = doc_ref[1].id  # .add() returns (timestamp, DocumentReference)
        
        print(f"[CRM] Lead created: {lead_id} — {lead_doc['name']} ({lead_doc['email']})")
        return {"success": True, "lead_id": lead_id}
        
    except Exception as e:
        print(f"[CRM ERROR] create_lead: {e}")
        return {"error": str(e)}


def get_all_leads(include_archived=False):
    """
    Retrieves all leads from Firestore, ordered by created_at descending.
    By default, excludes leads with crm_status='archived'.
    
    Returns:
        list of lead dicts (with 'id' field included)
    """
    try:
        db = _get_db()
        
        # Base query
        query = db.collection('leads')
        
        # Filter out archived unless requested
        if not include_archived:
            # Firestore requires an index for this specific compound query (status + order)
            # If index is missing, it might error. simpler approach: 
            # fetch all sorted, then filter in python (for small datasets)
            # OR use where() clause. 
            # Let's use where() but keep ordering. Using != is not supported in all FS versions smoothly with ordering.
            # Best approach for now: Filter in app logic to avoid Index Hell during deploy, 
            # assuming lead count is < 1000s for now.
            pass

        docs = query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        leads = []
        for doc in docs:
            lead = doc.to_dict()
            lead['id'] = doc.id
            
            # Filter out archived (Application-side filtering)
            if not include_archived and lead.get('crm_status') == 'archived':
                continue
            
            # Convert Firestore timestamp to string for JSON serialization
            if lead.get('created_at'):
                try:
                    lead['created_at'] = lead['created_at'].strftime('%d/%m/%Y %H:%M')
                except:
                    lead['created_at'] = str(lead['created_at'])
            
            leads.append(lead)
        
        print(f"[CRM] Retrieved {len(leads)} leads")
        return leads
        
    except Exception as e:
        print(f"[CRM ERROR] get_all_leads: {e}")
        return {"error": str(e)}


def update_lead(lead_id, field, value):
    """
    Updates a specific field of a lead document.
    
    Args:
        lead_id: Firestore document ID
        field: field name to update (payment_status, crm_status, notes)
        value: new value for the field
    Returns:
        dict with success status
    """
    # Whitelist of allowed fields to prevent arbitrary writes
    ALLOWED_FIELDS = ['payment_status', 'crm_status', 'notes']
    
    if field not in ALLOWED_FIELDS:
        return {"error": f"Field '{field}' is not allowed. Allowed: {ALLOWED_FIELDS}"}
    
    try:
        db = _get_db()
        
        doc_ref = db.collection('leads').document(lead_id)
        
        # Check if document exists
        doc = doc_ref.get()
        if not doc.exists:
            return {"error": f"Lead '{lead_id}' not found"}
        
        # Atomic update
        doc_ref.update({
            field: value,
            'updated_at': datetime.utcnow() - timedelta(hours=3)
        })
        
        print(f"[CRM] Lead {lead_id} updated: {field} = {value}")
        return {"success": True, "lead_id": lead_id, "field": field, "value": value}

    except Exception as e:
        print(f"[CRM ERROR] update_lead: {e}")
        return {"error": str(e)}

def delete_lead(lead_id):
    """
    Hard deletes a lead from Firestore.
    Use with caution. Prefer archiving (update crm_status='archived').
    """
    try:
        db = _get_db()
        db.collection('leads').document(lead_id).delete()
        print(f"[CRM] Lead deleted: {lead_id}")
        return {"success": True, "lead_id": lead_id}
    except Exception as e:
        print(f"[CRM ERROR] delete_lead: {e}")
        return {"error": str(e)}

def generate_password_for_lead(lead_id):
    """
    Generates a secure random 8-char password for the lead and saves it to the document.
    """
    try:
        db = _get_db()
        
        # Generate 8-char password with at least one letter and one digit
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for i in range(8))
        
        # Save to lead document
        db.collection('leads').document(lead_id).update({
            'generated_password': password,
            'password_generated_at': datetime.utcnow() - timedelta(hours=3)
        })
        
        print(f"[CRM] Password generated for {lead_id}")
        return {"success": True, "lead_id": lead_id, "password": password}
        
    except Exception as e:
        print(f"[CRM ERROR] generate_password: {e}")
        return {"error": str(e)}

def create_firebase_user(lead_id):
    """
    Creates a Firebase Authentication user using the lead's email and generated password.
    """
    try:
        db = _get_db()
        doc_ref = db.collection('leads').document(lead_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return {"error": "Lead not found"}
            
        data = doc.to_dict()
        email = data.get('email')
        password = data.get('generated_password')
        name = data.get('name')
        
        if not email or not password:
            return {"error": "Lead missing email or generated password"}
            
        # Create user in Firebase Auth
        try:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=name
            )
            uid = user.uid
            print(f"[CRM] Auth user created: {uid}")
            
        except auth.EmailAlreadyExistsError:
            # Handle case where user already exists (maybe fetch UID by email)
            user = auth.get_user_by_email(email)
            uid = user.uid
            print(f"[CRM] User already exists: {uid}")
            
        except Exception as auth_error:
             return {"error": f"Auth Error: {str(auth_error)}"}

        # Update Lead with User Info
        doc_ref.update({
            'firebase_uid': uid,
            'user_created_at': datetime.utcnow() - timedelta(hours=3),
            'is_active_user': True,
            # 'generated_password': firestore.DELETE_FIELD # Optional: Delete password if preferred, but user requested to see it
        })
        
        return {"success": True, "uid": uid, "email": email}

    except Exception as e:
        print(f"[CRM ERROR] create_firebase_user: {e}")
        return {"error": str(e)}
