import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
from agents.live_coach_agent import run_live_coach
from agents.argument_agent import analyze_argument

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

ORCHESTRATOR_PROMPT = """You are the LiveLens Orchestrator.
You decide which agent should handle the current situation:

- LIVE_COACH: User is actively speaking, needs real-time posture/speech feedback
- ARGUMENT_AGENT: User finished a turn, needs deep argument quality analysis
- IDLE: No active speech detected

Respond with only one word: LIVE_COACH, ARGUMENT_AGENT, or IDLE."""

async def route_request(
    websocket,
    session_id: str,
    payload: dict,
    uid: str = "default_user"
):
    msg_type = payload.get("type")
    print(f"🔀 Orchestrator routing: {msg_type} for session {session_id}")

    # Route based on message type
    if msg_type in ["audio", "signals"]:
        # Active speech — send to LiveCoachAgent
        await run_live_coach(websocket, session_id, uid)

    elif msg_type == "end_turn":
        # Turn ended — send transcript to ArgumentAgent
        transcript = payload.get("transcript", "")
        if transcript:
            result = await analyze_argument(transcript, session_id, uid)
            await websocket.send_text(json.dumps({
                "type": "argument_analysis",
                "data": result,
                "session_id": session_id
            }))
        else:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "No transcript provided for analysis"
            }))

    elif msg_type == "ping":
        await websocket.send_text(json.dumps({
            "type": "pong",
            "session_id": session_id
        }))

    else:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Unknown message type: {msg_type}"
        }))
