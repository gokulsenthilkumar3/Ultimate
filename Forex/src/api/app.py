"""
src/api/app.py
===============
FastAPI application for online Forex exchange-rate inference (v2).

Changes from v1
---------------
- /predict and /predict/batch now accept environmental_context, return_intervals,
  return_scenarios query parameters.
- PredictionRow responses include confidence_interval, scenario_probabilities,
  driving_factors, sentiment_score, and cb_bias when requested.
- New GET /sentiment/{currency_code} endpoint returns live LLM-scored sentiment
  without triggering the full ML prediction pipeline.
- predictor.predict() now returns a 4-tuple; app.py extracts env_data from [3].
- All v1 behaviour preserved for backward-compatible clients.

Endpoints
---------
GET  /health                     — liveness + artifact status
GET  /model-info                 — artifact metadata
POST /predict                    — online JSON inference (v2)
POST /predict/batch              — CSV file upload → CSV download (v2)
GET  /sentiment/{currency_code}  — real-time LLM sentiment score [NEW]
"""

from __future__ import annotations
import io
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from src.api.schemas import (
    PredictRequest,
    PredictResponse,
    PredictionRow,
    ConfidenceInterval,
    ScenarioProbabilities,
    HealthResponse,
    ModelInfoResponse,
    SentimentResponse,
)
from src.api.predictor import ForexPredictor

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

_MODEL_DIR   = os.environ.get("MODEL_DIR",   "outputs/latest")
_CONFIG_PATH = os.environ.get("FEAT_CONFIG", "config/features.yaml")
_API_TITLE   = "Forex Ensemble Prediction API"
_API_VERSION = "2.0.0"

