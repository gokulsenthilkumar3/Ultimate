#!/usr/bin/env bash
set -e

echo ""
echo "======================================="
echo "  NiftyLens - Local Setup"
echo "======================================="
echo ""

# 1. Install npm dependencies
echo "[1/3] Installing npm dependencies..."
npm install
echo "  Done."

# 2. Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
  echo "[2/3] Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo ""
  echo "  ⚠   .env.local created. Fill in your Firebase values:"
  echo "      NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAkSj0de46GqMZsxWfq-ARO3kF7XtVChaQ"
  echo "      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=niftylens-e75c5.firebaseapp.com"
  echo "      NEXT_PUBLIC_FIREBASE_PROJECT_ID=niftylens-e75c5"
  echo "      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=niftylens-e75c5.firebasestorage.app"
  echo "      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=609686963123"
  echo "      NEXT_PUBLIC_FIREBASE_APP_ID=1:609686963123:web:603e098900bf373059c1c6"
  echo "      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-6DPB6Y49LS"
else
  echo "[2/3] .env.local already exists — skipping."
fi

# 3. Done
echo ""
echo "[3/3] Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Open .env.local and verify Firebase values are filled in"
echo "  2. Run: npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
