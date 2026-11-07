"""Synthetic compatibility checks: no saved models, customer data or network."""
import os

os.environ["MLFLOW_DISABLE_TELEMETRY"] = "true"
os.environ["MLFLOW_DISABLE_AGENT_HINT"] = "true"


def test_patched_torch_preserves_forward_and_safe_weight_loading(tmp_path):
    import torch
    from src.models.deep_forex_model import CNNLSTMAttention

    model = CNNLSTMAttention(3, 8, cnn_filters=4, lstm_hidden=4, dropout_rate=0)
    model.eval()
    with torch.no_grad():
        result, _ = model(torch.zeros(2, 8, 3))
        assert result.shape == (2, 1)
        assert torch.isfinite(result).all()
    filename = tmp_path / "synthetic.pt"
    torch.save(model.state_dict(), filename)
    model.load_state_dict(torch.load(filename, weights_only=True))


def test_lightweight_tracking_preserves_local_experiments(tmp_path):
    from src.mlops import experiment

    experiment.setup_mlflow("synthetic-security-smoke", str(tmp_path / "mlruns"))
    with experiment.start_run("synthetic"):
        experiment.log_params({"synthetic": True})
        experiment.log_metrics({"synthetic_metric": 1.0})
    assert os.environ["MLFLOW_DISABLE_TELEMETRY"] == "true"
