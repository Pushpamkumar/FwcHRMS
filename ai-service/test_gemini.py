import os
import google.generativeai as genai
import dotenv

dotenv.load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
print("API Key loaded:", api_key)

if not api_key:
    print("Error: GEMINI_API_KEY not found in env")
    exit(1)

genai.configure(api_key=api_key)
for model_name in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]:
    try:
        print(f"Testing {model_name}...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello, how are you?")
        print(f"Success with {model_name}:")
        print(response.text[:100])
        break
    except Exception as e:
        print(f"Failed {model_name}:", type(e), e)
