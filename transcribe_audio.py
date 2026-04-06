import base64
import httpx
import os
import json

AUDIO_PATH = "/home/skywork/.openclaw/media/inbound/77adb87e-6429-408a-8b8e-2470af3c6acf.ogg"
LITELLM_URL = "http://localhost:4000/v1/chat/completions"
API_KEY = "sk-iventure-rBMOfG4lKKnc3l83FpYE59Vc1zSN8n4x"

def transcribe():
    with open(AUDIO_PATH, "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "model": "gemini-2.5-flash",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Please transcribe this audio exactly."},
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": audio_data,
                            "format": "ogg"
                        }
                    }
                ]
            }
        ]
    }

    headers = {"Authorization": f"Bearer {API_KEY}"}
    
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(LITELLM_URL, json=payload, headers=headers)
            print(resp.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    transcribe()
