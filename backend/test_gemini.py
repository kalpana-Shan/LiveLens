# backend/test_gemini.py
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    api_key = os.getenv("GOOGLE_API_KEY")
    print(f"🔑 API Key loaded: {bool(api_key)}")
    
    if not api_key:
        print("❌ No API key found!")
        return
    
    client = genai.Client(api_key=api_key)
    
    # Try to list available models
    try:
        print("\n📋 Attempting to list models...")
        models = client.models.list()
        print("✅ Available models:")
        for model in models:
            print(f"  - {model.name}")
    except Exception as e:
        print(f"❌ Error listing models: {e}")
    
    # Try different model names
    test_models = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-pro-exp',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'models/gemini-1.5-pro',
        'models/gemini-pro'
    ]
    
    print("\n🔍 Testing individual models:")
    for model_name in test_models:
        try:
            print(f"  Testing {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents="Say 'hello' if you can hear me"
            )
            print(f"  ✅ SUCCESS: {model_name}")
            print(f"  Response: {response.text[:50]}...\n")
        except Exception as e:
            print(f"  ❌ Failed: {model_name} - {str(e)[:100]}\n")

if __name__ == "__main__":
    test_gemini()