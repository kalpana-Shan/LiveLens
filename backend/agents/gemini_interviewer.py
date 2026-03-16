# backend/agents/gemini_interviewer.py
import os
import json
from typing import Dict, Any, List
from google import genai
from google.genai import types

class GeminiInterviewer:
    def __init__(self, session_id: str):
        self.session_id = session_id
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        # Initialize the new client
        self.client = genai.Client(api_key=api_key)
        self.model = 'gemini-1.5-pro'  # Model name as string
        
        self.conversation_history = []
        self.interview_context = {
            "role": "Software Engineer",
            "company": "Google",
            "question_count": 0,
            "topics_discussed": [],
            "user_level": "beginner",
            "last_question": ""
        }
        self.search_ai = None

    async def process_message(self, user_message: str) -> Dict[str, Any]:
        """Process user message and return AI response"""
        
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })
        
        # Check if this is a question
        if self.detect_question_mode(user_message):
            return await self.handle_question_mode(user_message)
        
        # Build prompt
        prompt = self.build_interview_prompt(user_message)
        
        try:
            # Use the async SDK to avoid blocking the event loop
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            result = {
                "type": "question",
                "content": response.text if response.text else "Could you tell me more about that?",
                "suggestion": "",
                "next_topic": "experience",
                "search_used": False
            }
            
            # Add AI response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": result["content"],
                "type": result["type"]
            })
            
            self.interview_context['question_count'] += 1
            
            return result
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return {
                "type": "question",
                "content": "Could you tell me more about that?",
                "suggestion": "",
                "next_topic": "experience",
                "search_used": False
            }

    def build_interview_prompt(self, user_message: str) -> str:
        """Build the interview prompt"""
        history_text = "\n".join([
            f"{'Candidate' if msg['role'] == 'user' else 'Interviewer'}: {msg['content']}"
            for msg in self.conversation_history[-6:]
        ])
        
        return f"""You are an expert AI interviewer conducting a {self.interview_context['role']} interview at {self.interview_context['company']}.

Conversation history:
{history_text}

Candidate just said: "{user_message}"

Respond naturally as an interviewer. Keep your response concise (2-3 sentences)."""

    def detect_question_mode(self, message: str) -> bool:
        """Detect if user is asking a question"""
        message_lower = message.lower()
        
        question_patterns = [
            "how do i", "how to", "what is", "what are", "can you",
            "could you", "help me", "tell me about", "explain",
            "why", "when", "where", "example", "sample"
        ]
        
        if message.strip().endswith('?'):
            return True
        
        for pattern in question_patterns:
            if pattern in message_lower:
                return True
        
        return False

    async def handle_question_mode(self, user_message: str) -> Dict[str, Any]:
        """Handle when user asks a question"""
        
        # Common question responses
        if "tell me about yourself" in user_message.lower():
            return {
                "type": "help",
                "content": "For 'Tell me about yourself', use this structure:\n1. Current role and responsibilities\n2. 2-3 key achievements\n3. Why you're interested in this role\n\nExample: 'I'm a software engineer with 5 years of experience at Amazon, where I led the development of a microservices architecture that improved scalability by 40%. I'm excited about Google's focus on innovation and would love to bring my experience in distributed systems to your team.'",
                "suggestion": "Use the Present-Past-Future framework",
                "search_used": False
            }
        elif "interview questions" in user_message.lower() or "what questions" in user_message.lower():
            return {
                "type": "information",
                "content": "Google Software Engineer interviews typically include:\n1. Coding/Algorithm questions (2 rounds)\n2. System Design (1-2 rounds)\n3. Behavioral questions (1 round)\n4. Googleyness (cultural fit)\n\nFocus on data structures, algorithms, and scalable system design.",
                "suggestion": "Practice on LeetCode and read System Design Interview books",
                "search_used": False
            }
        elif "google's culture" in user_message.lower() or "about google" in user_message.lower():
            return {
                "type": "information",
                "content": "Google's culture emphasizes:\n- Innovation and moonshot thinking\n- Collaboration and psychological safety\n- Technical excellence\n- Diversity and inclusion\n- 'Googleyness' - being humble, conscientious, and having fun\n\nThey look for candidates who embody these values.",
                "suggestion": "Research Google's 'Ten things we know to be true'",
                "search_used": False
            }
        else:
            return {
                "type": "answer",
                "content": "That's a great question. For behavioral questions, use the STAR method: Situation, Task, Action, Result. Think of a specific example and walk through each part clearly.",
                "suggestion": "STAR method",
                "search_used": False
            }

    async def process_with_search(self, user_message: str) -> Dict[str, Any]:
        """Placeholder for search functionality"""
        return await self.process_message(user_message)

    def get_answer_help(self, question: str) -> str:
        """Get help for answering a specific question"""
        if "tell me about yourself" in question.lower():
            return "Use the Present-Past-Future framework: Start with your current role, then relevant past experience, then why you're excited about this opportunity."
        else:
            return "Use the STAR method: Situation, Task, Action, Result. Be specific about your role and the impact you made."