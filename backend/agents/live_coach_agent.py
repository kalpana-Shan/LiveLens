import os
import json
import asyncio
from google import genai as genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

SYSTEM_PROMPT = """You are LiveLens, a real-time AI speaking coach.
You listen to the user's speech and observe their posture and gaze signals.
For every coaching response, follow this exact format:
[Observation] + [Why it matters] + [Action verb]

Example:
"Your eye contact dropped during the key point — sustained gaze builds 
trust with your audience — lift your chin and look directly at the camera."

Keep responses under 30 words. Be encouraging, specific, and actionable.
Focus on: eye contact, posture, speech clarity, filler words, pacing."""

async def run_live_coach(
    websocket,
    session_id: str,
    uid: str = "default_user"
):
    print(f"🎙️ LiveCoachAgent started for session: {session_id}")

    config = types.LiveConnectConfig(
        response_modalities=["AUDIO", "TEXT"],
        system_instruction=SYSTEM_PROMPT,
        session_resumption=types.SessionResumptionConfig(handle=session_id),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
            )
        ),
    )

    try:
        async with client.aio.live.connect(
            model="gemini-2.5-flash-native-audio-latest",
            config=config
        ) as live_session:
            print(f"✅ Gemini Live connected for session: {session_id}")

            await websocket.send_text(json.dumps({
                "type": "status",
                "message": "LiveLens coach connected ✅",
                "session_id": session_id
            }))

            async def receive_from_client():
                while True:
                    try:
                        data = await websocket.receive_text()
                        payload = json.loads(data)
                        msg_type = payload.get("type")

                        if msg_type == "audio":
                            # Raw audio bytes from browser (base64)
                            import base64
                            audio_bytes = base64.b64decode(payload["data"])
                            await live_session.send(
                                input=types.LiveClientRealtimeInput(
                                    media_chunks=[types.Blob(
                                        data=audio_bytes,
                                        mime_type="audio/pcm"
                                    )]
                                )
                            )

                        elif msg_type == "signals":
                            # Posture/gaze JSON from MediaPipe
                            signals = payload.get("data", {})
                            signal_text = f"[Posture signals: {json.dumps(signals)}]"
                            await live_session.send(
                                input=types.LiveClientRealtimeInput(
                                    text=signal_text
                                )
                            )

                        elif msg_type == "end_session":
                            print(f"🔚 Session ended: {session_id}")
                            break

                    except Exception as e:
                        print(f"❌ Receive error: {e}")
                        break

            async def send_to_client():
                async for response in live_session.receive():
                    if response.text:
                        await websocket.send_text(json.dumps({
                            "type": "coach_response",
                            "message": response.text,
                            "session_id": session_id
                        }))
                    if response.data:
                        import base64
                        await websocket.send_text(json.dumps({
                            "type": "audio_response",
                            "data": base64.b64encode(response.data).decode(),
                            "session_id": session_id
                        }))

            # Run both directions concurrently
            await asyncio.gather(
                receive_from_client(),
                send_to_client()
            )

    except Exception as e:
        print(f"❌ LiveCoachAgent error: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e)
        }))