predictor: Optional[ForexPredictor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    log.info(f"Starting {_API_TITLE} v{_API_VERSION}")
    predictor = ForexPredictor(model_dir=_MODEL_DIR, config_path=_CONFIG_PATH)
    try:
        predictor.load_artifacts()
        log.info("All artifacts loaded successfully.")
    except FileNotFoundError as exc:
        log.warning(
            f"Artifact loading failed: {exc}. "
            "Server starting in degraded mode — run training first."
        )
    yield
    log.info("Shutting down API server.")


app = FastAPI(
    title=_API_TITLE,
    version=_API_VERSION,
    description=(
        "Online inference API for the Forex Ensemble Prediction system v2. "
        "Supports LightGBM, XGBoost, and Stacking meta-learner models "
        "with MC-Dropout uncertainty, Quantile prediction intervals, "
        "LLM scenario generation, and multi-source news/sentiment ingestion."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ─────────────────────────────────────────────────────────────────────

def _require_artifacts() -> None:
    """Guard against None predictor and unloaded artifacts."""
    if predictor is None or not predictor.artifacts_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not loaded. Run training pipeline first.",
        )


def _build_prediction_row(
    i: int,
    row: pd.Series,
    preds: np.ndarray,
    uncertainties: Optional[np.ndarray],
    env_data: Dict[str, Any],
    request: PredictRequest,
) -> PredictionRow:
    """
    Assemble a PredictionRow from predictor outputs, handling all v2 fields.
    """
    if i >= len(preds):
        return None  # type: ignore

    cc = str(row.get("_currency_code_orig", "unknown"))
    pred_rate = float(round(preds[i], 6))

    # MC-Dropout uncertainty
    unc_val = (
        float(round(uncertainties[i], 6))
        if uncertainties is not None and i < len(uncertainties)
        else None
    )

    # Confidence interval
    ci: Optional[ConfidenceInterval] = None
    if request.return_intervals:
        intervals = env_data.get("intervals", {})
        lower_arr = intervals.get("lower")
        median_arr = intervals.get("median")
        upper_arr = intervals.get("upper")
        if lower_arr is not None and i < len(lower_arr) and lower_arr[i] != 0:
            lo = float(round(lower_arr[i], 6))
            med = float(round(median_arr[i], 6))
            hi = float(round(upper_arr[i], 6))
            ci = ConfidenceInterval(
                lower_bound=lo, median=med, upper_bound=hi,
                width=round(hi - lo, 6), confidence=0.80,
            )
        else:
            # Fallback: ±1.5% band
            lo = round(pred_rate * 0.985, 6)
            hi = round(pred_rate * 1.015, 6)
            ci = ConfidenceInterval(
                lower_bound=lo, median=pred_rate, upper_bound=hi,
                width=round(hi - lo, 6), confidence=0.80,
            )

    # Scenario probabilities
    sp: Optional[ScenarioProbabilities] = None
    driving_factors: Optional[str] = None
    if request.return_scenarios:
        scenarios_map = env_data.get("scenarios", {})
        if cc in scenarios_map:
            s = scenarios_map[cc]
            weights = s.to_weights_dict()
            sp = ScenarioProbabilities(
                bear=weights.get("bear", 0.2),
                mild_bear=weights.get("mild_bear", 0.2),
                neutral=weights.get("neutral", 0.2),
                mild_bull=weights.get("mild_bull", 0.2),
                bull=weights.get("bull", 0.2),
                consensus_change_pct=s.consensus_change_pct,
            )
            driving_factors = s.llm_reasoning

    # Sentiment
    sentiment_score: Optional[float] = None
    cb_bias: Optional[str] = None
    sentiment_map = env_data.get("sentiment", {})
    if cc in sentiment_map:
        sent = sentiment_map[cc]
        sentiment_score = round(sent.sentiment_score, 4)
        cb_bias = sent.cb_bias
        if not driving_factors and sent.llm_explanation:
            driving_factors = sent.llm_explanation

    return PredictionRow(
        date=str(row.get("date", ""))[:10],
        currency_code=cc,
        predicted_rate=pred_rate,
        uncertainty=unc_val,
        confidence_interval=ci,
        scenario_probabilities=sp,
        driving_factors=driving_factors,
        sentiment_score=sentiment_score,
        cb_bias=cb_bias,
    )


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Ops"])
async def health():
    return HealthResponse(
        status="ok" if (predictor and predictor.artifacts_loaded) else "degraded",
        model_dir=_MODEL_DIR,
        artifacts_loaded=bool(predictor and predictor.artifacts_loaded),
        models_available=predictor.available_models if predictor else [],
    )


@app.get("/model-info", response_model=ModelInfoResponse, tags=["Ops"])
async def model_info(
    model: str = Query(default="stacking", description="lgb | xgb | stacking"),
):
    _require_artifacts()
    if model not in predictor.available_models:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model}' not loaded. Available: {predictor.available_models}",
        )
    return ModelInfoResponse(
        model_name=model,
        model_dir=_MODEL_DIR,
        artifact_files=predictor.artifact_files,
        n_currencies=predictor.n_currencies,
        feature_config_path=_CONFIG_PATH,
    )


@app.get(
    "/sentiment/{currency_code}",
    response_model=SentimentResponse,
    tags=["Environmental Intelligence"],
)
async def get_sentiment(
    currency_code: str = Path(
        ...,
        description="Currency ISO code, e.g. USD, EUR, INR, GBP.",
        min_length=3, max_length=5,
    ),
    date: Optional[str] = Query(
        default=None,
        description="ISO-8601 date string (default: today). e.g. 2025-09-10",
    ),
    force_refresh: bool = Query(
        default=False,
        description="Bypass cache and fetch fresh data from all sources.",
    ),
):
    """
    Fetch real-time LLM-scored environmental sentiment for a currency pair.

    Returns multi-source sentiment analysis (news, RSS, central bank speeches)
    including hawkish/dovish CB bias, propaganda score, and scenario weights.
    Does NOT require model artifacts to be loaded.
    """
    try:
        from src.data.news_fetcher import NewsFetcher
        fetcher = (
            predictor._news_fetcher
            if (predictor and predictor._news_fetcher)
            else NewsFetcher()
        )
        score = fetcher.get_sentiment(
            currency_code=currency_code.upper(),
            date=date,
            force_refresh=force_refresh,
        )
        return SentimentResponse(
            currency_code=score.currency_code,
            date=score.date,
            sentiment_score=round(score.sentiment_score, 4),
            confidence=round(score.confidence, 4),
            cb_bias=score.cb_bias,
            cb_bias_strength=round(score.cb_bias_strength, 4),
            propaganda_score=round(score.propaganda_score, 4),
            scenario_weights={k: round(v, 4) for k, v in score.scenario_weights.items()},
            n_articles=score.n_articles,
            sources_used=score.sources_used,
            driving_headline=score.driving_headline,
            explanation=score.llm_explanation,
        )
    except Exception as exc:
        log.exception(f"Sentiment fetch failed for {currency_code}")
        raise HTTPException(status_code=500, detail=f"Sentiment error: {exc}")


