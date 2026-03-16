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
        
        # Try to find a working model
        self.model = self._find_working_model()
        print(f"✅ Using Gemini model: {self.model}")
        
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

    def _find_working_model(self) -> str:
        """Find a working Gemini model by querying the API"""
        try:
            # First, list available models
            models = self.client.models.list()
            print("📋 Available models from API:")
            
            # Priority order - try these first
            preferred_models = [
                'models/gemini-2.5-pro',
                'models/gemini-2.5-flash',
                'models/gemini-2.0-flash',
                'models/gemini-2.0-flash-001',
                'models/gemini-2.0-flash-lite-001'
            ]
            
            # Store all gemini models for later use
            gemini_models = []
            for model in models:
                model_name = model.name
                print(f"  - {model_name}")
                if 'gemini' in model_name.lower():
                    gemini_models.append(model_name)
            
            # Check preferred models first
            for model_name in preferred_models:
                try:
                    print(f"  Testing preferred model: {model_name}")
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents="test"
                    )
                    if response and response.text:
                        print(f"  ✅ Using model: {model_name}")
                        return model_name
                except Exception as e:
                    print(f"  ❌ {model_name} failed: {str(e)[:100]}")
                    continue
            
            # If none of preferred work, try all available gemini models
            for model_name in gemini_models:
                try:
                    print(f"  Testing available model: {model_name}")
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents="test"
                    )
                    if response and response.text:
                        print(f"  ✅ Using model: {model_name}")
                        return model_name
                except Exception as e:
                    continue
            
            # Ultimate fallback
            print("⚠️ Using fallback model: models/gemini-2.0-flash")
            return 'models/gemini-2.0-flash'
            
        except Exception as e:
            print(f"❌ Error finding model: {e}")
            return 'models/gemini-2.0-flash'

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
        
        # Normal interview flow - use Gemini dynamically
        return await self.generate_interview_response(user_message)

    async def generate_interview_response(self, user_message: str) -> Dict[str, Any]:
        """Generate dynamic interview response based on conversation context"""
        
        # Build conversation context (last 10 messages for better context)
        history_text = "\n".join([
            f"{'Candidate' if msg['role'] == 'user' else 'Interviewer'}: {msg['content']}"
            for msg in self.conversation_history[-10:]
        ])
        
        prompt = f"""You are an expert AI interviewer conducting a {self.interview_context['role']} interview at {self.interview_context['company']}.

COMPANY CONTEXT:
Google values innovation, collaboration, and technical excellence. They look for candidates who can solve complex problems and work well in teams.

CONVERSATION HISTORY:
{history_text}

The candidate just said: "{user_message}"

IMPORTANT RULES:
1. DO NOT repeat questions you've already asked
2. Respond specifically to what the candidate just said
3. Ask a relevant follow-up question based on THEIR answer
4. Be natural and conversational, not robotic
5. Keep your response to 2-3 sentences

Your response should:
- Acknowledge what they said
- Ask ONE specific follow-up question
- Sound like a real interviewer

RESPONSE:"""
        
        try:
            # Use the async SDK to avoid blocking
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            result = {
                "type": "question",
                "content": response.text if response.text else "That's interesting. Can you tell me more?",
                "suggestion": "",
                "next_topic": "follow_up",
                "search_used": False
            }
            
            # Add AI response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": result["content"],
                "type": result["type"]
            })
            
            self.interview_context['question_count'] += 1
            self.interview_context['last_question'] = result["content"]
            
            # Track topics discussed
            self._update_topics_discussed(user_message)
            
            return result
            
        except Exception as e:
            print(f"❌ Gemini error in interview response: {e}")
            return {
                "type": "question",
                "content": "That's interesting. Could you elaborate on that a bit more?",
                "suggestion": "",
                "next_topic": "experience",
                "search_used": False
            }

    def _update_topics_discussed(self, message: str):
        """Track topics discussed for context"""
        topics_keywords = {
            'experience': ['experience', 'worked', 'job', 'role', 'position'],
            'project': ['project', 'built', 'developed', 'created'],
            'team': ['team', 'collaborat', 'together', 'group'],
            'skill': ['skill', 'learn', 'technology', 'language', 'framework'],
            'challenge': ['challenge', 'difficult', 'problem', 'issue'],
            'leadership': ['lead', 'manage', 'mentor', 'guide']
        }
        
        message_lower = message.lower()
        for topic, keywords in topics_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                if topic not in self.interview_context['topics_discussed']:
                    self.interview_context['topics_discussed'].append(topic)

    async def handle_question_mode(self, user_message: str) -> Dict[str, Any]:
        """Handle when user asks a question - use Gemini dynamically"""
        
        prompt = f"""You are an expert AI interview coach helping a candidate prepare for a {self.interview_context['role']} interview at {self.interview_context['company']}.

The candidate asks: "{user_message}"

Provide a helpful, detailed response that:
1. Directly answers their specific question
2. Gives practical examples or frameworks if relevant
3. Is encouraging and supportive
4. Is NOT scripted - respond naturally to THIS specific question

Your response should be 3-4 sentences and genuinely helpful."""
        
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            result = {
                "type": "help",
                "content": response.text if response.text else "I'd be happy to help with that! Could you tell me more specifically what you'd like to know?",
                "suggestion": "",
                "search_used": False
            }
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": result["content"],
                "type": "help"
            })
            
            return result
            
        except Exception as e:
            print(f"❌ Gemini error in question mode: {e}")
            return {
                "type": "help",
                "content": "I'd be happy to help you with that question. Can you tell me a bit more about what specific aspect you're struggling with?",
                "suggestion": "",
                "search_used": False
            }

    def build_interview_prompt(self, user_message: str) -> str:
        """Build the interview prompt (kept for compatibility)"""
        return self.generate_interview_response(user_message)

    def detect_question_mode(self, message: str) -> bool:
        """Detect if user is asking a question"""
        message_lower = message.lower()
        
        question_patterns = [
            "how do i", "how to", "what is", "what are", "can you",
            "could you", "help me", "tell me about", "explain",
            "why", "when", "where", "example", "sample", "guide",
            "advice", "tip", "suggestion", "recommend"
        ]
        
        if message.strip().endswith('?'):
            return True
        
        for pattern in question_patterns:
            if pattern in message_lower:
                return True
        
        # Check if it's a help request
        help_words = ['help', 'confused', 'stuck', 'dont know', "don't know"]
        if any(word in message_lower for word in help_words):
            return True
        
        return False

    async def process_with_search(self, user_message: str) -> Dict[str, Any]:
        """Process with search capability"""
        # For now, just use normal processing
        # You can integrate web search here later
        return await self.process_message(user_message)

    def get_answer_help(self, question: str) -> str:
        """Get help for answering a specific question"""
        # This is a synchronous method, but we can still use Gemini
        # For simplicity, return a helpful message
        return "I'd be happy to help you answer that question. In a real interview, you should use the STAR method: describe the Situation, Task, Action, and Result. Think of a specific example from your experience."