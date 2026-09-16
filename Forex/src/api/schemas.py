"""
src/api/schemas.py
==================
Pydantic request / response schemas for the Forex prediction API v2.

Changes from v1
---------------
- PredictRequest now accepts optional ``environmental_context`` for injecting
  news/speech/sentiment overrides.
- PredictionRow now returns ``confidence_interval``, ``scenario_probabilities``,
  and ``driving_factors`` for rich, explainable outputs.
- New SentimentResponse schema for the /sentiment/{currency_code} endpoint.
- All v1 fields preserved for backward compatibility.
"""

from __future__ import annotations
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Sub-schemas ────────────────────────────────────────────────────────────────

class EnvironmentalContext(BaseModel):
    """
    Optional caller-supplied market context that augments automated ingestion.

    All fields are optional. When provided they are merged with (and take
    precedence over) the automatically fetched news and sentiment data.
    """
    sentiment_override: Optional[float] = Field(
        default=None,
        ge=-1.0, le=1.0,
        description="Manual sentiment override in range [-1.0, +1.0]. "
                    "Supersedes LLM-scored news sentiment.",
    )
    cb_bias_override: Optional[str] = Field(
        default=None,
        description="Central bank bias override: 'hawkish' | 'dovish' | 'neutral'.",
    )
    news_headlines: Optional[List[str]] = Field(
        default=None,
        max_length=10,
        description="Up to 10 recent news headlines to include in LLM scoring.",
    )
    speech_excerpts: Optional[List[str]] = Field(
        default=None,
        max_length=5,
        description="Central bank speech excerpts for hawkish/dovish analysis.",
    )
    custom_scenario_weights: Optional[Dict[str, float]] = Field(
        default=None,
        description="Manual scenario weights dict. Keys: bear, mild_bear, neutral, "
                    "mild_bull, bull. Values must sum to 1.0.",
    )
    disable_llm: bool = Field(
        default=False,
        description="Set True to skip all LLM calls and use rule-based scoring only.",
    )

    @field_validator("cb_bias_override")
    @classmethod
    def validate_cb_bias(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"hawkish", "dovish", "neutral"}:
            raise ValueError("cb_bias_override must be 'hawkish', 'dovish', or 'neutral'.")
        return v


class ConfidenceInterval(BaseModel):
    """Prediction interval from the Quantile Regression model."""
    lower_bound: float = Field(description="10th percentile (pessimistic) rate.")
    median:      float = Field(description="50th percentile (median) rate.")
    upper_bound: float = Field(description="90th percentile (optimistic) rate.")
    width:       float = Field(description="Interval width = upper - lower.")
    confidence:  float = Field(default=0.80, description="Nominal coverage probability.")


class ScenarioProbabilities(BaseModel):
    """LLM-generated scenario probability distribution."""
    bear:      float = Field(default=0.20, description="Strong bearish scenario prob.")
    mild_bear: float = Field(default=0.20, description="Mild bearish scenario prob.")
    neutral:   float = Field(default=0.20, description="Neutral scenario prob.")
    mild_bull: float = Field(default=0.20, description="Mild bullish scenario prob.")
    bull:      float = Field(default=0.20, description="Strong bullish scenario prob.")
    consensus_change_pct: float = Field(
        default=0.0,
        description="Probability-weighted expected % change.",
    )


