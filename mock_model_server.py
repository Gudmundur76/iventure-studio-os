from fastapi import FastAPI, Request
import uvicorn
import time

app = FastAPI()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [
            {"id": "gpt-5", "object": "model"},
            {"id": "claude-opus-4", "object": "model"},
            {"id": "gemini-2.5-flash", "object": "model"},
            {"id": "skywork-deepresearch-v2", "object": "model"}
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    payload = await request.json()
    model = payload.get("model", "unknown")
    messages = payload.get("messages", [])
    last_message = messages[-1]["content"] if messages else ""
    
    content = f"[MOCK PHASE 4 RESPONSE] iVenture Studio node ivs_49960de5880e responding via {model}. Task executed with GRPO 0.991337."
    
    if "JSON object" in last_message and "score" in last_message:
        content = '{"score": 0.991337, "reasoning": "Mock bridge critic response"}'
    elif "JSON list" in last_message and "floats" in last_message:
        content = '[0.9, 0.95, 0.98]'

    return {
        "id": "mock-completion-123",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 20,
            "total_tokens": 30
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7056)
