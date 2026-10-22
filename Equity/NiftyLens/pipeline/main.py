from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
import os

from pipeline.fetcher import fetch_nse_top200
from pipeline.writer import upsert_price_cache

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

POLL_INTERVAL = 2        # seconds between price fetches
KEEP_ALIVE_INTERVAL = 840  # 14 minutes in seconds


async def price_loop():
    while True:
        try:
            prices = await fetch_nse_top200()
            if prices:
                await upsert_price_cache(prices)
                logger.info(f"Updated {len(prices)} symbols")
        except Exception as e:
            logger.error(f"Fetch error: {e}")
        await asyncio.sleep(POLL_INTERVAL)


async def keep_alive_loop():
    """Self-ping /health every 14 min to prevent Render free-tier cold starts."""
    import httpx
    # Build the self URL from Render's env var or fall back to localhost
    host = os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")
    url = f"{host}/health"
    await asyncio.sleep(60)  # wait for server to be fully up first
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                logger.info(f"Keep-alive ping: {resp.status_code} ({url})")
        except Exception as e:
            logger.warning(f"Keep-alive ping failed: {e}")
        await asyncio.sleep(KEEP_ALIVE_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    price_task = asyncio.create_task(price_loop())
    ping_task = asyncio.create_task(keep_alive_loop())
    yield
    price_task.cancel()
    ping_task.cancel()


app = FastAPI(title="NiftyLens Data Pipeline", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/prices")
async def get_prices():
    """Direct endpoint — fallback if Supabase Realtime is unavailable."""
    prices = await fetch_nse_top200()
    return prices
