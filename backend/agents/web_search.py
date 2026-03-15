# backend/agents/web_search.py
import os
import json
import aiohttp
import asyncio
from typing import Optional, Dict, Any

class WebSearch:
    def __init__(self):
        # You can use Google Custom Search API or SerpAPI
        # For now, we'll use a free alternative
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        
    async def search(self, query: str, num_results: int = 3) -> Dict[str, Any]:
        """
        Search the web for information
        """
        try:
            # Try Google Custom Search first (if configured)
            if self.api_key and self.search_engine_id:
                return await self._google_search(query, num_results)
            else:
                # Fallback to simulated search for demo
                return await self._simulated_search(query)
                
        except Exception as e:
            print(f"❌ Search error: {e}")
            return {
                "success": False,
                "results": [],
                "error": str(e)
            }
    
    async def _google_search(self, query: str, num_results: int) -> Dict[str, Any]:
        """Actual Google Custom Search"""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": num_results
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("items", []):
                        results.append({
                            "title": item.get("title", ""),
                            "snippet": item.get("snippet", ""),
                            "link": item.get("link", "")
                        })
                    
                    return {
                        "success": True,
                        "results": results,
                        "total": len(results)
                    }
                else:
                    return {
                        "success": False,
                        "results": [],
                        "error": f"Search API returned {response.status}"
                    }
    
    async def _simulated_search(self, query: str) -> Dict[str, Any]:
        """Simulated search for demo purposes"""
        # This is a fallback when no API key is configured
        
        # Common interview-related searches
        search_db = {
            "software engineer": [
                {
                    "title": "How to Answer Software Engineer Interview Questions",
                    "snippet": "Common questions include: system design, algorithms, data structures, and behavioral questions using the STAR method.",
                    "link": "https://example.com/software-engineer-interview"
                },
                {
                    "title": "Top 10 Software Engineer Interview Questions",
                    "snippet": "1. Tell me about yourself\n2. Why do you want to work here?\n3. Explain a challenging project\n4. How do you handle conflicts?",
                    "link": "https://example.com/top-questions"
                }
            ],
            "system design": [
                {
                    "title": "System Design Interview Guide",
                    "snippet": "Learn how to design scalable systems. Key concepts: load balancing, caching, database sharding, microservices.",
                    "link": "https://example.com/system-design"
                }
            ],
            "behavioral": [
                {
                    "title": "STAR Method for Behavioral Questions",
                    "snippet": "Situation, Task, Action, Result. Use this framework to structure your answers to behavioral questions.",
                    "link": "https://example.com/star-method"
                }
            ],
            "salary": [
                {
                    "title": "Software Engineer Salary Guide 2024",
                    "snippet": "Average salaries: Entry-level: $110k, Mid-level: $140k, Senior: $180k, Staff: $220k+",
                    "link": "https://example.com/salary-guide"
                }
            ],
            "react": [
                {
                    "title": "React Interview Questions",
                    "snippet": "Common React questions: hooks, lifecycle methods, state management, virtual DOM, and performance optimization.",
                    "link": "https://example.com/react-questions"
                }
            ],
            "python": [
                {
                    "title": "Python Interview Questions",
                    "snippet": "Topics: data structures, OOP, decorators, generators, multithreading, and common libraries.",
                    "link": "https://example.com/python-questions"
                }
            ]
        }
        
        # Find matching results
        results = []
        query_lower = query.lower()
        
        for key, value in search_db.items():
            if key in query_lower:
                results.extend(value)
        
        # If no matches, provide general results
        if not results:
            results = [
                {
                    "title": "How to Prepare for Technical Interviews",
                    "snippet": "Practice coding problems, review system design, prepare behavioral stories, and research the company.",
                    "link": "https://example.com/prepare"
                },
                {
                    "title": "Common Interview Mistakes to Avoid",
                    "snippet": "Don't ramble, avoid negative talk about previous employers, and always ask questions at the end.",
                    "link": "https://example.com/mistakes"
                }
            ]
        
        return {
            "success": True,
            "results": results[:3],  # Limit to 3 results
            "total": min(3, len(results))
        }

class SearchAugmentedAI:
    """Combine Gemini AI with web search for better responses"""
    
    def __init__(self, gemini_interviewer):
        self.gemini = gemini_interviewer
        self.searcher = WebSearch()
    
    async def process_with_search(self, user_message: str) -> Dict[str, Any]:
        """
        Process message with optional web search enhancement
        """
        # Check if this is a search-worthy query
        if self._needs_search(user_message):
            print(f"🔍 Searching for: {user_message}")
            
            # Perform search
            search_results = await self.searcher.search(user_message)
            
            if search_results["success"] and search_results["results"]:
                # Augment Gemini prompt with search results
                return await self._get_augmented_response(user_message, search_results["results"])
        
        # Normal processing without search
        return await self.gemini.process_message(user_message)
    
    def _needs_search(self, message: str) -> bool:
        """Determine if message needs web search"""
        search_indicators = [
            "what is", "tell me about", "how to", 
            "latest", "news", "trending",
            "salary", "market", "technology",
            "difference between", "compare",
            "example of", "guide for"
        ]
        
        message_lower = message.lower()
        return any(indicator in message_lower for indicator in search_indicators)
    
    async def _get_augmented_response(self, query: str, search_results: list) -> Dict[str, Any]:
        """Get AI response augmented with search results"""
        
        # Format search results for prompt
        search_text = "\n".join([
            f"- {r['title']}: {r['snippet']}" 
            for r in search_results
        ])
        
        augmented_prompt = f"""
The user asked: "{query}"

I searched the web and found this information:
{search_text}

Using this information, provide a helpful response. If the search results are relevant,
incorporate them naturally. If they're not directly relevant, use your own knowledge.

Remember to:
1. Be conversational and helpful
2. Cite sources when using search results
3. Admit if you're not sure about something

Response:
"""
        
        try:
            response = self.gemini.model.generate_content(augmented_prompt)
            return {
                "type": "answer",
                "content": response.text,
                "suggestion": "",
                "search_used": True,
                "sources": [r["link"] for r in search_results]
            }
        except Exception as e:
            print(f"❌ Augmented response error: {e}")
            return await self.gemini.process_message(query)