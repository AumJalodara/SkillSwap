import os
import httpx
import json
from app.core.config import settings

async def extract_skills_from_text(text: str) -> dict:
    """
    Extract skills from natural language text using Groq API.
    Returns format: {"teaching": ["Skill1"], "learning": ["Skill2"]}
    """
    if not settings.GROQ_API_KEY:
        return {"teaching": [], "learning": []}
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a skill extractor API. Output ONLY valid JSON containing 'teaching' and 'learning' arrays of strings representing skills. No other text."
                        },
                        {
                            "role": "user",
                            "content": f"Extract teaching and learning skills from this text: '{text}'"
                        }
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            result = json.loads(content)
            
            return {
                "teaching": result.get("teaching", []),
                "learning": result.get("learning", [])
            }
    except Exception as e:
        print(f"AI skill extraction failed: {e}")
        # Gracefully handle failure
        return {"teaching": [], "learning": []}
