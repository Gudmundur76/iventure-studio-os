FROM python:3.11-slim

WORKDIR /app

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy skill code
COPY vmoa_skill_market_simulation.py .

EXPOSE 8085

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8085/health || exit 1

CMD ["uvicorn", "vmoa_skill_market_simulation:app", "--host", "0.0.0.0", "--port", "8085"]
