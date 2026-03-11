import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def get_grounded_tip(topic: str) -> str:
    """Get a Google Search grounded coaching tip for a specific topic."""
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            ),
            contents=f"Give one specific, actionable public speaking tip about: {topic}. Keep it under 25 words."
        )
        return response.text.strip()
    except Exception as e:
        print(f"❌ Grounding tool error: {e}")
        return f"Focus on improving your {topic} for better audience engagement."