# ── Request schemas ────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    """
    Single-row or multi-row online inference request (v2).

    The caller passes a list of (date, currency_code) rows; the server
    applies the full feature-engineering + scaling + environmental pipeline
    and returns predictions in the same order.

    Fields
    ------
    rows          : List of dicts each containing at least
                    'date' (ISO-8601 string) and 'currency_code' (str).
    model         : Which artifact to use.
                    'lgb' | 'xgb' | 'stacking' (default: 'stacking').
    return_uncertainty  : Run MC-Dropout and return per-prediction std-dev.
    return_intervals    : Run Quantile model and return confidence intervals.
    return_scenarios    : Run LLM scenario generator and include probabilities.
    environmental_context : Optional context override (news, speeches, etc.).
    """
    rows: List[dict] = Field(
        ...,
        min_length=1,
        description="List of input rows. Each must contain 'date' and 'currency_code'.",
    )
    model: str = Field(
        default="stacking",
        description="Model artifact to use: lgb | xgb | stacking.",
    )
    return_uncertainty: bool = Field(
        default=False,
        description="Return MC-Dropout uncertainty estimates (stacking only).",
    )
    return_intervals: bool = Field(
        default=False,
        description="Return Q10/Q50/Q90 confidence intervals from Quantile model.",
    )
    return_scenarios: bool = Field(
        default=False,
        description="Return LLM-generated scenario probabilities.",
    )
    environmental_context: Optional[EnvironmentalContext] = Field(
        default=None,
        description="Optional environmental context overrides (sentiment, speeches, etc.).",
    )

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        allowed = {"lgb", "xgb", "stacking"}
        if v not in allowed:
            raise ValueError(f"model must be one of {allowed}, got '{v}'")
        return v

    @field_validator("rows")
    @classmethod
    def validate_rows(cls, v: list) -> list:
        for i, row in enumerate(v):
            if "date" not in row:
                raise ValueError(f"Row {i} missing 'date' field.")
            if "currency_code" not in row:
                raise ValueError(f"Row {i} missing 'currency_code' field.")
        return v


class BatchFileRequest(BaseModel):
    """
    Metadata for file-based batch inference (used alongside UploadFile).
    Validated separately from the file upload form data.
    """
    model: str = Field(default="stacking")
    return_uncertainty: bool = Field(default=False)
    return_intervals: bool = Field(default=False)
    return_scenarios: bool = Field(default=False)


# ── Response schemas ───────────────────────────────────────────────────────────

class PredictionRow(BaseModel):
    """A single prediction result row (v2 — backward-compatible with v1)."""
    date:            str
    currency_code:   str
    predicted_rate:  float
    # v1 field
    uncertainty: Optional[float] = Field(
        default=None,
        description="MC-Dropout std-dev. Populated when return_uncertainty=True.",
    )
    # v2 new fields
    confidence_interval: Optional[ConfidenceInterval] = Field(
        default=None,
        description="Q10/Q50/Q90 prediction interval. Populated when return_intervals=True.",
    )
    scenario_probabilities: Optional[ScenarioProbabilities] = Field(
        default=None,
        description="LLM scenario distribution. Populated when return_scenarios=True.",
    )
    driving_factors: Optional[str] = Field(
        default=None,
        description="LLM natural-language explanation of the key drivers for this prediction.",
    )
    sentiment_score: Optional[float] = Field(
        default=None,
        description="Environmental sentiment score [-1.0, +1.0] used in this prediction.",
    )
    cb_bias: Optional[str] = Field(
        default=None,
        description="Central bank stance inferred from speeches: hawkish | dovish | neutral.",
    )


class PredictResponse(BaseModel):
    """Successful prediction response (v2)."""
    model_used:     str
    n_predictions:  int
    predictions:    List[PredictionRow]
    pipeline_notes: Optional[str] = Field(
        default=None,
        description="Non-fatal warnings or notes from the inference pipeline.",
    )


class HealthResponse(BaseModel):
    """API health-check response."""
    status:           str
    model_dir:        str
    artifacts_loaded: bool
    models_available: List[str]


class ModelInfoResponse(BaseModel):
    """Metadata about a loaded model artifact."""
    model_name:          str
    model_dir:           str
    artifact_files:      List[str]
    n_currencies:        int
    feature_config_path: str


class SentimentResponse(BaseModel):
    """
    Response from the GET /sentiment/{currency_code} endpoint.
    Returns LLM-scored sentiment without running the full ML prediction.
    """
    currency_code:     str
    date:              str
    sentiment_score:   float = Field(description="[-1.0, +1.0]; negative=bearish, positive=bullish.")
    confidence:        float = Field(description="[0.0, 1.0] — LLM confidence in score.")
    cb_bias:           str   = Field(description="'hawkish' | 'dovish' | 'neutral'.")
    cb_bias_strength:  float = Field(description="[0.0, 1.0] — Strength of CB stance signal.")
    propaganda_score:  float = Field(description="[0.0, 1.0] — Estimated narrative manipulation.")
    scenario_weights:  Dict[str, float]
    n_articles:        int
    sources_used:      List[str]
    driving_headline:  str
    explanation:       str
