import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
from pathlib import Path

# Get Firebase credentials
def get_firebase_creds():
    """Get Firebase credentials from file or environment"""
    
    # Method 1: Try to read from firebase-service-account.json file
    backend_dir = Path(__file__).parent.parent
    firebase_creds_path = backend_dir / "firebase-service-account.json"
    
    if firebase_creds_path.exists():
        print(f"✅ Loading Firebase credentials from: {firebase_creds_path}")
        with open(firebase_creds_path, 'r') as f:
            return json.load(f)
    
    # Method 2: Try environment variable
    creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if creds_json:
        print("✅ Loading Firebase credentials from environment variable")
        return json.loads(creds_json)
    
    # Method 3: Try GOOGLE_APPLICATION_CREDENTIALS path
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path and os.path.exists(creds_path):
        print(f"✅ Loading Firebase credentials from: {creds_path}")
        with open(creds_path, 'r') as f:
            return json.load(f)
    
    # No credentials found
    raise Exception(
        "❌ No Firebase credentials found!\n"
        "Please create one of:\n"
        "1. backend/firebase-service-account.json file\n"
        "2. FIREBASE_SERVICE_ACCOUNT_JSON environment variable\n"
        "3. GOOGLE_APPLICATION_CREDENTIALS pointing to your JSON file"
    )

# Initialize Firebase only once
if not firebase_admin._apps:
    try:
        print("🔄 Initializing Firebase...")
        service_account_info = get_firebase_creds()
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized successfully!")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("⚠️ Continuing without Firebase - data won't be saved!")
        # Create a dummy db that will fail gracefully
        db = None

# Get Firestore client
try:
    db = firestore.client()
except Exception as e:
    print(f"❌ Firestore client creation failed: {e}")
    db = None

async def save_session(session_id: str, uid: str = "default_user", data: dict = None) -> bool:
    """Save session to Firestore"""
    if data is None:
        data = {}
    
    if db is None:
        print("⚠️ Firebase not initialized - skipping save")
        return False
        
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc_ref.set({
            **data,
            "session_id": session_id,
            "uid": uid,
            "updated_at": datetime.utcnow().isoformat()
        }, merge=True)
        print(f"✅ Session saved: {session_id}")
        return True
    except Exception as e:
        print(f"❌ Firestore save error: {e}")
        return False

async def get_session(session_id: str, uid: str = "default_user") -> dict:
    """Get session from Firestore"""
    if db is None:
        print("⚠️ Firebase not initialized - returning empty session")
        return {}
        
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else {}
    except Exception as e:
        print(f"❌ Firestore get error: {e}")
        return {}

async def append_coaching_snippet(session_id: str, uid: str = "default_user", snippet: str = "") -> bool:
    """Append coaching snippet to session"""
    if db is None:
        print("⚠️ Firebase not initialized - skipping snippet")
        return False
        
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc_ref.update({
            "snippets": firestore.ArrayUnion([{
                "text": snippet,
                "timestamp": datetime.utcnow().isoformat()
            }])
        })
        print(f"✅ Snippet added to session: {session_id}")
        return True
    except Exception as e:
        print(f"❌ Firestore append error: {e}")
        return False

async def update_session_metrics(session_id: str, uid: str = "default_user", metrics: dict = None) -> bool:
    """Update session with latest metrics"""
    if db is None or metrics is None:
        return False
        
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc_ref.update({
            "latest_metrics": metrics,
            "last_active": datetime.utcnow().isoformat()
        })
        return True
    except Exception as e:
        print(f"❌ Firestore metrics update error: {e}")
        return False

async def get_user_sessions(uid: str = "default_user", limit: int = 10) -> list:
    """Get recent sessions for a user"""
    if db is None:
        return []
        
    try:
        sessions_ref = db.collection("users").document(uid)\
                        .collection("sessions")\
                        .order_by("updated_at", direction=firestore.Query.DESCENDING)\
                        .limit(limit)
        sessions = sessions_ref.stream()
        return [session.to_dict() for session in sessions]
    except Exception as e:
        print(f"❌ Firestore get user sessions error: {e}")
        return []