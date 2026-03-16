# backend/main.py
import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

load_dotenv()
print("🔑 GEMINI_API_KEY loaded:", bool(os.getenv("GOOGLE_API_KEY")))
print("🔥 FIREBASE_PROJECT_ID:", os.getenv("FIREBASE_PROJECT_ID"))

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
from agents.gemini_interviewer import GeminiInterviewer
from session_manager import session_manager

@app.get("/")
async def root():
    return {"status": "LiveLens backend is running ✅"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gemini_key_loaded": bool(os.getenv("GOOGLE_API_KEY")),
        "firebase_project": os.getenv("FIREBASE_PROJECT_ID"),
    }

@app.post("/session/create")
async def create_session(body: dict = {}):
    uid = body.get("uid", "default_user")
    mode = body.get("mode", "live_coach")
    session_id = session_manager.create_session(uid)
    
    # Store mode in session
    session = session_manager.get(session_id)
    session["mode"] = mode
    
    await session_manager.save(session_id)
    return {"session_id": session_id, "status": "created", "mode": mode}

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
    
    # Store interview agent instance
    gemini_interviewer = GeminiInterviewer(session_id)
    
    try:
        # Create or get session
        existing = session_manager.get(session_id)
        if not existing:
            # Don't pass session_id parameter
            session_manager.create_session(uid="default_user")
        
        # Send welcome message immediately
        welcome = {
            "type": "ai_response",
            "content": "Hi there! I'm your AI interviewer for today's Software Engineer position at Google. Why don't you start by telling me a bit about yourself and your experience?",
            "suggestion": "",
            "response_type": "question",
            "search_used": False
        }
        await websocket.send_json(welcome)
        
        while True:
            try:
                data = await websocket.receive_json()
                print(f"📩 Received: {data.get('type', 'unknown')}")
                
                if data['type'] == 'user_message':
                    user_text = data.get('text', '')
                    print(f"💬 User said: {user_text}")
                    
                    # Process with Gemini
                    response = await gemini_interviewer.process_message(user_text)
                    
                    # Send response back
                    await websocket.send_json({
                        "type": "ai_response",
                        "content": response.get("content", "Could you tell me more about that?"),
                        "suggestion": response.get("suggestion", ""),
                        "response_type": response.get("type", "question"),
                        "search_used": response.get("search_used", False)
                    })
                    
                elif data['type'] == 'ping':
                    await websocket.send_json({"type": "pong"})
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error processing message: {e}")
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
                except:
                    pass
                    
    except WebSocketDisconnect:
        print(f"❌ Client disconnected: session_id={session_id}")
        session_manager.end_session(session_id)
        await session_manager.save(session_id)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")