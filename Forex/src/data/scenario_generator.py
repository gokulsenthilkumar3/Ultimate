"""
src/data/scenario_generator.py
================================
LLM-powered "what-if" scenario generation for Forex predictions.

The ``LLMScenarioGenerator`` takes the current market context for a currency
pair (current rate, trend, economic indicators, CB stance, news sentiment) and
produces five probability-weighted scenarios: Bear, Mild-Bear, Neutral,
Mild-Bull, Bull — each with a predicted rate change, time horizon, economic
drivers, and risk factors.

These scenarios are then used by the ensemble layer to adjust model predictions
via ``scenario_weighted_adjustment()``.

Environment Variables
---------------------
OPENAI_API_KEY   – OpenAI key (preferred).
ANTHROPIC_API_KEY – Anthropic key (if LLM_PROVIDER=anthropic).
LLM_PROVIDER     – "openai" | "anthropic" | "mock"
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional

log = logging.getLogger(__name__)


# ── Data structures ────────────────────────────────────────────────────────────

SCENARIO_NAMES = ["bear", "mild_bear", "neutral", "mild_bull", "bull"]


@dataclass
class Scenario:
    """One scenario entry (e.g. 'Bull') from the LLM scenario generator."""
    name: str                    # "bear" | "mild_bear" | "neutral" | "mild_bull" | "bull"
    probability: float           # 0.0 – 1.0 (should sum to 1.0 across all 5 scenarios)
    predicted_change_pct: float  # Expected % change in exchange rate
    time_horizon_days: int       # Expected realisation horizon
    drivers: List[str]           # Economic / political drivers
    risk_factors: List[str]      # Risks that could invalidate this scenario
    confidence: float = 0.5      # Scenario-specific LLM confidence


@dataclass
class ScenarioSet:
    """
    Complete set of five scenarios for a (currency_pair, date) combination,
    plus a consensus-weighted rate adjustment.
    """
    currency_pair: str
    base_rate: float
    date: str
    scenarios: List[Scenario]
    consensus_change_pct: float = 0.0   # Probability-weighted expected % change
    overall_bias: str = "neutral"       # "bullish" | "bearish" | "neutral"
    overall_confidence: float = 0.5
    llm_reasoning: str = ""

    def adjusted_prediction(self, base_prediction: float, blend_weight: float = 0.25) -> float:
        """
        Blend base ML prediction with scenario consensus.

        Parameters
        ----------
        base_prediction  : The raw ML model output (exchange rate).
        blend_weight     : Weight given to LLM scenario adjustment (0.0 – 1.0).
        """
        scenario_pred = base_prediction * (1.0 + self.consensus_change_pct / 100.0)
        return (1.0 - blend_weight) * base_prediction + blend_weight * scenario_pred

    def to_weights_dict(self) -> Dict[str, float]:
        """Return scenario probabilities as a plain dict for the API response."""
        return {s.name: round(s.probability, 4) for s in self.scenarios}

    def to_feature_dict(self) -> Dict[str, float]:
        """Flatten scenario data into numeric features for the ML feature matrix."""
        weights = self.to_weights_dict()
        return {
            "scenario_consensus_change": self.consensus_change_pct,
            "scenario_bull_prob":        weights.get("bull", 0.2),
            "scenario_mild_bull_prob":   weights.get("mild_bull", 0.2),
            "scenario_neutral_prob":     weights.get("neutral", 0.2),
            "scenario_mild_bear_prob":   weights.get("mild_bear", 0.2),
            "scenario_bear_prob":        weights.get("bear", 0.2),
            "scenario_overall_confidence": self.overall_confidence,
        }


# ── LLM Scenario Generator ─────────────────────────────────────────────────────

class LLMScenarioGenerator:
    """
    Generates five market scenarios for a currency pair using an LLM.

    Parameters
    ----------
    provider : "openai" | "anthropic" | "mock"
    """

    def __init__(self, provider: Optional[str] = None):
        self.provider = (provider or os.getenv("LLM_PROVIDER", "openai")).lower()
        self._client = None
        self._setup()

    def _setup(self):
        if self.provider == "openai":
            key = os.getenv("OPENAI_API_KEY", "")
            if not key:
                log.warning("OPENAI_API_KEY not set — LLMScenarioGenerator in mock mode.")
                self.provider = "mock"
                return
            try:
                import openai
                self._client = openai.OpenAI(api_key=key)
            except ImportError:
                log.warning("openai package missing — ScenarioGenerator in mock mode.")
                self.provider = "mock"

        elif self.provider == "anthropic":
            key = os.getenv("ANTHROPIC_API_KEY", "")
            if not key:
                log.warning("ANTHROPIC_API_KEY not set — falling back to mock.")
                self.provider = "mock"
                return
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=key)
            except ImportError:
                log.warning("anthropic package missing — ScenarioGenerator in mock mode.")
                self.provider = "mock"

    # ── Public API ─────────────────────────────────────────────────────────────

    def generate(
        self,
        currency_pair: str,
        base_rate: float,
        date: str,
        context: Optional[Dict] = None,
    ) -> ScenarioSet:
        """
        Generate a ScenarioSet for the given currency pair and date.

        Parameters
        ----------
        currency_pair : e.g. "USD-INR", "EUR-USD"
        base_rate     : Current exchange rate
        date          : ISO-8601 date string "YYYY-MM-DD"
        context       : Optional dict with extra context, e.g.:
                        {
                          "trend": "weakening",
                          "sentiment_score": -0.3,
                          "cb_bias": "hawkish",
                          "gdp_growth": "2.1%",
                          "inflation": "5.4%",
                          "news_headline": "Fed holds rates steady"
                        }
        """
        context = context or {}
        if self.provider == "mock":
            return self._mock_scenarios(currency_pair, base_rate, date, context)

        prompt = self._build_prompt(currency_pair, base_rate, date, context)
        raw_json = self._call_llm(prompt)

        try:
            data = json.loads(raw_json)
            return self._parse_response(currency_pair, base_rate, date, data)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            log.warning(f"Scenario LLM response parse error: {e}; using mock.")
            return self._mock_scenarios(currency_pair, base_rate, date, context)

    # ── Internal helpers ────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        currency_pair: str,
        base_rate: float,
        date: str,
        context: Dict,
    ) -> str:
        ctx_lines = "\n".join(f"  - {k}: {v}" for k, v in context.items() if v)
        return f"""You are a senior Forex quantitative analyst.