@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
async def predict(request: PredictRequest):
    """
    Online inference — 1..N rows as JSON, predictions returned in the same order.

    v2 additions (all opt-in, backward-compatible):
    - return_intervals=true  → confidence interval (Q10/Q50/Q90) per prediction
    - return_scenarios=true  → LLM scenario probabilities per currency
    - environmental_context  → inject news, speeches, or override sentiment
    """
    _require_artifacts()
    try:
        preds, uncertainties, df_proc, env_data = predictor.predict(
            rows=request.rows,
            model_name=request.model,
            return_uncertainty=request.return_uncertainty,
            return_intervals=request.return_intervals,
            return_scenarios=request.return_scenarios,
            environmental_context=request.environmental_context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        log.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    rows_out: List[PredictionRow] = []
    for i, (_, row) in enumerate(df_proc.iterrows()):
        pred_row = _build_prediction_row(i, row, preds, uncertainties, env_data, request)
        if pred_row is not None:
            rows_out.append(pred_row)

    return PredictResponse(
        model_used=request.model,
        n_predictions=len(rows_out),
        predictions=rows_out,
    )


@app.post("/predict/batch", tags=["Inference"])
async def predict_batch(
    file: UploadFile = File(..., description="CSV with columns: date, currency_code [, exchange_rate]"),
    model: str       = Query(default="stacking", description="lgb | xgb | stacking"),
    return_uncertainty: bool = Query(default=False),
    return_intervals:   bool = Query(default=False),
    return_scenarios:   bool = Query(default=False),
):
    """
    Batch CSV inference — upload a CSV, get predictions back as a downloadable CSV.

    Output CSV preserves the same row order as the input file.
    v2 additions: optional interval columns (lower_bound, upper_bound) and
    scenario consensus_change_pct column when return_scenarios=True.
    """
    _require_artifacts()

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=415, detail="Only CSV files are accepted.")

    content = await file.read()
    try:
        df_raw = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    required_cols = {"date", "currency_code"}
    missing = required_cols - set(df_raw.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"CSV missing required columns: {missing}",
        )

    rows = df_raw.to_dict(orient="records")
    try:
        preds, uncertainties, df_proc, env_data = predictor.predict(
            rows=rows,
            model_name=model,
            return_uncertainty=return_uncertainty,
            return_intervals=return_intervals,
            return_scenarios=return_scenarios,
        )
    except Exception as exc:
        log.exception("Batch prediction failed")
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    # Sort output by _orig_idx to restore input CSV row order
    df_proc = df_proc.sort_values("_orig_idx").reset_index(drop=True)

    out_df = df_proc[["date", "_currency_code_orig"]].rename(
        columns={"_currency_code_orig": "currency_code"}
    )
    if "exchange_rate" in df_proc.columns:
        out_df["exchange_rate"] = df_proc["exchange_rate"]
    out_df["predicted_rate"] = preds

    if return_uncertainty and uncertainties is not None:
        out_df["uncertainty"] = uncertainties

    if return_intervals:
        intervals = env_data.get("intervals", {})
        if intervals.get("lower") is not None:
            out_df["lower_bound"] = intervals["lower"][:len(out_df)]
            out_df["upper_bound"] = intervals["upper"][:len(out_df)]
        else:
            out_df["lower_bound"] = out_df["predicted_rate"] * 0.985
            out_df["upper_bound"] = out_df["predicted_rate"] * 1.015

    if return_scenarios:
        scenarios_map = env_data.get("scenarios", {})
        def _get_consensus(cc: str) -> float:
            s = scenarios_map.get(cc)
            return round(s.consensus_change_pct, 4) if s else 0.0
        out_df["scenario_consensus_pct"] = out_df["currency_code"].apply(_get_consensus)

    buffer = io.StringIO()
    out_df.to_csv(buffer, index=False)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=predictions_{model}.csv"
        },
    )
