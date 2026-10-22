import httpx
import asyncio
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# ---------- Source 1: Unofficial NSE endpoint ----------
NSE_QUOTE_URL = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20200"
NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.nseindia.com/market-data/live-equity-market",
    "Accept-Language": "en-US,en;q=0.9",
}

async def _fetch_nse() -> List[Dict]:
    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
        # Establish session cookie first
        await client.get("https://www.nseindia.com", headers=NSE_HEADERS)
        resp = await client.get(NSE_QUOTE_URL, headers=NSE_HEADERS)
        resp.raise_for_status()
        data = resp.json()

    records = []
    for item in data.get("data", []):
        try:
            records.append({
                "symbol": item["symbol"],
                "ltp": float(item["lastPrice"]),
                "open": float(item["open"]),
                "high": float(item["dayHigh"]),
                "low": float(item["dayLow"]),
                "volume": int(item["totalTradedVolume"]),
            })
        except (KeyError, ValueError):
            continue
    return records


# ---------- Source 2: yfinance fallback (delayed ~15min) ----------
# Nifty 200 constituents — extend list as needed
NIFTY200_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "KOTAKBANK", "BAJFINANCE",
    "LT", "WIPRO", "HCLTECH", "AXISBANK", "ASIANPAINT",
    "MARUTI", "SUNPHARMA", "TITAN", "NESTLEIND", "ULTRACEMCO",
    "POWERGRID", "NTPC", "ONGC", "ADANIENT", "ADANIPORTS",
    "COALINDIA", "JSWSTEEL", "TATASTEEL", "M&M", "INDUSINDBK",
    # Add remaining symbols to fill Nifty 200
]

def _fetch_yfinance(symbols: List[str]) -> List[Dict]:
    try:
        import yfinance as yf
        tickers = " ".join(f"{s}.NS" for s in symbols)
        data = yf.download(tickers, period="1d", interval="1m", progress=False, auto_adjust=True)
        if data.empty:
            return []

        records = []
        for sym in symbols:
            ns = f"{sym}.NS"
            try:
                hist = yf.Ticker(ns).fast_info
                records.append({
                    "symbol": sym,
                    "ltp": float(hist.last_price or 0),
                    "open": float(hist.open or 0),
                    "high": float(hist.day_high or 0),
                    "low": float(hist.day_low or 0),
                    "volume": int(hist.three_month_average_volume or 0),
                })
            except Exception:
                continue
        return records
    except Exception as e:
        logger.error(f"yfinance fallback failed: {e}")
        return []


# ---------- Public interface — waterfall fetcher ----------
async def fetch_nse_top200() -> List[Dict]:
    """Try NSE first, fall back to yfinance on any failure."""
    try:
        records = await _fetch_nse()
        if records:
            logger.info(f"NSE source: {len(records)} symbols")
            return records
        raise ValueError("Empty response from NSE")
    except Exception as e:
        logger.warning(f"NSE source failed ({e}), switching to yfinance fallback")

    # Run yfinance in a thread (blocking IO)
    records = await asyncio.to_thread(_fetch_yfinance, NIFTY200_SYMBOLS)
    if records:
        logger.info(f"yfinance fallback: {len(records)} symbols")
        return records

    logger.error("All data sources failed — returning empty list")
    return []
