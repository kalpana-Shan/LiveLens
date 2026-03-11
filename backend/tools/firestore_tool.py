import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase only once
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    firebase_admin.initialize_app(cred)

db = firestore.client()

async def save_session(session_id: str, uid: str, data: dict) -> bool:
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc_ref.set({
            **data,
            "updated_at": datetime.utcnow().isoformat()
        }, merge=True)
        return True
    except Exception as e:
        print(f"❌ Firestore save error: {e}")
        return False

async def get_session(session_id: str, uid: str) -> dict:
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else {}
    except Exception as e:
        print(f"❌ Firestore get error: {e}")
        return {}

async def append_coaching_snippet(session_id: str, uid: str, snippet: str) -> bool:
    try:
        doc_ref = db.collection("users").document(uid)\
                    .collection("sessions").document(session_id)
        doc_ref.update({
            "snippets": firestore.ArrayUnion([{
                "text": snippet,
                "timestamp": datetime.utcnow().isoformat()
            }])
        })
        return True
    except Exception as e:
        print(f"❌ Firestore append error: {e}")
        return False
