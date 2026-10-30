"""Read-only, bounded dashboard contract. No training, LLM calls or record writes."""
from __future__ import annotations

import inspect
import os
import threading
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import HTTPException

from src.data.loader import load_forex_data
from src.scripts.predict import preprocess
from src.features.inference_contract import predict_saved_models

MODEL_FILES = {"lgb": "lgb_model.pkl", "xgb": "xgb_model.pkl", "stacking": "stacking_meta.pkl"}
DISCLAIMER = "Saved-model outputs on historical input, not a held-out evaluation or live price feed. No external AI is called."


def bounded_records(frame: pd.DataFrame, maximum: int = 200) -> list[dict]:
    """Keep chronological endpoints without an unbounded JSON/chart payload."""
    frame = frame.sort_values("date").reset_index(drop=True)
    if len(frame) > maximum:
        frame = frame.iloc[np.linspace(0, len(frame) - 1, maximum, dtype=int)]
    records = []
    for row in frame.itertuples():
        records.append({"date": row.date.strftime("%Y-%m-%d"), "sourceDate": row.source_date.strftime("%Y-%m-%d"),
                        "observed": float(row.observed) if pd.notna(row.observed) and np.isfinite(row.observed) else None,
                        "modelRate": float(row.model_rate) if pd.notna(row.model_rate) and np.isfinite(row.model_rate) else None,
                        "estimatedDate": bool(row.estimated_date)})
    return records


def project_outputs(processed: pd.DataFrame, raw: pd.DataFrame, predictions, config: dict) -> pd.DataFrame:
    out = processed[["date", "currency_code", "exchange_rate"]].copy()
    out["model_rate"] = np.asarray(predictions).flatten()
    out = out.sort_values(["currency_code", "date"]).reset_index(drop=True)
    out["source_date"] = pd.to_datetime(out["date"])
    out["estimated_date"] = False
    mode = config.get("target", {}).get("mode", "raw_rate")
    if mode in ("log_return", "pct_change"):
        previous = out.groupby("currency_code")["exchange_rate"].shift(1)
        out["model_rate"] = previous * (np.exp(out["model_rate"]) if mode == "log_return" else 1 + out["model_rate"])
    elif mode == "n_step_ahead":
        steps = max(1, min(365, int(config.get("target", {}).get("n_steps_ahead", 1))))
        for _, indexes in out.groupby("currency_code").groups.items():
            dates = out.loc[indexes, "source_date"]
            targets = dates.shift(-steps)
            missing = targets.isna()
            targets.loc[missing] = [dates.max() + pd.Timedelta(days=i + 1) for i in range(int(missing.sum()))]
            out.loc[indexes, "date"] = targets.values
            out.loc[indexes, "estimated_date"] = missing.values
    actual = raw[["date", "currency_code", "exchange_rate"]].drop_duplicates(["date", "currency_code"], keep="last")
    out = out.drop(columns="exchange_rate").merge(actual.rename(columns={"exchange_rate": "observed"}), on=["date", "currency_code"], how="left")
    return out.sort_values(["currency_code", "date"]).reset_index(drop=True)


class WorkspaceDashboard:
    def __init__(self, data_path: str | None = None):
        self.data_path = Path(data_path or os.environ.get("DATA_PATH", "Dataset/Forex_Data.csv"))
        self._lock = threading.RLock()
        self._stamp = None
        self._raw = None
        self._predictions = {}
        self._processed = None
        self._predictor = None

    def _data(self):
        try:
            stat = self.data_path.stat()
            if stat.st_size > 50 * 1024 * 1024:
                raise ValueError("Dataset exceeds dashboard bounds")
            stamp = (stat.st_mtime_ns, stat.st_size)
            if stamp != self._stamp:
                raw = load_forex_data(str(self.data_path)).sort_values(["currency_code", "date"])
                raw["exchange_rate"] = pd.to_numeric(raw["exchange_rate"], errors="coerce")
                raw = raw[raw["exchange_rate"].gt(0) & np.isfinite(raw["exchange_rate"])].dropna(subset=["date", "currency_code"])
                if raw.empty:
                    raise ValueError("Empty dataset")
                self._raw, self._stamp, self._predictions = raw, stamp, {}
                self._processed = None
            return self._raw
        except (OSError, ValueError, KeyError):
            raise HTTPException(status_code=503, detail="Forex historical dataset is not available.")

    def metadata(self, predictor):
        with self._lock:
            raw = self._data()
            models = predictor.available_models if predictor and predictor.artifacts_loaded else []
            return {"currencies": sorted(raw["currency_code"].astype(str).unique().tolist()), "models": models,
                    "dateFrom": raw["date"].min().strftime("%Y-%m-%d"), "dateTo": raw["date"].max().strftime("%Y-%m-%d"),
                    "rows": len(raw), "source": "Configured Forex historical dataset", "disclaimer": DISCLAIMER,
                    "maxCurrencies": 6, "maxPointsPerCurrency": 200, "targetMode": predictor.feat_cfg.get("target", {}).get("mode", "raw_rate") if predictor else None}

    def history(self, predictor, model: str, currencies: list[str], window: int, period: str):
        with self._lock:
            raw = self._data()
            if not predictor or not predictor.artifacts_loaded or model not in predictor.available_models:
                raise HTTPException(status_code=503, detail="Saved model is not loaded.")
            codes = list(dict.fromkeys(currencies))
            if not codes or len(codes) > 6 or any(code not in set(raw["currency_code"]) for code in codes):
                raise HTTPException(status_code=422, detail="Select one to six configured currencies.")
            if model not in self._predictions:
                # Reuse loaded artifacts; preprocessing remains owned by Forex. Never invoke the environmental/LLM pipeline.
                if self._predictor is not predictor:
                    self._predictor, self._processed, self._predictions = predictor, None, {}
                if self._processed is None:
                    _, _, self._processed = preprocess(raw.copy(), predictor.feat_cfg, predictor.per_currency_scalers)
                processed = self._processed
                scaled = predict_saved_models(predictor._models, model, processed, predictor.per_currency_scalers).reshape(-1, 1)
                scaler = predictor.scaler_y
                predictions = scaler.inverse_transform(scaled, processed["currency_code"].values) if "currencies" in inspect.signature(scaler.inverse_transform).parameters else scaler.inverse_transform(scaled)
                self._predictions[model] = project_outputs(processed, raw, predictions, predictor.feat_cfg)
            projected = self._predictions[model]
            cutoff = raw["date"].max() - pd.Timedelta(days=window)
            series = []
            for code in codes:
                frame = projected[projected["currency_code"].eq(code)]
                frame = frame[frame["date"].ge(cutoff)] if period == "recent" else frame[frame["date"].lt(cutoff)]
                frame = frame.sort_values("date")
                observed = frame["observed"].dropna()
                returns = observed.pct_change(fill_method=None).dropna()
                series.append({"currency": code, "rows": len(frame), "points": bounded_records(frame),
                               "lastObserved": float(observed.iloc[-1]) if len(observed) else None,
                               "changePercent": float((observed.iloc[-1] / observed.iloc[0] - 1) * 100) if len(observed) > 1 else None,
                               "volatilityPercent": float(returns.std(ddof=1) * 100) if len(returns) > 1 else None,
                               "returnObservations": len(returns)})
            return {"series": series, "model": model, "period": period, "windowDays": window, "asOf": raw["date"].max().strftime("%Y-%m-%d"),
                    "disclaimer": DISCLAIMER, "sampled": any(s["rows"] > 200 for s in series), "pointLimit": 1200}
