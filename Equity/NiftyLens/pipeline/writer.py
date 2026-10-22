import os
import logging
from typing import List, Dict
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_db = None

def get_db():
    global _db
    if _db is None:
        if not firebase_admin._apps:
            # Use GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
            # OR set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON string
            sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
            if sa_json:
                import json, tempfile
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                    f.write(sa_json)
                    tmp_path = f.name
                cred = credentials.Certificate(tmp_path)
            else:
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def upsert_price_cache(prices: List[Dict]) -> None:
    """Write price data to Firestore price_cache collection."""
    db = get_db()
    batch = db.batch()
    now = datetime.now(timezone.utc).isoformat()

    for i, price in enumerate(prices):
        ref = db.collection('price_cache').document(price['symbol'])
        batch.set(ref, {**price, 'updated_at': now}, merge=True)

        # Firestore batches max 500 ops — commit and start fresh
        if (i + 1) % 499 == 0:
            batch.commit()
            batch = db.batch()

    batch.commit()
    logger.info(f'Upserted {len(prices)} symbols to Firestore')
