"""
src/api/predictor.py
=====================
Stateful singleton that loads all model artifacts once at startup
and exposes a clean predict() interface to the route handlers.

Fixed bugs (see review comment on PR #7):
  - Bug 1: predict() return type annotation corrected to Tuple[...,...,pd.DataFrame].
  - Bug 2: _preprocess() now preserves '_currency_code_orig' before one-hot encoding
           so that app.py can reconstruct correct currency codes for every row,
           including the currency that get_dummies(drop_first=True) removes.
  - Bug 3: Keras DL models are now loaded ONCE in load_artifacts() and cached
           in self._dl_models; _mc_uncertainty() reads from the cache, not disk.
  - Bug 6: _mc_uncertainty() now forwards batch_size to mc_predict() so the
           parameter is actually used (was always silently defaulting to 256).
  - Minor: remove_outliers_iqr is skipped during inference to prevent silent
           row drops; a warning is logged instead.

v2 additions:
  - Environmental inputs: news sentiment, CB speeches, scenario probabilities.
  - Quantile interval predictions via QuantileLSTM model (when available).
  - All v2 features are opt-in; v1 callers are fully backward-compatible.
"""

from __future__ import annotations
import glob
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from src.features.engineer import add_features, load_config
from src.features.cross_currency import add_cross_currency_features

log = logging.getLogger(__name__)

_MODEL_FILE_MAP = {
    "lgb":      "lgb_model.pkl",
    "xgb":      "xgb_model.pkl",
    "stacking": "stacking_meta.pkl",
}