Analyze the following market context for {currency_pair} on {date}:

Current Exchange Rate: {base_rate:.4f}
Context:
{ctx_lines if ctx_lines else "  - No additional context provided."}

Generate EXACTLY FIVE market scenarios for the next 7-30 days.
Respond ONLY in this JSON format (no extra keys):
{{
  "scenarios": [
    {{
      "name": "bear",
      "probability": <float 0-1>,
      "predicted_change_pct": <negative float, e.g. -2.5>,
      "time_horizon_days": <int 1-30>,
      "drivers": ["<driver1>", "<driver2>"],
      "risk_factors": ["<risk1>"],
      "confidence": <float 0-1>
    }},
    {{ "name": "mild_bear", ... }},
    {{ "name": "neutral", ... }},
    {{ "name": "mild_bull", ... }},
    {{ "name": "bull", ... }}
  ],
  "overall_bias": "<bullish|bearish|neutral>",
  "overall_confidence": <float 0-1>,
  "reasoning": "<one to two sentence summary>"
}}

Rules:
- Probabilities MUST sum to exactly 1.0.
- Bear scenarios have negative predicted_change_pct; bull scenarios have positive.
- Return scenarios in this order: bear, mild_bear, neutral, mild_bull, bull.
"""

    def _call_llm(self, prompt: str) -> str:
        system = "You are a Forex scenario analysis engine. Respond ONLY in valid JSON."
        if self.provider == "openai" and self._client:
            try:
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                    max_tokens=1200,
                )
                return resp.choices[0].message.content or "{}"
            except Exception as e:
                log.error(f"OpenAI scenario call failed: {e}")

        elif self.provider == "anthropic" and self._client:
            try:
                resp = self._client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=1200,
                    system=system,
                    messages=[{"role": "user", "content": prompt}],
                )
                return resp.content[0].text or "{}"
            except Exception as e:
                log.error(f"Anthropic scenario call failed: {e}")

        return "{}"

    def _parse_response(
        self,
        currency_pair: str,
        base_rate: float,
        date: str,
        data: Dict,
    ) -> ScenarioSet:
        raw_scenarios = data.get("scenarios", [])
        scenarios: List[Scenario] = []

        # Ensure all 5 standard names present
        seen_names = {s.get("name") for s in raw_scenarios}
        for name in SCENARIO_NAMES:
            if name not in seen_names:
                raw_scenarios.append({"name": name, "probability": 0.2, "predicted_change_pct": 0.0,
                                       "time_horizon_days": 7, "drivers": [], "risk_factors": [], "confidence": 0.5})

        # Parse and normalise probabilities
        for s in raw_scenarios:
            if s.get("name") not in SCENARIO_NAMES:
                continue
            scenarios.append(Scenario(
                name=str(s.get("name", "neutral")),
                probability=float(s.get("probability", 0.2)),
                predicted_change_pct=float(s.get("predicted_change_pct", 0.0)),
                time_horizon_days=int(s.get("time_horizon_days", 7)),
                drivers=[str(d) for d in s.get("drivers", [])],
                risk_factors=[str(r) for r in s.get("risk_factors", [])],
                confidence=float(s.get("confidence", 0.5)),
            ))

        # Sort in canonical order
        order = {n: i for i, n in enumerate(SCENARIO_NAMES)}
        scenarios.sort(key=lambda s: order.get(s.name, 99))

        # Normalise probabilities to sum to 1
        total_prob = sum(s.probability for s in scenarios) or 1.0
        for s in scenarios:
            s.probability = round(s.probability / total_prob, 4)

        # Consensus change (probability-weighted)
        consensus_change = sum(s.probability * s.predicted_change_pct for s in scenarios)

        return ScenarioSet(
            currency_pair=currency_pair,
            base_rate=base_rate,
            date=date,
            scenarios=scenarios,
            consensus_change_pct=round(consensus_change, 4),
            overall_bias=str(data.get("overall_bias", "neutral")),
            overall_confidence=float(data.get("overall_confidence", 0.5)),
            llm_reasoning=str(data.get("reasoning", "")),
        )

    def _mock_scenarios(
        self,
        currency_pair: str,
        base_rate: float,
        date: str,
        context: Dict,
    ) -> ScenarioSet:
        """
        Deterministic mock ScenarioSet for offline / CI use.
        Uses context['sentiment_score'] if available to skew probabilities.
        """
        sentiment = float(context.get("sentiment_score", 0.0))
        # Skew toward bull/bear based on sentiment
        bear_p      = max(0.05, 0.20 - sentiment * 0.15)
        mild_bear_p = max(0.05, 0.20 - sentiment * 0.08)
        neutral_p   = 0.20
        mild_bull_p = max(0.05, 0.20 + sentiment * 0.08)
        bull_p      = max(0.05, 0.20 + sentiment * 0.15)
        total = bear_p + mild_bear_p + neutral_p + mild_bull_p + bull_p
        probabilities = [x / total for x in [bear_p, mild_bear_p, neutral_p, mild_bull_p, bull_p]]
        changes = [-3.2, -1.2, 0.0, 1.2, 3.2]

        scenarios = [
            Scenario(
                name=name,
                probability=round(prob, 4),
                predicted_change_pct=chg,
                time_horizon_days=14,
                drivers=["Mock economic driver", "Simulated policy stance"],
                risk_factors=["Mock risk factor"],
                confidence=0.45,
            )
            for name, prob, chg in zip(SCENARIO_NAMES, probabilities, changes)
        ]
        consensus = sum(s.probability * s.predicted_change_pct for s in scenarios)
        bias = "bullish" if consensus > 0.1 else ("bearish" if consensus < -0.1 else "neutral")

        return ScenarioSet(
            currency_pair=currency_pair,
            base_rate=base_rate,
            date=date,
            scenarios=scenarios,
            consensus_change_pct=round(consensus, 4),
            overall_bias=bias,
            overall_confidence=0.45,
            llm_reasoning="Mock scenario set generated without LLM API access.",
        )
