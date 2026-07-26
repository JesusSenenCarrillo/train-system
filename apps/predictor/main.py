import joblib
import numpy as np
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any

MODEL_PATH = os.getenv("MODEL_PATH", "model/delay_model.pkl")
DEFAULT_DELAY = float(os.getenv("DEFAULT_DELAY_MINUTES", "5.0"))


class FallbackModel:
    """Deterministic predictor used when no trained model exists."""

    def predict(self, features: np.ndarray) -> np.ndarray:
        base = np.full(features.shape[0], DEFAULT_DELAY)
        if features.shape[1] > 0:
            base += np.clip(features[:, 0] / 60.0, 0, 30)
        return np.maximum(base, 0)


def _load_model() -> Any:
    try:
        return joblib.load(MODEL_PATH)
    except FileNotFoundError:
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = _load_model() or FallbackModel()
    yield


app = FastAPI(title="Renfe Delay Predictor", lifespan=lifespan)


class DelayPredictionRequest(BaseModel):
    trainId: str | None = Field(default=None, description="Train identifier")
    routeId: str | None = Field(default=None, description="GTFS route identifier")
    stationId: str | None = Field(default=None, description="Station identifier")
    hourOfDay: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    dayOfWeek: int = Field(..., ge=0, le=6, description="Day of week (0=Monday)")
    avgDelaySeconds7d: float = Field(default=0.0, ge=0, description="7-day average delay")
    maxDelaySeconds7d: float = Field(default=0.0, ge=0, description="7-day max delay")
    anomalyEvents7d: int = Field(default=0, ge=0, description="7-day anomaly count")
    activeIncidentSeverity: int = Field(
        default=0, ge=0, le=4, description="Active incident severity (0=none, 4=critical)"
    )


class DelayPredictionResponse(BaseModel):
    trainId: str | None
    routeId: str | None
    stationId: str | None
    estimatedDelayMinutes: float
    confidence: float
    modelVersion: str


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "model": "fallback" if isinstance(app.state.model, FallbackModel) else "trained"}


@app.post("/predict/delay", response_model=DelayPredictionResponse)
async def predict_delay(request: DelayPredictionRequest) -> DelayPredictionResponse:
    features = np.array(
        [
            [
                request.hourOfDay,
                request.dayOfWeek,
                request.avgDelaySeconds7d,
                request.maxDelaySeconds7d,
                request.anomalyEvents7d,
                request.activeIncidentSeverity,
            ]
        ],
        dtype=np.float32,
    )

    try:
        prediction = app.state.model.predict(features)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    estimated = float(np.maximum(prediction[0], 0))
    confidence = _confidence_score(estimated, request.activeIncidentSeverity)

    return DelayPredictionResponse(
        trainId=request.trainId,
        routeId=request.routeId,
        stationId=request.stationId,
        estimatedDelayMinutes=round(estimated, 2),
        confidence=round(confidence, 3),
        modelVersion="v0.1.0-fallback" if isinstance(app.state.model, FallbackModel) else "v0.1.0",
    )


def _confidence_score(estimated_delay: float, severity: int) -> float:
    """Higher severity and more extreme delays lower confidence."""
    base = 0.85
    base -= min(estimated_delay / 60.0, 0.3)
    base -= severity * 0.05
    return max(base, 0.1)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