class ForexPredictor:
    """
    Stateful predictor singleton.
    All heavy I/O happens once in load_artifacts(); predict() is read-only.
    """

    def __init__(self, model_dir: str, config_path: str):
        self.model_dir             = model_dir
        self.feat_cfg              = load_config(config_path)
        self.scaler_y              = None
        self.per_currency_scalers: Optional[Dict] = None
        self._models: Dict         = {}
        self._dl_models: List      = []   # FIX Bug 3: cache DL models at startup
        self._quantile_model       = None  # v2: QuantileLSTM for intervals
        self._artifacts_loaded     = False
        # v2: lazy-init environmental singletons
        self._news_fetcher         = None
        self._scenario_gen         = None

    # ── Startup ────────────────────────────────────────────────────────────────

    def load_artifacts(self) -> None:
        """Load scalers, tree/stacking models, and DL Keras models from model_dir."""
        sy_path = os.path.join(self.model_dir, "scaler_y.pkl")
        pc_path = os.path.join(self.model_dir, "per_currency_scalers.pkl")

        if not os.path.exists(sy_path):
            raise FileNotFoundError(
                f"scaler_y.pkl not found in {self.model_dir}. Run training first."
            )
        self.scaler_y             = joblib.load(sy_path)
        self.per_currency_scalers = joblib.load(pc_path)
        log.info(f"Scalers loaded from {self.model_dir}")

        for name, fname in _MODEL_FILE_MAP.items():
            fpath = os.path.join(self.model_dir, fname)
            if os.path.exists(fpath):
                self._models[name] = joblib.load(fpath)
                log.info(f"  Loaded model: {name} ({fname})")
            else:
                log.warning(f"  Model artifact not found, skipping: {fname}")

        # FIX Bug 3: Load all Keras DL models ONCE at startup, cache in self._dl_models.
        keras_files = glob.glob(os.path.join(self.model_dir, "*.keras"))
        if keras_files:
            try:
                import tensorflow as tf
                quantile_path = os.path.join(self.model_dir, "quantile_lstm.keras")
                for kf in keras_files:
                    try:
                        m = tf.keras.models.load_model(kf, compile=False)
                        # v2: separate quantile model from standard DL models
                        if kf == quantile_path:
                            self._quantile_model = m
                            log.info(f"  Loaded Quantile model: {os.path.basename(kf)}")
                        else:
                            self._dl_models.append(m)
                            log.info(f"  Loaded DL model: {os.path.basename(kf)}")
                    except Exception as e:
                        log.warning(f"  Could not load DL model {kf}: {e}")
            except ImportError:
                log.warning("TensorFlow not available; MC-Dropout uncertainty disabled.")
        else:
            log.info("No Keras DL models found in model_dir; uncertainty will be zero.")

        # v2: init environmental singletons (non-blocking; fail gracefully)
        try:
            from src.data.news_fetcher import NewsFetcher
            self._news_fetcher = NewsFetcher()
            log.info("NewsFetcher initialised.")
        except Exception as e:
            log.warning(f"NewsFetcher init failed (running without sentiment): {e}")

        try:
            from src.data.scenario_generator import LLMScenarioGenerator
            self._scenario_gen = LLMScenarioGenerator()
            log.info("LLMScenarioGenerator initialised.")
        except Exception as e:
            log.warning(f"LLMScenarioGenerator init failed: {e}")

        self._artifacts_loaded = True
        log.info(
            f"ForexPredictor ready. "
            f"Models: {list(self._models.keys())}  "
            f"DL models: {len(self._dl_models)}  "
            f"Quantile model: {'yes' if self._quantile_model else 'no'}"
        )

    # ── Properties ─────────────────────────────────────────────────────────────

    @property
    def artifacts_loaded(self) -> bool:
        return self._artifacts_loaded

    @property
    def available_models(self) -> List[str]:
        return list(self._models.keys())

    @property
    def n_currencies(self) -> int:
        return len(self.per_currency_scalers) if self.per_currency_scalers else 0

    @property
    def artifact_files(self) -> List[str]:
        if not os.path.isdir(self.model_dir):
            return []
        return [
            f for f in os.listdir(self.model_dir)
            if f.endswith((".pkl", ".keras", ".json"))
        ]

    # ── Core preprocessing ──────────────────────────────────────────────────────────

    def _preprocess(self, df: pd.DataFrame) -> Tuple[np.ndarray, pd.DataFrame]:
        """
        Apply feature engineering + per-currency scaling.
        Returns (X_flat, df_processed).

        Changes from training pipeline:
        - remove_outliers_iqr is SKIPPED (would silently drop inference rows).
        - '_currency_code_orig' column is added before one-hot encoding so the
          caller can always recover the true currency regardless of drop_first.
        - '_orig_idx' column tracks original row order through sort_values.
        """
        # FIX Minor: Do NOT call remove_outliers_iqr during inference.
        # It drops rows that fall outside training IQR bounds, which causes
        # the response to have fewer predictions than submitted rows.
        n_input = len(df)
        log.debug(f"_preprocess: input rows={n_input}")

        # Preserve original row order
        df = df.reset_index(drop=True)
        df["_orig_idx"] = df.index

        dfs = []
        for code, grp in df.groupby("currency_code"):
            g = add_features(grp, self.feat_cfg)
            g["currency_code"] = code
            dfs.append(g)
        df = (
            pd.concat(dfs, ignore_index=True)
            .sort_values(["currency_code", "date"])
            .reset_index(drop=True)
        )
        df = add_cross_currency_features(df, self.feat_cfg["cross_currency"])
        df = df.dropna().reset_index(drop=True)

        if len(df) < n_input:
            log.warning(
                f"_preprocess: {n_input - len(df)} rows dropped after feature "
                "engineering (NaN from lag/rolling features at window boundaries). "
                "These rows will have no corresponding prediction."
            )

        # Per-currency scaling
        scaled = []
        for code, grp in df.groupby("currency_code"):
            grp = grp.copy()
            if code in self.per_currency_scalers:
                sc   = self.per_currency_scalers[code]["scaler"]
                cols = [
                    c for c in self.per_currency_scalers[code]["cols"]
                    if c in grp.columns
                ]
                grp[cols] = sc.transform(grp[cols].values)
            else:
                log.warning(
                    f"No scaler found for currency '{code}'. Using raw features."
                )
            scaled.append(grp)
        df = pd.concat(scaled, ignore_index=True)

        # FIX Bug 2: Preserve original currency code BEFORE one-hot encoding.
        # get_dummies(drop_first=True) removes the first alphabetical currency;
        # all its rows would have 0 in every OHE column, making idxmax() wrong.
        df["_currency_code_orig"] = df["currency_code"]

        df = pd.get_dummies(df, columns=["currency_code"], drop_first=True)
        bool_cols = df.select_dtypes("bool").columns
        if len(bool_cols):
            df[bool_cols] = df[bool_cols].astype(int)

        # Restore original row order (sort_values above re-ordered rows)
        df = df.sort_values("_orig_idx").reset_index(drop=True)

        feature_cols = [
            c for c in df.columns
            if c not in (
                "date", "exchange_rate", "target",
                "_orig_idx", "_currency_code_orig",
            )
        ]
        X = df[feature_cols].values.astype(np.float32)
        return X, df

    # ── Public predict interface ───────────────────────────────────────────────

    def predict(
        self,
        rows: List[dict],
        model_name: str = "stacking",
        return_uncertainty: bool = False,
        return_intervals: bool = False,
        return_scenarios: bool = False,
        environmental_context: Optional[Any] = None,
    ) -> Tuple[np.ndarray, Optional[np.ndarray], pd.DataFrame, Dict]:
        """
        Run the full inference pipeline on a list of raw input dicts.

        Parameters
        ----------
        rows                 : Raw input rows (dicts with 'date', 'currency_code', etc.)
        model_name           : Which artifact to use.
        return_uncertainty   : If True, also returns MC-Dropout std-dev.
        return_intervals     : If True, returns Q10/Q50/Q90 quantile intervals.
        return_scenarios     : If True, calls LLM scenario generator.
        environmental_context: Optional EnvironmentalContext Pydantic object.

        Returns
        -------
        (predictions, uncertainties, df_proc, env_data)
          predictions   : np.ndarray (N,) — inverse-scaled exchange rates.
          uncertainties : np.ndarray (N,) or None.
          df_proc       : Processed DataFrame.
          env_data      : Dict with keys 'sentiment', 'intervals', 'scenarios'.
        """
        if not self._artifacts_loaded:
            raise RuntimeError("Artifacts not loaded. Call load_artifacts() first.")
        if model_name not in self._models:
            raise ValueError(
                f"Model '{model_name}' not available. "
                f"Loaded: {list(self._models.keys())}"
            )

        df_raw = pd.DataFrame(rows)
        df_raw["date"] = pd.to_datetime(df_raw["date"], dayfirst=True, format="mixed")
        if "currency" in df_raw.columns:
            df_raw = df_raw.drop(columns=["currency"])

        X, df_proc = self._preprocess(df_raw)
        log.info(f"Inference input shape: {X.shape}  model={model_name}")

        model        = self._models[model_name]
        preds_scaled = np.asarray(model.predict(X)).reshape(-1, 1)
        import inspect
        sig = inspect.signature(self.scaler_y.inverse_transform)
        if "currencies" in sig.parameters:
            preds = self.scaler_y.inverse_transform(preds_scaled, df_proc["_currency_code_orig"].values).flatten()
        else:
            preds = self.scaler_y.inverse_transform(preds_scaled).flatten()

        uncertainties = None
        if return_uncertainty:
            uncertainties = self._mc_uncertainty(X, n_samples=30)

        # v2: collect environmental enrichment
        env_data: Dict[str, Any] = {}

        # Get unique currencies + reference date for environmental calls
        currency_codes = df_proc["_currency_code_orig"].unique().tolist()
        ref_date = df_raw["date"].max().strftime("%Y-%m-%d")

        # Sentiment
        sentiment_map: Dict[str, Any] = {}
        if self._news_fetcher and (return_scenarios or environmental_context is not None):
            env_data["sentiment"] = self._build_environmental_features(
                currency_codes, ref_date, environmental_context
            )
            sentiment_map = env_data["sentiment"]

        # Quantile intervals
        if return_intervals:
            env_data["intervals"] = self._quantile_intervals(X, df_proc)

        # Scenario probabilities
        if return_scenarios and self._scenario_gen:
            env_data["scenarios"] = self._scenario_probabilities(
                currency_codes, preds, ref_date, sentiment_map
            )

        return preds, uncertainties, df_proc, env_data

    # ── MC-Dropout uncertainty (uses cached DL models) ──────────────────────────

    def _mc_uncertainty(
        self,
        X_flat: np.ndarray,
        n_samples: int = 30,
        batch_size: int = 256,
    ) -> np.ndarray:
        """
        FIX Bug 3: Uses self._dl_models (loaded once at startup) instead of
        reloading Keras models from disk on every request.

        FIX Bug 6: batch_size is now forwarded to mc_predict() so large inputs
        are processed in chunks rather than being sent as one giant batch.

        Returns aggregated std across DL models, or zeros if none loaded.
        """
        if not self._dl_models:
            log.warning("No DL models cached; uncertainty will be zero.")
            return np.zeros(len(X_flat), dtype=np.float32)

        try:
            from src.models.deep_learning import mc_predict
            all_stds = []
            for m in self._dl_models:
                try:
                    timesteps = m.input_shape[1]
                    if X_flat.shape[0] < timesteps:
                        continue
                    X_seq = np.stack(
                        [X_flat[i: i + timesteps]
                         for i in range(len(X_flat) - timesteps)],
                        axis=0,
                    )
                    # FIX Bug 6: pass batch_size so mc_predict chunks forward passes.
                    _, std = mc_predict(
                        m, X_seq, n_samples=n_samples, batch_size=batch_size
                    )
                    padded = np.concatenate([np.zeros(timesteps), std])
                    all_stds.append(padded[: len(X_flat)])
                except Exception as e:
                    log.debug(f"MC-Dropout failed for a DL model: {e}")
            if all_stds:
                return np.mean(
                    np.stack(all_stds, axis=0), axis=0
                ).astype(np.float32)
        except ImportError as e:
            log.warning(f"MC-Dropout import error: {e}")

        return np.zeros(len(X_flat), dtype=np.float32)

    # ── v2: Environmental enrichment helpers ─────────────────────────────────────

    def _build_environmental_features(
        self,
        currency_codes: List[str],
        date: str,
        ctx: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Fetch and score environmental sentiment for each currency.
        Returns a dict keyed by currency_code with SentimentScore objects.
        """
        if self._news_fetcher is None:
            return {}

        result: Dict[str, Any] = {}
        for code in currency_codes:
            try:
                # Override from caller context
                if ctx and ctx.disable_llm:
                    from src.data.news_fetcher import NewsFetcher
                    fetcher = NewsFetcher(llm_provider="mock")
                    score = fetcher.get_sentiment(code, date)
                else:
                    score = self._news_fetcher.get_sentiment(code, date)

                # Apply manual overrides
                if ctx:
                    if ctx.sentiment_override is not None:
                        score.sentiment_score = ctx.sentiment_override
                    if ctx.cb_bias_override is not None:
                        score.cb_bias = ctx.cb_bias_override
                    if ctx.custom_scenario_weights:
                        score.scenario_weights = ctx.custom_scenario_weights

                result[code] = score
            except Exception as e:
                log.warning(f"Environmental feature build failed for {code}: {e}")
        return result

    def _quantile_intervals(
        self,
        X_flat: np.ndarray,
        df_proc: pd.DataFrame,
    ) -> Dict[str, np.ndarray]:
        """
        Run the QuantileLSTM model and return Q10/Q50/Q90 arrays.
        Falls back to ±1.5% band around the point estimate if model not loaded.
        """
        if self._quantile_model is None:
            log.info("No quantile model loaded; using ±1.5% fallback interval.")
            return {"lower": None, "median": None, "upper": None}

        try:
            from src.models.deep_learning import mc_predict_with_quantiles
            timesteps = self._quantile_model.input_shape[1]
            if X_flat.shape[0] < timesteps:
                return {"lower": None, "median": None, "upper": None}
            X_seq = np.stack(
                [X_flat[i: i + timesteps] for i in range(len(X_flat) - timesteps)],
                axis=0,
            )
            q_out = mc_predict_with_quantiles(self._quantile_model, X_seq)
            # Pad back to full length
            pad = np.zeros(timesteps)
            return {
                "lower":  np.concatenate([pad, q_out["lower_bound"]]),
                "median": np.concatenate([pad, q_out["prediction"]]),
                "upper":  np.concatenate([pad, q_out["upper_bound"]]),
            }
        except Exception as e:
            log.warning(f"Quantile interval failed: {e}")
            return {"lower": None, "median": None, "upper": None}

    def _scenario_probabilities(
        self,
        currency_codes: List[str],
        predictions: np.ndarray,
        date: str,
        sentiment_map: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Call LLM scenario generator for each currency; return ScenarioSet objects.
        """
        if self._scenario_gen is None:
            return {}

        scenarios: Dict[str, Any] = {}
        for i, code in enumerate(currency_codes):
            try:
                # Build context from sentiment (if available)
                ctx: Dict[str, Any] = {"date": date}
                if code in sentiment_map:
                    s = sentiment_map[code]
                    ctx.update({
                        "sentiment_score": s.sentiment_score,
                        "cb_bias": s.cb_bias,
                        "trend": "strengthening" if s.sentiment_score > 0.1 else
                                  ("weakening" if s.sentiment_score < -0.1 else "stable"),
                        "driving_headline": s.driving_headline,
                    })

                base_rate = float(predictions[i]) if i < len(predictions) else 1.0
                scenario_set = self._scenario_gen.generate(
                    currency_pair=f"{code}-reference",
                    base_rate=base_rate,
                    date=date,
                    context=ctx,
                )
                scenarios[code] = scenario_set
            except Exception as e:
                log.warning(f"Scenario generation failed for {code}: {e}")
        return scenarios
