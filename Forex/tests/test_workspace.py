import unittest
from unittest.mock import patch
from types import SimpleNamespace

import numpy as np
import pandas as pd
from fastapi import HTTPException

from src.api.workspace import WorkspaceDashboard, bounded_records, project_outputs
from src.features.inference_contract import saved_feature_frame, predict_saved_models


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.raw = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=400), "currency_code": ["USD"] * 400, "exchange_rate": np.arange(400) + 10.0})

    def test_projection_preserves_chronological_values(self):
        frame = self.raw.iloc[:3].iloc[::-1]
        result = project_outputs(frame, self.raw, [31, 21, 11], {"target": {"mode": "raw_rate"}})
        self.assertEqual(result.model_rate.tolist(), [11, 21, 31])
        self.assertEqual(result.observed.tolist(), [10, 11, 12])

    def test_future_targets_have_no_fictional_observation(self):
        result = project_outputs(self.raw, self.raw, np.ones(400), {"target": {"mode": "n_step_ahead", "n_steps_ahead": 2}})
        self.assertEqual(int(result.estimated_date.sum()), 2)
        self.assertTrue(result.tail(2).observed.isna().all())
        self.assertEqual(result.iloc[0].observed, 12)

    def test_bound_keeps_endpoints_and_null_gaps(self):
        frame = project_outputs(self.raw, self.raw, np.ones(400), {})
        frame.loc[0, "model_rate"] = np.nan
        records = bounded_records(frame)
        self.assertEqual(len(records), 200)
        self.assertEqual(records[0]["date"], "2026-01-01")
        self.assertEqual(records[-1]["date"], self.raw.date.max().strftime("%Y-%m-%d"))
        self.assertIsNone(records[0]["modelRate"])

    def test_dashboard_reuses_model_outputs_and_reports_honest_volatility(self):
        calls = []
        model = SimpleNamespace(predict=lambda X: calls.append(1) or np.ones(len(X)))
        scaler = SimpleNamespace(inverse_transform=lambda X: X)
        predictor = SimpleNamespace(artifacts_loaded=True, available_models=["lgb"], _models={"lgb": model}, feat_cfg={}, per_currency_scalers={}, scaler_y=scaler)
        dashboard = WorkspaceDashboard()
        with patch.object(dashboard, "_data", return_value=self.raw), patch("src.api.workspace.preprocess", return_value=(np.ones((400, 1)), [], self.raw)):
            history = dashboard.history(predictor, "lgb", ["USD"], 30, "history")
            recent = dashboard.history(predictor, "lgb", ["USD"], 30, "recent")
            self.assertEqual(len(calls), 1)
            self.assertEqual(len(history["series"][0]["points"]), 200)
            self.assertTrue(history["sampled"])
            self.assertEqual(recent["series"][0]["returnObservations"], 30)
            self.assertIn("not a held-out", recent["disclaimer"])
            with self.assertRaises(HTTPException): dashboard.history(predictor, "lgb", ["UNKNOWN"], 30, "recent")
            with self.assertRaises(HTTPException): dashboard.history(predictor, "lgb", [str(i) for i in range(7)], 30, "recent")

    def test_generic_model_names_use_saved_training_order_not_zero_columns(self):
        frame = pd.DataFrame({"currency_code": ["BBB", "AAA"], "second": [20.0, 30.0], "first": [2.0, 3.0], "new_feature": [999, 999]})
        scalers = {code: {"cols": ["first", "second"]} for code in ["AAA", "BBB"]}
        model = SimpleNamespace(feature_name_=["Column_0", "Column_1", "Column_2"], n_features_in_=3)
        encoded, columns = saved_feature_frame(frame, scalers, model)
        self.assertEqual(columns, ["first", "second", "currency_code_BBB"])
        self.assertEqual(encoded[columns].values.tolist(), [[2, 20, 1], [3, 30, 0]])
        # A subset still uses the fitted drop-first category, not the current batch's first category.
        subset, columns = saved_feature_frame(frame.iloc[:1], scalers, model)
        self.assertEqual(subset["currency_code_BBB"].iloc[0], 1)

    def test_incompatible_contract_fails_instead_of_guessing(self):
        frame = pd.DataFrame({"currency_code": ["AAA"], "first": [2.]})
        with self.assertRaises(ValueError): saved_feature_frame(frame, {"AAA": {"cols": ["missing"]}}, SimpleNamespace(n_features_in_=1))
        with self.assertRaises(ValueError): saved_feature_frame(frame, {"AAA": {"cols": ["first"]}}, SimpleNamespace(n_features_in_=2))

    def test_stacking_uses_ordered_base_predictions_not_market_features(self):
        frame = pd.DataFrame({"currency_code": ["AAA"], "first": [99.]})
        scaler = {"AAA": {"cols": ["first"]}}
        ensemble = SimpleNamespace(_meta=SimpleNamespace(model_names_=["XGBoost", "LightGBM"]), predict=lambda X: X @ np.array([.25, .75]))
        models = {"stacking": ensemble, "xgb": SimpleNamespace(predict=lambda X: np.array([4.])), "lgb": SimpleNamespace(predict=lambda X: np.array([8.]))}
        self.assertEqual(predict_saved_models(models, "stacking", frame, scaler).tolist(), [7.])


if __name__ == "__main__":
    unittest.main()
