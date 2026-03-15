import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

load_dotenv()
# Add this right after load_dotenv() in main.py
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
from agents.interview_agent import InterviewAgent  # NEW IMPORT
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
    mode = body.get("mode", "live_coach")  # NEW: support different modes
    session_id = session_manager.create_session(uid)
    
    # Store mode in session
    session = session_manager.get(session_id)
    session["mode"] = mode
    session_manager.sessions[session_id] = session
    
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
    
    # Store interview agent instance if needed
    interview_agent = None
    
    try:
        # Load or create session
        existing = session_manager.get(session_id)
        if not existing:
            session_manager.create_session(session_id=session_id)
            existing = session_manager.get(session_id)
        
        # Get mode from session (default to live_coach)
        mode = existing.get("mode", "live_coach")
        print(f"🎯 Mode: {mode}")
        
        # Handle different modes
        while True:
            data = await websocket.receive_json()
            print(f"📩 Received: {data.get('type', 'unknown')}")
            
            # Route based on message type
            if data['type'] == 'start_interview':
                # Initialize interview agent
                interview_agent = InterviewAgent(session_id)
                response = await interview_agent.start_interview(
                    data['payload']['company'],
                    data['payload']['role']
                )
                await websocket.send_json(response)
                
            elif data['type'] == 'interview_response':
                if interview_agent:
                    response = await interview_agent.process_response(
                        data['payload']['response'],
                        data['payload']['metrics']
                    )
                    await websocket.send_json(response)
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Interview not started"
                    })
                    
            elif data['type'] == 'live_coach':
                # Original live coach functionality
                await run_live_coach(websocket, session_id, data)
                
            else:
                # Default to orchestrator for other types
                response = await route_request(data, session_id)
                await websocket.send_json(response)

    except WebSocketDisconnect:
        session_manager.end_session(session_id)
        await session_manager.save(session_id)
        print(f"❌ Client disconnected: session_id={session_id}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")