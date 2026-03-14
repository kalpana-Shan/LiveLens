import os
import json
import random
from typing import Dict, Any, List
from datetime import datetime
import google.genai as genai  

class InterviewAgent:
    def __init__(self, session_id: str):
        self.session_id = session_id
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        self.chat = None
        self.interview_context = {
            'company': None,
            'role': None,
            'round': 1,
            'difficulty': 'medium',
            'questions_asked': [],
            'responses': [],
            'scores': {
                'technical': [],
                'behavioral': [],
                'communication': [],
                'overall': 0
            }
        }
        
        # Load scenarios
        with open('data/interview_scenarios.json', 'r') as f:
            self.scenarios = json.load(f)

    async def start_interview(self, company: str, role: str):
        """Initialize interview with specific company and role"""
        
        company_data = self.scenarios['companies'].get(company, self.scenarios['companies']['google'])
        role_data = self.scenarios['roles'].get(role, self.scenarios['roles']['software_engineer'])
        
        self.interview_context['company'] = company_data
        self.interview_context['role'] = role_data
        
        # Create Gemini prompt for interview
        system_prompt = f"""You are a professional {company_data['name']} interviewer conducting a {role_data['title']} interview.

Company Culture: {', '.join(company_data['cultural_values'])}
Interview Style: {company_data['interview_style']}
Current Round: {role_data['interview_rounds'][0]}

Your role:
1. Start with a professional introduction
2. Ask relevant questions based on the role and round
3. Listen to responses and ask follow-ups
4. Provide subtle feedback through your tone
5. Maintain interviewer persona throughout

Begin the interview with a warm welcome and first question."""
        
        self.chat = self.model.start_chat(history=[])
        response = await self.chat.send_message_async(system_prompt)
        
        return {
            'type': 'interview_started',
            'company': company_data['name'],
            'role': role_data['title'],
            'round': role_data['interview_rounds'][0],
            'first_message': response.text
        }

    async def process_response(self, user_response: str, metrics: Dict[str, Any]):
        """Process candidate's response and generate next question/feedback"""
        
        # Store response
        self.interview_context['responses'].append({
            'text': user_response,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        })
        
        # Analyze response with Gemini
        analysis_prompt = f"""
Candidate's Response: "{user_response}"

Current Context:
- Company: {self.interview_context['company']['name']}
- Role: {self.interview_context['role']['title']}
- Round: {self.interview_context['role']['interview_rounds'][self.interview_context['round']-1]}
- Questions asked so far: {len(self.interview_context['questions_asked'])}

Real-time Metrics:
- Posture: {metrics.get('posture', 0)}%
- Eye Contact: {metrics.get('eyeContact', 0)}%
- Clarity: {metrics.get('clarity', 0)}%
- Confidence: {metrics.get('confidence', 0)}%

Analyze this response and provide:
1. STAR method usage (Situation, Task, Action, Result)
2. Technical accuracy (if applicable)
3. Communication effectiveness
4. Cultural fit with company
5. Next question or follow-up

Return as JSON:
{{
    "analysis": {{
        "star_method_score": 0-100,
        "technical_score": 0-100,
        "communication_score": 0-100,
        "cultural_fit_score": 0-100,
        "strengths": ["strength1", "strength2"],
        "improvements": ["area1", "area2"]
    }},
    "interviewer_response": "Your response as interviewer",
    "next_question": "Next question to ask",
    "round_complete": false,
    "hiring_recommendation": "strong_yes/yes/maybe/no"
}}
"""
        
        response = await self.chat.send_message_async(analysis_prompt)
        result = self._extract_json(response.text)
        
        # Update scores
        if 'analysis' in result:
            scores = result['analysis']
            self.interview_context['scores']['technical'].append(scores.get('technical_score', 0))
            self.interview_context['scores']['behavioral'].append(scores.get('star_method_score', 0))
            self.interview_context['scores']['communication'].append(scores.get('communication_score', 0))
        
        # Check if round is complete
        if len(self.interview_context['questions_asked']) >= 5:  # 5 questions per round
            self.interview_context['round'] += 1
            if self.interview_context['round'] > len(self.interview_context['role']['interview_rounds']):
                return self._generate_final_feedback()
        
        return {
            'type': 'interview_feedback',
            'payload': result
        }

    def _generate_final_feedback(self):
        """Generate comprehensive interview feedback"""
        
        avg_technical = sum(self.interview_context['scores']['technical']) / len(self.interview_context['scores']['technical']) if self.interview_context['scores']['technical'] else 0
        avg_behavioral = sum(self.interview_context['scores']['behavioral']) / len(self.interview_context['scores']['behavioral']) if self.interview_context['scores']['behavioral'] else 0
        avg_communication = sum(self.interview_context['scores']['communication']) / len(self.interview_context['scores']['communication']) if self.interview_context['scores']['communication'] else 0
        
        overall = (avg_technical * 0.4 + avg_behavioral * 0.3 + avg_communication * 0.3)
        
        return {
            'type': 'interview_complete',
            'payload': {
                'final_scores': {
                    'technical': round(avg_technical),
                    'behavioral': round(avg_behavioral),
                    'communication': round(avg_communication),
                    'overall': round(overall)
                },
                'feedback_summary': self._get_hiring_recommendation(overall),
                'strengths': self._aggregate_strengths(),
                'areas_for_improvement': self._aggregate_improvements()
            }
        }

    def _get_hiring_recommendation(self, score):
        if score >= 85:
            return "Strong Hire - Excellent candidate!"
        elif score >= 75:
            return "Hire - Meets all requirements"
        elif score >= 65:
            return "Lean Hire - Good potential"
        elif score >= 50:
            return "Lean No - Needs more experience"
        else:
            return "No Hire - Not suitable at this time"

    def _extract_json(self, text):
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except:
            pass
        return {}