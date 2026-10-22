#!/usr/bin/env bash
set -e

echo ""
echo "======================================="
echo "  NiftyLens Pipeline - Local Setup"
echo "======================================="
echo ""

# 1. Create virtual env
if [ ! -d ".venv" ]; then
  echo "[1/3] Creating Python virtual environment..."
  python3 -m venv .venv
else
  echo "[1/3] Virtual environment already exists — skipping."
fi

# 2. Install dependencies
echo "[2/3] Installing Python dependencies..."
source .venv/bin/activate
pip install -r pipeline/requirements.txt
echo "  Done."

# 3. Create pipeline .env if missing
if [ ! -f "pipeline/.env" ]; then
  echo "[3/3] Creating pipeline/.env from pipeline/.env.example..."
  cp pipeline/.env.example pipeline/.env
  echo ""
  echo "  ⚠   pipeline/.env created."
  echo "      Fill in FIREBASE_SERVICE_ACCOUNT_JSON with your service account key."
  echo "      Get it from: Firebase Console → Project Settings → Service Accounts"
else
  echo "[3/3] pipeline/.env already exists — skipping."
fi

echo ""
echo "Setup complete!"
echo ""
echo "  To run the pipeline locally:"
echo "  source .venv/bin/activate && uvicorn pipeline.main:app --reload"
echo ""
