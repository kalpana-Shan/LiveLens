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
    import traceback
    
    gemini_interviewer = None
    
    try:
        # Accept WebSocket connection first
        await websocket.accept()
        print(f"✅ WebSocket accepted: session_id={session_id}")
        
        # Create or get session with the specific session_id from URL
        try:
            existing = session_manager.get(session_id)
            if not existing:
                session_manager.create_session(uid="default_user", session_id=session_id)
                print(f"📝 Created new session: {session_id}")
            else:
                print(f"📝 Using existing session: {session_id}")
        except Exception as e:
            print(f"⚠️ Session creation error (non-fatal): {e}")
            traceback.print_exc()
            # Continue even if session creation fails
        
        # Initialize GeminiInterviewer inside try block to catch initialization errors
        try:
            gemini_interviewer = GeminiInterviewer(session_id)
            print(f"🤖 GeminiInterviewer initialized for session: {session_id}")
        except Exception as e:
            print(f"❌ Failed to initialize GeminiInterviewer: {e}")
            traceback.print_exc()
            # Send error but don't close - allow connection to continue
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Failed to initialize AI interviewer: {str(e)}. Connection will continue but AI features may be limited."
                })
            except:
                pass
            # Don't return - continue with limited functionality
        
        # Send welcome message immediately
        try:
            welcome = {
                "type": "ai_response",
                "content": "Hi there! I'm your AI interviewer for today's Software Engineer position at Google. Why don't you start by telling me a bit about yourself and your experience?",
                "suggestion": "",
                "response_type": "question",
                "search_used": False
            }
            await websocket.send_json(welcome)
            print(f"📤 Sent welcome message to session: {session_id}")
        except Exception as e:
            print(f"❌ Failed to send welcome message: {e}")
            traceback.print_exc()
            # Don't close connection - continue to message loop
        
        # Main message loop
        print(f"🔄 Entering message loop for session: {session_id}")
        while True:
            try:
                # Use receive_text and parse manually for better error handling
                try:
                    raw_data = await websocket.receive_text()
                    data = json.loads(raw_data)
                except json.JSONDecodeError as e:
                    print(f"⚠️ Invalid JSON received: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON format"
                    })
                    continue
                except Exception as e:
                    print(f"⚠️ Error receiving message: {e}")
                    # If we can't receive, connection is likely closed
                    break
                
                print(f"📩 Received: {data.get('type', 'unknown')} from session: {session_id}")
                
                if data.get('type') == 'user_message':
                    user_text = data.get('text', '')
                    if not user_text:
                        print("⚠️ Empty user message received")
                        continue
                    
                    print(f"💬 User said: {user_text}")
                    
                    # Process with Gemini only if initialized
                    if gemini_interviewer is None:
                        await websocket.send_json({
                            "type": "error",
                            "message": "AI interviewer not initialized. Please refresh the page."
                        })
                        continue
                    
                    try:
                        response = await gemini_interviewer.process_message(user_text)
                        
                        # Send response back
                        await websocket.send_json({
                            "type": "ai_response",
                            "content": response.get("content", "Could you tell me more about that?"),
                            "suggestion": response.get("suggestion", ""),
                            "response_type": response.get("type", "question"),
                            "search_used": response.get("search_used", False)
                        })
                        print(f"📤 Sent AI response to session: {session_id}")
                    except Exception as e:
                        print(f"❌ Error processing message with Gemini: {e}")
                        traceback.print_exc()
                        try:
                            await websocket.send_json({
                                "type": "error",
                                "message": f"Error processing your message: {str(e)}"
                            })
                        except:
                            pass
                    
                elif data.get('type') == 'ping':
                    try:
                        await websocket.send_json({"type": "pong"})
                    except:
                        pass
                else:
                    print(f"⚠️ Unknown message type: {data.get('type')}")
                    
            except WebSocketDisconnect:
                print(f"❌ Client disconnected normally: session_id={session_id}")
                break
            except Exception as e:
                print(f"❌ Error in message loop: {e}")
                traceback.print_exc()
                try:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
                except:
                    # WebSocket might be closed, can't send error
                    pass
                # Don't break on error, continue listening unless it's a connection error
                if "connection" in str(e).lower() or "closed" in str(e).lower():
                    break
                    
    except WebSocketDisconnect:
        print(f"❌ Client disconnected: session_id={session_id}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        traceback.print_exc()
        # Try to send error message before closing
        try:
            # Check if websocket is still connected by trying to send
            await websocket.send_json({
                "type": "error",
                "message": f"WebSocket error: {str(e)}"
            })
        except:
            # WebSocket already closed, can't send
            pass
    finally:
        # Cleanup - don't block on save, just log errors
        try:
            session_manager.end_session(session_id)
            # Fire and forget - use ensure_future which is safer than create_task
            # Only create task if event loop is running
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(session_manager.save(session_id))
                else:
                    # If loop is not running, just log that we can't save
                    print(f"⚠️ Event loop not running, skipping session save for {session_id}")
            except RuntimeError:
                # No event loop available
                print(f"⚠️ No event loop available, skipping session save for {session_id}")
            print(f"🧹 Cleaned up session: {session_id}")
        except Exception as e:
            print(f"⚠️ Error during cleanup: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")