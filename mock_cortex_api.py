from fastapi import FastAPI, Request
import uvicorn
import json

app = FastAPI()

@app.post("/ingest")
async def ingest(request: Request):
    payload = await request.json()
    print(f"[CORTEX INGEST] Received signal: {json.dumps(payload)}")
    return {"status": "ok", "message": "Signal ingested and anonymized"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8020)
