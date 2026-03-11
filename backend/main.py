import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI(title="LiveLens Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from agents.live_coach_agent import run_live_coach
from agents.argument_agent import analyze_argument
from agents.orchestrator_agent import route_request
from session_manager import session_manager

@app.get("/")
async def root():
    return {"status": "LiveLens backend is running ✅"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gemini_key_loaded": bool(os.getenv("GEMINI_API_KEY")),
        "firebase_project": os.getenv("FIREBASE_PROJECT_ID"),
    }

@app.post("/session/create")
async def create_session(body: dict = {}):
    uid = body.get("uid", "default_user")
    session_id = session_manager.create_session(uid)
    await session_manager.save(session_id)
    return {"session_id": session_id, "status": "created"}

@app.get("/session/{session_id}")
async def get_session(session_id: str):
    data = session_manager.get(session_id)
    if not data:
        return {"error": "Session not found"}
    return data

@app.post("/analyze/{session_id}")
async def analyze_turn(session_id: str, body: dict):
    transcript = body.get("transcript", "")
    if not transcript:
        return {"error": "No transcript provided"}
    result = await analyze_argument(transcript, session_id)
    return result

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"✅ Client connected: session_id={session_id}")
    try:
        # Load or create session
        existing = session_manager.get(session_id)
        if not existing:
            session_manager.create_session(session_id=session_id)

        # Start LiveCoach directly for real-time coaching
        await run_live_coach(websocket, session_id)

    except WebSocketDisconnect:
        session_manager.end_session(session_id)
        await session_manager.save(session_id)
        print(f"❌ Client disconnected: session_id={session_id}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

