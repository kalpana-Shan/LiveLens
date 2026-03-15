# backend/agents/gemini_interviewer.py
import os
import json
import google.generativeai as genai
from typing import List, Dict, Any

class GeminiInterviewer:
    def __init__(self, session_id: str):
        self.session_id = session_id
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        self.conversation_history = []
        self.interview_context = {
            "role": "Software Engineer",
            "company": "Google",
            "question_count": 0,
            "topics_discussed": [],
            "user_level": "beginner",  # Will be inferred
            "last_question": ""
        }

    def build_system_prompt(self) -> str:
        """Create the system prompt for Gemini"""
        return f"""You are an expert AI interviewer conducting a {self.interview_context['role']} interview at {self.interview_context['company']}.

YOUR PERSONALITY:
- Professional but friendly
- Adapt to candidate's skill level
- Helpful when candidate is stuck
- Natural conversational flow

YOUR CAPABILITIES:
1. Ask relevant interview questions based on the role
2. Provide guidance when candidate asks for help
3. Answer candidate's questions about the interview process
4. Remember what was already discussed
5. Suggest improvements for answers

RULES:
- Never repeat the same question
- If candidate asks "how do I answer this?", provide a framework and example
- If candidate seems confused, offer clarification
- Keep responses concise (2-3 sentences normally, longer when helping)
- Acknowledge what the candidate just said before asking new question

Current interview stage: Question #{self.interview_context['question_count'] + 1}
Topics discussed so far: {', '.join(self.interview_context['topics_discussed']) if self.interview_context['topics_discussed'] else 'None yet'}

Respond naturally as an interviewer would."""
    
    async def process_message(self, user_message: str) -> Dict[str, Any]:
        """Process user message and return AI response"""
        
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Build the full prompt with context
        prompt = f"""
{self.build_system_prompt()}

CONVERSATION HISTORY:
{self.format_history()}

USER JUST SAID: "{user_message}"

First, analyze what the user needs:
1. Are they answering a question?
2. Are they asking for help on how to answer?
3. Are they asking a general question about interviews/technology?
4. Are they confused or stuck?

Then respond appropriately.

YOUR RESPONSE (as JSON):
{{
    "type": "question" | "help" | "answer" | "clarification",
    "content": "your actual response text",
    "suggestion": "optional tip or framework",
    "next_topic": "what to discuss next"
}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            result = self.parse_response(response.text)
            
            # Add AI response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": result.get("content", ""),
                "type": result.get("type", "question")
            })
            
            # Update context
            self.interview_context['question_count'] += 1
            if result.get("next_topic"):
                self.interview_context['topics_discussed'].append(result["next_topic"])
            
            return result
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return {
                "type": "question",
                "content": "Could you tell me more about that?",
                "suggestion": "",
                "next_topic": "experience"
            }
    
    def format_history(self) -> str:
        """Format conversation history for prompt"""
        formatted = []
        for msg in self.conversation_history[-6:]:  # Last 6 messages for context
            role = "Candidate" if msg["role"] == "user" else "Interviewer"
            formatted.append(f"{role}: {msg['content']}")
        return "\n".join(formatted)
    
    def parse_response(self, text: str) -> Dict[str, Any]:
        """Parse Gemini response to extract JSON"""
        try:
            # Find JSON in response
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except:
            pass
        
        # Fallback
        return {
            "type": "question",
            "content": text[:200],
            "suggestion": "",
            "next_topic": "experience"
        }

    def get_answer_help(self, question: str) -> str:
        """Provide help on how to answer a specific question"""
        help_prompt = f"""
The candidate is struggling with this interview question: "{question}"

Provide:
1. A framework to structure the answer (like STAR method)
2. Key points they should include
3. A short example answer

Keep it helpful and encouraging.
"""
        try:
            response = self.model.generate_content(help_prompt)
            return response.text
        except:
            return "Try using the STAR method: Describe the Situation, Task, Action, and Result. Think of a specific example from your experience."