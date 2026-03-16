# backend/check_api_key.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
print(f"🔑 API Key: {api_key[:10]}...{api_key[-5:] if api_key else 'None'}")

# Test different endpoints
test_urls = [
    f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
    f"https://generativelanguage.googleapis.com/v1/models?key={api_key}",
]

for url in test_urls:
    print(f"\n🔍 Testing: {url[:80]}...")
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Available models:")
            for model in data.get('models', [])[:5]:  # Show first 5
                print(f"  - {model.get('name')}")
        else:
            print(f"❌ Failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Error: {e}")