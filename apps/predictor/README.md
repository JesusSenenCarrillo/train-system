# Renfe Delay Predictor

Python FastAPI microservice that predicts train delays based on historical aggregates and active incidents.

## Endpoints

- `GET /health` — service health and model status
- `POST /predict/delay` — predict delay for a train/route/station context

## Run with Docker (recommended)

```bash
docker compose up predictor
```

## Run locally (PowerShell)

Requires **Python 3.12** (scikit-learn 1.5.2 does not provide wheels for Python 3.14).

```powershell
cd apps/predictor
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.venv\Scripts\uvicorn main:app --reload
```

> Always use `.venv\Scripts\uvicorn` directly if the virtual environment is not active in your shell.

## Train a model

Place a scikit-learn model saved with `joblib` at `model/delay_model.pkl`. The model must accept a 6-feature numeric vector:

1. hourOfDay
2. dayOfWeek
3. avgDelaySeconds7d
4. maxDelaySeconds7d
5. anomalyEvents7d
6. activeIncidentSeverity

If no model is present, a deterministic fallback predictor is used.
