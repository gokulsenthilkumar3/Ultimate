"""Recover the training column contract from saved feature scalers, never pad synthetic columns."""
from __future__ import annotations

import re
import numpy as np
import pandas as pd


def saved_feature_frame(frame: pd.DataFrame, scalers: dict, model=None):
    out = frame.copy()
    fitted_codes = sorted(scalers)
    if fitted_codes:
        unknown = set(out["currency_code"]) - set(fitted_codes)
        if unknown:
            raise ValueError("Input contains currencies without saved feature scalers")
        columns = list(scalers[fitted_codes[0]]["cols"])
        if any(list(value["cols"]) != columns for value in scalers.values()):
            raise ValueError("Saved currency feature contracts disagree")
        # main.py saves feature columns in order, followed by alphabetical drop-first currency dummies.
        dummies = pd.get_dummies(pd.Categorical(out["currency_code"], categories=fitted_codes), prefix="currency_code", drop_first=True, dtype=int)
        dummies.index = out.index
        for column in dummies:
            out[column] = dummies[column]
        canonical = columns + list(dummies.columns)
    else:
        canonical = [column for column in out.select_dtypes(include=[np.number]).columns if column not in {"exchange_rate", "target", "_orig_idx"}]
    names = getattr(model, "feature_name_", None)
    if names is None and hasattr(model, "get_booster"):
        names = model.get_booster().feature_names
    if names is None and hasattr(model, "feature_names_in_"):
        names = list(model.feature_names_in_)
    generic = names is not None and all(re.fullmatch(r"(?:Column_|f)\d+", str(name)) for name in names)
    selected = canonical if not names or generic else list(names)
    expected = getattr(model, "n_features_in_", len(selected))
    if expected != len(selected) or any(column not in out for column in selected):
        raise ValueError("Saved model feature contract does not match the configured feature pipeline")
    return out, selected


def predict_saved_models(models: dict, name: str, frame: pd.DataFrame, scalers: dict):
    def base(model_name):
        if model_name not in models:
            raise ValueError("A required base model is not loaded")
        encoded, columns = saved_feature_frame(frame, scalers, models[model_name])
        return np.asarray(models[model_name].predict(encoded[columns].values.astype(np.float32))).flatten()
    if name != "stacking":
        return base(name)
    ensemble = models[name]
    names = getattr(getattr(ensemble, "_meta", None), "model_names_", None) or list(getattr(ensemble, "val_maes_", {}))
    if not names:
        raise ValueError("The stacking artifact is missing its ordered base-model contract")
    aliases = {"xgboost": "xgb", "lightgbm": "lgb", "xgb": "xgb", "lgb": "lgb"}
    order = [aliases.get(str(model_name).lower()) for model_name in names]
    if any(model_name is None for model_name in order):
        raise ValueError("The stacking artifact requires an unavailable base model")
    return np.asarray(ensemble.predict(np.column_stack([base(model_name) for model_name in order]))).flatten()
