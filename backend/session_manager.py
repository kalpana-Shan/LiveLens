# backend/session_manager.py
import os
import uuid
from datetime import datetime
from tools.firestore_tool import save_session, get_session, append_coaching_snippet

class SessionManager:
    def __init__(self):
        self.active_sessions: dict = {}

    def create_session(self, uid: str = "default_user", session_id: str = None) -> str:
        if session_id is None:
            session_id = str(uuid.uuid4())[:8]
        
        # Only create if it doesn't exist
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = {
                "uid": uid,
                "session_id": session_id,
                "started_at": datetime.utcnow().isoformat(),
                "status": "active",
                "snippets": [],
                "turn_count": 0
            }
            print(f"✅ Session created: {session_id} for uid: {uid}")
        else:
            print(f"ℹ️ Session already exists: {session_id}")
        return session_id

    def get_session_by_id(self, session_id: str) -> dict:
        """Get session by ID (for WebSocket connections)"""
        return self.active_sessions.get(session_id, {})

    async def save(self, session_id: str) -> bool:
        session = self.active_sessions.get(session_id)
        if not session:
            return False
        uid = session.get("uid", "default_user")
        return await save_session(session_id, uid, session)

    async def load(self, session_id: str, uid: str = "default_user") -> dict:
        data = await get_session(session_id, uid)
        if data:
            self.active_sessions[session_id] = data
        return data

    async def add_snippet(self, session_id: str, snippet: str):
        session = self.active_sessions.get(session_id)
        if session:
            session["snippets"].append({
                "text": snippet,
                "timestamp": datetime.utcnow().isoformat()
            })
            uid = session.get("uid", "default_user")
            await append_coaching_snippet(session_id, uid, snippet)

    def increment_turn(self, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["turn_count"] += 1

    def end_session(self, session_id: str):
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["status"] = "ended"
            self.active_sessions[session_id]["ended_at"] = datetime.utcnow().isoformat()
            print(f"🔚 Session ended: {session_id}")

    def get(self, session_id: str) -> dict:
        return self.active_sessions.get(session_id, {})

# Global instance
session_manager = SessionManager()