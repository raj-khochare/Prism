FROM python:3.11-slim

# libgomp1: xgboost needs the OpenMP runtime, which the slim image does not ship.
RUN apt-get update && apt-get install -y --no-install-recommends curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
# model.json / features.json / model_card.json come from `python ml/train.py --export ml-service/model`
COPY model ./model

EXPOSE 8002
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fs http://localhost:8002/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
