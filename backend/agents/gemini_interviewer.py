# backend/agents/gemini_interviewer.py
import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
from agents.web_search import SearchAugmentedAI

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
        self.search_ai = None  # Will initialize when needed

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
        
        # Check if this is a question (not an answer to interview question)
        is_question_mode = self.detect_question_mode(user_message)
        
        if is_question_mode:
            # Handle as a question (user needs help/information)
            return await self.handle_question_mode(user_message)
        
        # Normal interview mode (user is answering a question)
        # Build the full prompt with context
        prompt = f"""
{self.build_system_prompt()}

CONVERSATION HISTORY:
{self.format_history()}

USER JUST SAID: "{user_message}"

Analyze their answer and respond appropriately:
1. Acknowledge their response
2. Provide brief feedback if relevant
3. Ask the next logical interview question
4. Keep it conversational

YOUR RESPONSE (as JSON):
{{
    "type": "question",
    "content": "your response text",
    "suggestion": "optional tip",
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
    
    async def handle_question_mode(self, user_message: str) -> Dict[str, Any]:
        """
        Handle when user asks a question instead of answering
        """
        # Check if user is asking for help with an interview question
        if any(phrase in user_message.lower() for phrase in 
               ['how do i answer', 'how to answer', 'help me with', 
                'what should i say', 'sample answer', 'example']):
            
            return await self.provide_answer_help(user_message)
        
        # Check if user is asking about interview process
        elif any(phrase in user_message.lower() for phrase in
                 ['what questions', 'what to expect', 'how long', 
                  'what is the process', 'interview format']):
            
            return await self.explain_interview_process()
        
        # Check if user is asking about company/role
        elif any(phrase in user_message.lower() for phrase in
                 ['tell me about google', 'company culture', 'values',
                  'what is the role', 'job description']):
            
            return await self.provide_company_info(user_message)
        
        # General question - use web search if needed
        else:
            return {
                "type": "answer",
                "content": "I'll help you with that question. Let me find the best information for you.",
                "suggestion": "",
                "needs_search": True
            }

    async def provide_answer_help(self, user_message: str) -> Dict[str, Any]:
        """
        Provide help on how to answer specific interview questions
        """
        # Extract the question they need help with
        question = self.extract_question_from_help(user_message)
        
        help_prompt = f"""
The user is struggling with this interview question: "{question}"

Provide helpful guidance including:
1. A framework to structure the answer (like STAR method for behavioral questions)
2. Key points they should include
3. A brief example answer
4. Common mistakes to avoid

Make it encouraging and practical. Keep response to 3-4 sentences.
"""
        
        try:
            response = self.model.generate_content(help_prompt)
            return {
                "type": "help",
                "content": response.text,
                "suggestion": "Try using this framework for your answer",
                "original_question": question
            }
        except Exception as e:
            print(f"Help generation error: {e}")
            return {
                "type": "help",
                "content": "For behavioral questions, use the STAR method: Situation, Task, Action, Result. Think of a specific example and walk through each part.",
                "suggestion": "STAR method",
                "original_question": question
            }

    def extract_question_from_help(self, message: str) -> str:
        """
        Extract the actual question from a help request
        """
        # Common patterns
        patterns = [
            "how do i answer",
            "how to answer",
            "help me with",
            "what should i say for",
            "sample answer for",
            "example for"
        ]
        
        message_lower = message.lower()
        for pattern in patterns:
            if pattern in message_lower:
                # Extract everything after the pattern
                return message[message_lower.find(pattern) + len(pattern):].strip()
        
        # If no pattern found, return the whole message
        return message

    async def explain_interview_process(self) -> Dict[str, Any]:
        """
        Explain the typical interview process
        """
        prompt = f"""
Explain the typical interview process for a {self.interview_context['role']} position at {self.interview_context['company']}.

Include:
1. Number of rounds
2. Types of interviews (phone screen, technical, behavioral, system design)
3. What to expect in each round
4. Tips for preparation

Keep it concise but informative.
"""
        
        try:
            response = self.model.generate_content(prompt)
            return {
                "type": "information",
                "content": response.text,
                "suggestion": "Prepare for each round accordingly"
            }
        except:
            return {
                "type": "information",
                "content": "Typically, Google interviews have 4-5 rounds: an initial phone screen, followed by 3-4 onsite rounds covering coding, system design, and behavioral questions.",
                "suggestion": "Practice coding and system design"
            }

    async def provide_company_info(self, user_message: str) -> Dict[str, Any]:
        """
        Provide information about the company
        """
        prompt = f"""
The user is asking about {self.interview_context['company']}: "{user_message}"

Provide relevant information about the company's:
1. Culture and values
2. Interview process
3. What they look for in candidates
4. Recent news or trends (if relevant)

Be accurate and helpful.
"""
        
        try:
            response = self.model.generate_content(prompt)
            return {
                "type": "information",
                "content": response.text,
                "suggestion": "Research the company more on their careers page"
            }
        except:
            return {
                "type": "information",
                "content": f"{self.interview_context['company']} values innovation, collaboration, and technical excellence. They look for candidates who can solve complex problems and work well in teams.",
                "suggestion": "Check Google's careers website for more details"
            }

    def detect_question_mode(self, message: str) -> bool:
        """
        Detect if user is asking a question (needs help) vs answering
        """
        message_lower = message.lower()
        
        # Question indicators
        question_patterns = [
            "how do i",
            "how to",
            "what is",
            "what are",
            "can you",
            "could you",
            "help me",
            "tell me about",
            "explain",
            "why do",
            "when do",
            "where can",
            "is it",
            "are there",
            "example",
            "sample"
        ]
        
        # If it ends with question mark, definitely a question
        if message.strip().endswith('?'):
            return True
        
        # Check for question patterns
        for pattern in question_patterns:
            if pattern in message_lower:
                return True
        
        # Check if it's very short (like "help", "example")
        if len(message.split()) <= 3 and any(word in message_lower for word in 
                                             ['help', 'example', 'sample', 'guide']):
            return True
        
        return False

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

    async def process_with_search(self, user_message: str) -> Dict[str, Any]:
        """Process message with web search capability"""
        if not self.search_ai:
            from agents.web_search import SearchAugmentedAI
            self.search_ai = SearchAugmentedAI(self)
        
        return await self.search_ai.process_with_search(user_message)    

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