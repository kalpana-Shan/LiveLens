import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

ARGUMENT_SYSTEM_PROMPT = """You are LiveLens Argument Analyzer.
You analyze a speaker's completed turn of speech for argument quality.

Score and analyze these 4 dimensions:
1. CLARITY (0-10): How clear and understandable was the argument?
2. STRUCTURE (0-10): Did it have a logical flow — claim, evidence, conclusion?
3. EVIDENCE (0-10): Were claims supported with facts, examples, or data?
4. PERSUASION (0-10): How compelling and convincing was the delivery?

Always respond in this exact JSON format:
{
  "scores": {
    "clarity": 0,
    "structure": 0,
    "evidence": 0,
    "persuasion": 0,
    "overall": 0
  },
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "one_line_summary": "One sentence summary of the argument quality"
}"""

async def analyze_argument(
    transcript: str,
    session_id: str,
    uid: str = "default_user"
) -> dict:
    print(f"🧠 ArgumentAgent analyzing turn for session: {session_id}")

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=ARGUMENT_SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.3,
            ),
            contents=f"Analyze this speech turn:\n\n{transcript}"
        )

        result = json.loads(response.text)
        print(f"✅ Argument analysis complete: {result.get('scores', {})}")
        return result

    except json.JSONDecodeError:
        print("⚠️ Could not parse JSON response — returning raw text")
        return {
            "scores": {
                "clarity": 0, "structure": 0,
                "evidence": 0, "persuasion": 0, "overall": 0
            },
            "strengths": [],
            "improvements": ["Could not analyze this turn"],
            "one_line_summary": response.text
        }

    except Exception as e:
        print(f"❌ ArgumentAgent error: {e}")
        return {
            "error": str(e),
            "scores": {
                "clarity": 0, "structure": 0,
                "evidence": 0, "persuasion": 0, "overall": 0
            },
            "strengths": [],
            "improvements": [],
            "one_line_summary": "Analysis failed"
        }
