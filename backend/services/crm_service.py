"""
CRM Service — Firestore-based Lead Management
Handles CRUD operations for subscription leads stored in Cloud Firestore.
"""

import firebase_admin
from firebase_admin import credentials, firestore
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
    return _db


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


def get_all_leads():
    """
    Retrieves all leads from Firestore, ordered by created_at descending.
    
    Returns:
        list of lead dicts (with 'id' field included)
    """
    try:
        db = _get_db()
        
        docs = db.collection('leads').order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        leads = []
        for doc in docs:
            lead = doc.to_dict()
            lead['id'] = doc.id
            
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
