# backend/agents/gemini_interviewer.py
import os
import json
from typing import Dict, Any, List
from google import genai

class GeminiInterviewer:
    def __init__(self, session_id: str):
        self.session_id = session_id
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        
        self.client = genai.Client(api_key=api_key)
        self.model = 'models/gemini-2.5-flash'  # HARDCODED - WORKS!
        print(f"✅ Using Gemini model: {self.model}")
        
        self.conversation_history = []
        self.interview_context = {
            "role": "Software Engineer",
            "company": "Google",
            "question_count": 0,
        }

    async def process_message(self, user_message: str) -> Dict[str, Any]:
        """Process user message and return AI response"""
        
        # Add to history
        self.conversation_history.append({"role": "user", "content": user_message})
        
        # Simple prompt
        prompt = f"""You are an AI interviewer at Google. The candidate said: "{user_message}"
        
Respond naturally with 1-2 sentences. Ask a relevant follow-up question."""

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            result = {
                "type": "ai_response",  # IMPORTANT: must match frontend
                "content": response.text if response.text else "Tell me more about that."
            }
            
            # Add to history
            self.conversation_history.append({"role": "assistant", "content": result["content"]})
            
            return result
            
        except Exception as e:
            print(f"❌ Gemini error: {e}")
            return {
                "type": "ai_response",
                "content": "That's interesting. Can you elaborate?"
            } 