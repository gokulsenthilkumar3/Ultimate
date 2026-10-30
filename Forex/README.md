# Forex research and inference

Currency-data preparation, model research, saved-model inference and a Streamlit research dashboard.

**Runtime:** Python, Streamlit and FastAPI, with model dependencies in requirements.txt.

**Status:** Native Forex Studio in Ultimate uses cached, bounded Python history endpoints and existing saved artifacts. The independent Streamlit dashboard remains available.

## Setup

Run these commands from this application directory. Configure required values locally before starting the live application.

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run

```powershell
.venv\Scripts\python.exe -m streamlit run app/dashboard.py
```

## Configuration

- DATA_PATH, MODEL_DIR and FEAT_CONFIG select local data, artifacts and feature configuration. Set them in the process environment before launching; copying an env file alone does not load it.
- Provider keys are optional server/process configuration. Do not commit source data containing private records or exported model-provider credentials.

Keep credentials in ignored local environment files or a deployment secret manager. Tracked examples contain empty secret fields. Do not paste passwords, keys, personal records or production connection strings into this README. `NEXT_PUBLIC_`, `VITE_` and `EXPO_PUBLIC_` values are visible to clients.

## Verification

```powershell
.venv\Scripts\python.exe -m pytest tests
```

## Scope and limitations

- For the API, run .venv\Scripts\python.exe -m uvicorn src.api.app:app --host 127.0.0.1 --port 8000.
- Use a Python version compatible with the pinned dependencies; installation can be substantial and is not performed for the UI demo.
- Forex-Ensemble-Prediction/ is historical reference source, not a second default application. The preview does not certify model quality or provide investment advice.
- Native workspace endpoints do not call external AI or train models. Historical fitted outputs are not held-out accuracy or live prices.

## Workspace documentation

- [Application directory](../docs/APPLICATIONS.md)
- [Ownership and independent builds](../docs/BUILD_BOUNDARIES.md)
- [Desktop redesign and architecture](../docs/plans/2026-10-28-admin-redesign.md)
- [Complete architecture and UI review handoff](../docs/UI_ARCHITECTURE_HANDOFF.md)
- [Implemented UI proposal and remaining review gates](../docs/plans/2026-10-28-proposal-implementation.md)
- [Approved production UI integration](../docs/plans/2026-10-28-production-ui.md)
- [UI impact and scale checks](../docs/plans/2026-10-28-ui-system-impact.md)
- [Code retrieval and embedding plan](../docs/plans/2026-10-28-code-retrieval.md)

<!-- Generated from docs/applications.json by scripts/application-docs.mjs. Edit the catalog, then regenerate. -->
