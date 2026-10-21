"""
src/data/news_fetcher.py
=========================
Multi-source environmental data ingestion and LLM-powered sentiment scoring.

Sources supported
-----------------
1. AlphaVantage News & Sentiment  (financial news headlines)
2. NewsAPI                        (general financial / economic news)
3. RSS Feeds                      (central bank statements, IMF, Reuters, etc.)
4. Central Bank Speech detection  (hawkish / dovish bias classification)
5. Propaganda / narrative bias    (LLM-scored manipulation probability)

All sources produce a unified ``SentimentScore`` object per currency per day.
The LLM backend defaults to OpenAI (gpt-4o-mini) or falls back to mock mode.

Environment Variables
---------------------
NEWS_API_KEY        – NewsAPI key  (newsapi.org)
ALPHAVANTAGE_KEY    – AlphaVantage API key
OPENAI_API_KEY      – OpenAI key for LLM sentiment scoring
LLM_PROVIDER        – "openai" (default) | "anthropic" | "mock"
ANTHROPIC_API_KEY   – Anthropic key (only when LLM_PROVIDER=anthropic)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from xml.etree import ElementTree

import requests

log = logging.getLogger(__name__)

# ── Currency → keyword mapping ─────────────────────────────────────────────────

CURRENCY_KEYWORDS: Dict[str, List[str]] = {
    "USD": ["federal reserve", "fed", "fomc", "us dollar", "usd", "powell", "treasury"],
    "EUR": ["ecb", "european central bank", "euro", "lagarde", "eurozone", "eu economy"],
    "GBP": ["bank of england", "boe", "sterling", "pound", "bailey", "uk economy"],
    "JPY": ["bank of japan", "boj", "yen", "ueda", "kuroda", "japanese yen"],
    "INR": ["rbi", "reserve bank of india", "rupee", "shaktikanta", "india economy"],
    "CNY": ["pboc", "people's bank of china", "yuan", "renminbi", "china economy"],
    "AUD": ["rba", "reserve bank of australia", "aussie", "aud", "australia economy"],
    "CAD": ["bank of canada", "boc", "canadian dollar", "cad", "tiff macklem"],
    "CHF": ["snb", "swiss national bank", "swiss franc", "chf", "jordan"],
    "SGD": ["mas", "monetary authority of singapore", "singapore dollar", "sgd"],
    "HKD": ["hkma", "hong kong dollar", "hkd"],
    "KRW": ["bank of korea", "bok", "korean won", "krw"],
    "MXN": ["banxico", "banco de mexico", "peso", "mxn"],
    "BRL": ["bcb", "banco central do brasil", "real", "brl"],
    "ZAR": ["sarb", "south african rand", "zar"],
    "SEK": ["riksbank", "swedish krona", "sek"],
    "NOK": ["norges bank", "norwegian krone", "nok"],
    "DKK": ["nationalbanken", "danish krone", "dkk"],
    "NZD": ["rbnz", "reserve bank of new zealand", "kiwi", "nzd"],
    "TRY": ["tcmb", "cbrt", "turkish lira", "try"],
}

# Central bank RSS feeds (free, no API key required)
CENTRAL_BANK_FEEDS: Dict[str, str] = {
    "USD": "https://www.federalreserve.gov/feeds/press_all.xml",
    "EUR": "https://www.ecb.europa.eu/rss/press.html",
    "GBP": "https://www.bankofengland.co.uk/rss/news",
    "JPY": "https://www.boj.or.jp/en/rss/English.xml",
    "INR": "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=0",
    "AUD": "https://www.rba.gov.au/rss/rss-cb-speeches.xml",
    "CAD": "https://www.bankofcanada.ca/feed/",
    "NZD": "https://www.rbnz.govt.nz/hub/publications/rss",
}

FINANCIAL_RSS_FEEDS: List[str] = [
    "https://feeds.reuters.com/reuters/businessNews",
    "https://feeds.bloomberg.com/markets/news.rss",
    "https://www.ft.com/rss/home/uk",
    "https://www.investing.com/rss/news_25.rss",
]

HAWKISH_KEYWORDS = [
    "rate hike", "tighten", "hawkish", "inflation concern", "aggressive",
    "restrictive", "above target", "rate increase", "quantitative tightening",
    "less accommodative", "overheating", "wage growth", "hot economy",
]
DOVISH_KEYWORDS = [
    "rate cut", "easing", "dovish", "accommodative", "below target", "stimulus",
    "quantitative easing", "qe", "support growth", "recession risk", "slowdown",
    "unemployment concern", "pause hike", "rate decrease", "looser policy",
]


# ── Data structures ────────────────────────────────────────────────────────────

@dataclass
class NewsItem:
    """A single news or speech article from any source."""
    title: str
    summary: str
    source: str          # e.g. "alphavantage", "newsapi", "rss_cb", "rss_general"
    url: str = ""
    published_at: str = ""
    is_central_bank: bool = False
    raw_sentiment: Optional[float] = None  # pre-scored by source API if available


@dataclass
class SentimentScore:
    """
    Aggregated LLM-scored sentiment for a single (currency, date) pair.
    This is the primary output of NewsFetcher and feeds directly into
    the feature engineering pipeline as model inputs.
    """
    currency_code: str
    date: str
    # Core scores
    sentiment_score: float = 0.0          # -1.0 (very bearish) to +1.0 (very bullish)
    confidence: float = 0.5               # 0.0 – 1.0
    # CB stance
    cb_bias: str = "neutral"             # "hawkish" | "dovish" | "neutral"
    cb_bias_strength: float = 0.0        # 0.0 (weak) – 1.0 (very strong)
    # Propaganda / narrative manipulation signal
    propaganda_score: float = 0.0        # 0.0 (genuine news) – 1.0 (high manipulation)
    narrative_keywords: List[str] = field(default_factory=list)
    # Scenario influence
    scenario_weights: Dict[str, float] = field(default_factory=lambda: {
        "bull": 0.2, "mild_bull": 0.2, "neutral": 0.2, "mild_bear": 0.2, "bear": 0.2,
    })
    # Metadata
    n_articles: int = 0
    sources_used: List[str] = field(default_factory=list)
    driving_headline: str = ""           # Most impactful headline
    llm_explanation: str = ""           # Why the LLM assigned this score

    def to_feature_dict(self) -> Dict[str, float]:
        """Flatten into numeric features for the ML feature matrix."""
        cb_map = {"hawkish": 1.0, "neutral": 0.0, "dovish": -1.0}
        return {
            "env_sentiment_score":     self.sentiment_score,
            "env_sentiment_confidence": self.confidence,
            "env_cb_bias":             cb_map.get(self.cb_bias, 0.0),
            "env_cb_bias_strength":    self.cb_bias_strength,
            "env_propaganda_score":    self.propaganda_score,
            "env_scenario_bull":       self.scenario_weights.get("bull", 0.2),
            "env_scenario_bear":       self.scenario_weights.get("bear", 0.2),
            "env_n_articles":          float(self.n_articles),
        }


# ── LLM Backend ───────────────────────────────────────────────────────────────

class LLMSentimentBackend:
    """
    Thin wrapper over OpenAI / Anthropic / mock for LLM sentiment calls.
    All methods return structured dicts, never raw API objects.
    """

    def __init__(self, provider: str = "openai"):
        self.provider = provider.lower()
        self._client = None
        self._setup()

    def _setup(self):
        if self.provider == "openai":
            key = os.getenv("OPENAI_API_KEY", "")
            if not key:
                log.warning("OPENAI_API_KEY not set — using mock LLM mode.")
                self.provider = "mock"
                return
            try:
                import openai
                self._client = openai.OpenAI(api_key=key)
                log.info("LLM backend: OpenAI (gpt-4o-mini)")
            except ImportError:
                log.warning("openai package missing — using mock LLM mode.")
                self.provider = "mock"

        elif self.provider == "anthropic":
            key = os.getenv("ANTHROPIC_API_KEY", "")
            if not key:
                log.warning("ANTHROPIC_API_KEY not set — falling back to mock.")
                self.provider = "mock"
                return
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=key)
                log.info("LLM backend: Anthropic (claude-3-5-haiku-20241022)")
            except ImportError:
                log.warning("anthropic package missing — using mock LLM mode.")
                self.provider = "mock"

    def _call(self, prompt: str, system: str = "You are a financial markets analyst. Respond ONLY in valid JSON.") -> str:
        """Execute a single LLM call, return raw text."""
        if self.provider == "openai" and self._client:
            try:
                resp = self._client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=800,
                )
                return resp.choices[0].message.content or "{}"
            except Exception as e:
                log.error(f"OpenAI call failed: {e}")
                return "{}"

        elif self.provider == "anthropic" and self._client:
            try:
                resp = self._client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=800,
                    system=system,
                    messages=[{"role": "user", "content": prompt}],
                )
                return resp.content[0].text or "{}"
            except Exception as e:
                log.error(f"Anthropic call failed: {e}")
                return "{}"

        return "{}"   # mock / fallback

    def score_sentiment(
        self,
        currency_code: str,
        articles: List[NewsItem],
        date: str,
    ) -> dict:
        """
        Returns a dict with keys:
          sentiment_score, confidence, cb_bias, cb_bias_strength,
          propaganda_score, scenario_weights, driving_headline, explanation
        """
        if not articles or self.provider == "mock":
            return self._mock_score(currency_code, articles)

        headlines_text = "\n".join(
            f"[{a.source.upper()}] {a.title}: {a.summary[:120]}"
            for a in articles[:15]
        )
        prompt = f"""Analyze the following news articles for {currency_code} on {date}.

Articles:
{headlines_text}

Respond ONLY in this exact JSON format:
{{
  "sentiment_score": <float -1.0 to 1.0; negative=bearish, positive=bullish>,
  "confidence": <float 0.0 to 1.0>,
  "cb_bias": "<hawkish|dovish|neutral>",
  "cb_bias_strength": <float 0.0 to 1.0>,
  "propaganda_score": <float 0.0 to 1.0; 0=genuine news, 1=heavy narrative manipulation>,
  "narrative_keywords": ["<up to 5 key manipulative or biased phrases if any>"],
  "scenario_weights": {{
    "bull": <prob>,
    "mild_bull": <prob>,
    "neutral": <prob>,
    "mild_bear": <prob>,
    "bear": <prob>
  }},
  "driving_headline": "<the single most market-moving headline>",
  "explanation": "<one sentence summary of why you assigned this score>"
}}
All scenario_weights must sum to 1.0."""

        raw = self._call(prompt)
        try:
            data = json.loads(raw)
            # Normalise scenario weights to sum to 1
            sw = data.get("scenario_weights", {})
            sw_sum = sum(sw.values()) if sw else 0
            if sw_sum > 0:
                data["scenario_weights"] = {k: v / sw_sum for k, v in sw.items()}
            else:
                data["scenario_weights"] = {"bull": 0.2, "mild_bull": 0.2, "neutral": 0.2, "mild_bear": 0.2, "bear": 0.2}
            return data
        except json.JSONDecodeError:
            log.warning("LLM returned invalid JSON; using mock score.")
            return self._mock_score(currency_code, articles)

    def _mock_score(self, currency_code: str, articles: List[NewsItem]) -> dict:
        """Deterministic mock based on keyword matching for CI / offline use."""
        hawk = sum(1 for a in articles for kw in HAWKISH_KEYWORDS if kw in (a.title + a.summary).lower())
        dove = sum(1 for a in articles for kw in DOVISH_KEYWORDS if kw in (a.title + a.summary).lower())
        raw_score = min(1.0, max(-1.0, (hawk - dove) / max(1, hawk + dove) * 0.7))
        cb_bias = "hawkish" if hawk > dove else ("dovish" if dove > hawk else "neutral")
        strength = min(1.0, abs(hawk - dove) / max(1, hawk + dove))
        bull = max(0.05, 0.2 + raw_score * 0.3)
        bear = max(0.05, 0.2 - raw_score * 0.3)
        rem = (1.0 - bull - bear) / 3.0
        return {
            "sentiment_score": round(raw_score, 3),
            "confidence": 0.45,
            "cb_bias": cb_bias,
            "cb_bias_strength": round(strength, 3),
            "propaganda_score": 0.1,
            "narrative_keywords": [],
            "scenario_weights": {"bull": bull, "mild_bull": rem, "neutral": rem, "mild_bear": rem, "bear": bear},
            "driving_headline": articles[0].title if articles else "",
            "explanation": "Mock score derived from keyword frequency analysis.",
        }


# ── Source adapters ────────────────────────────────────────────────────────────

def _fetch_alphavantage(currency_code: str, av_key: str, limit: int = 15) -> List[NewsItem]:
    """Fetch news via AlphaVantage NEWS_SENTIMENT endpoint."""
    if av_key == "demo" or not av_key:
        return []
    ticker = f"FOREX:{currency_code}"
    try:
        resp = requests.get(
            "https://www.alphavantage.co/query",
            params={"function": "NEWS_SENTIMENT", "tickers": ticker, "apikey": av_key, "limit": limit},
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for article in data.get("feed", [])[:limit]:
            ts = article.get("time_published", "")
            sentiment_val = None
            for ts_info in article.get("ticker_sentiment", []):
                if ts_info.get("ticker", "").endswith(currency_code):
                    try:
                        sentiment_val = float(ts_info.get("ticker_sentiment_score", 0))
                    except ValueError:
                        pass
            items.append(NewsItem(
                title=article.get("title", ""),
                summary=article.get("summary", "")[:300],
                source="alphavantage",
                url=article.get("url", ""),
                published_at=ts,
                raw_sentiment=sentiment_val,
            ))
        log.debug(f"AlphaVantage: {len(items)} articles for {currency_code}")
        return items
    except Exception as e:
        log.warning(f"AlphaVantage fetch failed for {currency_code}: {e}")
        return []


def _fetch_newsapi(currency_code: str, news_key: str, date: str, limit: int = 10) -> List[NewsItem]:
    """Fetch articles via NewsAPI /everything endpoint filtered by currency keywords."""
    if not news_key:
        return []
    keywords = CURRENCY_KEYWORDS.get(currency_code, [currency_code])
    query = " OR ".join(f'"{kw}"' for kw in keywords[:4])
    try:
        from_date = (datetime.strptime(date, "%Y-%m-%d") - timedelta(days=2)).strftime("%Y-%m-%d")
        resp = requests.get(
            "https://newsapi.org/v2/everything",
            params={
                "q": query,
                "from": from_date,
                "to": date,
                "language": "en",
                "sortBy": "relevancy",
                "pageSize": limit,
                "apiKey": news_key,
            },
            timeout=12,
        )
        resp.raise_for_status()
        data = resp.json()
        items = []
        for article in data.get("articles", [])[:limit]:
            if not article.get("title"):
                continue
            items.append(NewsItem(
                title=article["title"],
                summary=(article.get("description") or article.get("content") or "")[:300],
                source="newsapi",
                url=article.get("url", ""),
                published_at=article.get("publishedAt", ""),
            ))
        log.debug(f"NewsAPI: {len(items)} articles for {currency_code}")
        return items
    except Exception as e:
        log.warning(f"NewsAPI fetch failed for {currency_code}: {e}")
        return []


def _fetch_rss(url: str, source_tag: str, is_central_bank: bool = False, limit: int = 8) -> List[NewsItem]:
    """Parse an RSS/Atom XML feed and return a list of NewsItems."""
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "ForexPredictor/4.0"})
        resp.raise_for_status()
        root = ElementTree.fromstring(resp.content)
        # handle both RSS and Atom
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items_xml = root.findall(".//item") or root.findall(".//atom:entry", ns)
        out = []
        for item in items_xml[:limit]:
            def _text(tag: str) -> str:
                el = item.find(tag)
                if el is None:
                    el = item.find(f"atom:{tag}", ns)
                return (el.text or "").strip() if el is not None else ""
            title = _text("title")
            summary = _text("description") or _text("summary") or _text("content")
            pub = _text("pubDate") or _text("published") or _text("updated")
            link = _text("link")
            if not title:
                continue
            out.append(NewsItem(
                title=title[:200],
                summary=re.sub(r"<[^>]+>", "", summary)[:300],
                source=source_tag,
                url=link,
                published_at=pub,
                is_central_bank=is_central_bank,
            ))
        log.debug(f"RSS [{source_tag}]: {len(out)} articles from {url}")
        return out
    except Exception as e:
        log.debug(f"RSS fetch failed [{source_tag}] {url}: {e}")
        return []


def _detect_cb_bias(articles: List[NewsItem]) -> Tuple[str, float]:
    """Rule-based hawk/dove detection from central bank speech articles."""
    hawk_count = 0
    dove_count = 0
    for a in articles:
        text = (a.title + " " + a.summary).lower()
        hawk_count += sum(1 for kw in HAWKISH_KEYWORDS if kw in text)
        dove_count += sum(1 for kw in DOVISH_KEYWORDS if kw in text)
    total = hawk_count + dove_count
    if total == 0:
        return "neutral", 0.0
    bias = "hawkish" if hawk_count > dove_count else "dovish"
    strength = abs(hawk_count - dove_count) / total
    return bias, round(min(strength, 1.0), 3)


# ── Main NewsFetcher class ─────────────────────────────────────────────────────

class NewsFetcher:
    """
    Multi-source environmental data ingestion + LLM-powered sentiment scoring.

    Usage
    -----
    >>> fetcher = NewsFetcher()
    >>> score = fetcher.get_sentiment("USD", "2025-03-10")
    >>> score.sentiment_score   # -1.0 to +1.0
    >>> features = score.to_feature_dict()   # ready for ML pipeline

    Parameters
    ----------
    av_key      : AlphaVantage API key (falls back to env ALPHAVANTAGE_KEY).
    news_key    : NewsAPI key (falls back to env NEWS_API_KEY).
    llm_provider: "openai" | "anthropic" | "mock".
    enable_rss  : Whether to fetch from RSS feeds (central bank + general).
    cache_ttl_h : Hours to cache results. 0 = disable cache.
    """

    def __init__(
        self,
        av_key: Optional[str] = None,
        news_key: Optional[str] = None,
        llm_provider: Optional[str] = None,
        enable_rss: bool = True,
        cache_ttl_h: int = 4,
    ):
        self.av_key       = av_key or os.getenv("ALPHAVANTAGE_KEY", "demo")
        self.news_key     = news_key or os.getenv("NEWS_API_KEY", "")
        self.enable_rss   = enable_rss
        self.cache_ttl_h  = cache_ttl_h
        self._cache: Dict[str, Tuple[SentimentScore, datetime]] = {}

        provider = llm_provider or os.getenv("LLM_PROVIDER", "openai")
        self._llm = LLMSentimentBackend(provider=provider)

    @property
    def api_key(self) -> str:
        """Backward-compatible alias for av_key (used by older tests)."""
        return self.av_key

    @api_key.setter
    def api_key(self, value: str) -> None:
        """Backward-compatible alias setter."""
        self.av_key = value

    # ── Public API ─────────────────────────────────────────────────────────────

    def get_sentiment(
        self,
        currency_code: str,
        date: Optional[str] = None,
        force_refresh: bool = False,
    ) -> SentimentScore:
        """
        Fetch, score and return a ``SentimentScore`` for (currency_code, date).

        Results are cached per (currency_code, date) for ``cache_ttl_h`` hours.
        """
        date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        cache_key = f"{currency_code}::{date}"

        if not force_refresh and cache_key in self._cache:
            score, ts = self._cache[cache_key]
            age_h = (datetime.now(timezone.utc) - ts).total_seconds() / 3600
            if age_h < self.cache_ttl_h:
                log.debug(f"Cache HIT for {cache_key}")
                return score

        articles = self._collect_articles(currency_code, date)
        score    = self._score_articles(currency_code, date, articles)

        if self.cache_ttl_h > 0:
            self._cache[cache_key] = (score, datetime.now(timezone.utc))

        log.info(
            f"Sentiment {currency_code} {date}: "
            f"score={score.sentiment_score:+.3f}, "
            f"cb={score.cb_bias}({score.cb_bias_strength:.2f}), "
            f"propaganda={score.propaganda_score:.2f}, "
            f"n_articles={score.n_articles}"
        )
        return score

    def get_batch_sentiment(
        self,
        currency_codes: List[str],
        date: Optional[str] = None,
    ) -> Dict[str, SentimentScore]:
        """Return a dict of SentimentScore for multiple currencies on the same date."""
        date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return {code: self.get_sentiment(code, date) for code in currency_codes}

    # Legacy compat: return list of dicts for older callers
    def fetch_recent_news(self, tickers: str = "FOREX:EUR", limit: int = 10) -> List[Dict]:
        """
        Backward-compatible method. Returns raw list of news dicts.
        Parses ``tickers`` as currency code (e.g. "FOREX:EUR" → "EUR").
        """
        currency_code = tickers.split(":")[-1] if ":" in tickers else tickers
        articles = self._collect_articles(currency_code, limit=limit)
        return [{"title": a.title, "summary": a.summary,
                 "time_published": a.published_at, "url": a.url}
                for a in articles]

    # ── Internal methods ────────────────────────────────────────────────────────

    def _collect_articles(
        self,
        currency_code: str,
        date: Optional[str] = None,
        limit: int = 20,
    ) -> List[NewsItem]:
        """Collect articles from all enabled sources."""
        articles: List[NewsItem] = []
        date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 1. AlphaVantage (financial news with pre-scores)
        articles += _fetch_alphavantage(currency_code, self.av_key, limit=limit // 2)

        # 2. NewsAPI (broad coverage, keyword-based)
        if self.news_key:
            articles += _fetch_newsapi(currency_code, self.news_key, date, limit=limit // 2)

        # 3. Central bank RSS (highest authority for CB bias)
        if self.enable_rss and currency_code in CENTRAL_BANK_FEEDS:
            url = CENTRAL_BANK_FEEDS[currency_code]
            articles += _fetch_rss(url, f"rss_cb_{currency_code}", is_central_bank=True, limit=5)

        # 4. General financial RSS
        if self.enable_rss and len(articles) < 5:
            for rss_url in FINANCIAL_RSS_FEEDS[:2]:
                articles += _fetch_rss(rss_url, "rss_general", is_central_bank=False, limit=4)

        # 5. Filter by relevance (currency keywords appear in title/summary)
        kws = CURRENCY_KEYWORDS.get(currency_code, [currency_code.lower()])
        relevant: List[NewsItem] = []
        for a in articles:
            text = (a.title + " " + a.summary).lower()
            if any(kw in text for kw in kws) or any(
                global_kw in text for global_kw in ["central bank", "forex", "exchange rate", "monetary policy"]
            ):
                relevant.append(a)

        # Fallback: use all if too few relevant
        if len(relevant) < 3:
            relevant = articles

        # Deduplicate by content hash
        seen: set = set()
        unique: List[NewsItem] = []
        for a in relevant:
            h = hashlib.md5((a.title + a.source).encode()).hexdigest()
            if h not in seen:
                seen.add(h)
                unique.append(a)

        if not unique:
            log.warning(f"No articles found for {currency_code}; using mock data.")
            unique = self._get_mock_articles(currency_code)

        log.debug(f"Collected {len(unique)} unique articles for {currency_code} on {date}")
        return unique[:limit]

    def _score_articles(
        self,
        currency_code: str,
        date: str,
        articles: List[NewsItem],
    ) -> SentimentScore:
        """Run LLM scoring and rule-based CB bias detection, return SentimentScore."""

        # Rule-based CB bias (fast, free, from CB speech articles)
        cb_articles = [a for a in articles if a.is_central_bank]
        rule_cb_bias, rule_cb_strength = _detect_cb_bias(cb_articles or articles)

        # LLM scoring (may fall back to mock if no API key)
        llm_result = self._llm.score_sentiment(currency_code, articles, date)

        # Merge: rule-based CB bias takes priority for CB-specific currencies
        final_cb_bias = llm_result.get("cb_bias", rule_cb_bias)
        final_cb_strength = llm_result.get("cb_bias_strength", rule_cb_strength)
        if cb_articles:  # Override LLM with rule-based when real CB articles exist
            final_cb_bias = rule_cb_bias
            final_cb_strength = rule_cb_strength

        sources_used = list({a.source for a in articles})

        return SentimentScore(
            currency_code=currency_code,
            date=date,
            sentiment_score=float(llm_result.get("sentiment_score", 0.0)),
            confidence=float(llm_result.get("confidence", 0.5)),
            cb_bias=final_cb_bias,
            cb_bias_strength=float(final_cb_strength),
            propaganda_score=float(llm_result.get("propaganda_score", 0.0)),
            narrative_keywords=llm_result.get("narrative_keywords", []),
            scenario_weights=llm_result.get("scenario_weights", {
                "bull": 0.2, "mild_bull": 0.2, "neutral": 0.2, "mild_bear": 0.2, "bear": 0.2,
            }),
            n_articles=len(articles),
            sources_used=sources_used,
            driving_headline=llm_result.get("driving_headline", articles[0].title if articles else ""),
            llm_explanation=llm_result.get("explanation", ""),
        )

    def _get_mock_articles(self, currency_code: str) -> List[NewsItem]:
        """Fallback mock data used when all live sources fail."""
        now = datetime.now(timezone.utc)
        mock_data = [
            (f"Central bank signals stable outlook for {currency_code}", "Officials cite balanced risks."),
            ("Federal Reserve holds rates steady, awaiting more data", "FOMC minutes suggest patient approach."),
            ("Global trade tensions ease as diplomatic talks resume", "Markets cautiously optimistic."),
            (f"Inflation data for {currency_code} region comes in line with expectations", "Core CPI at 2.5%."),
            ("IMF upgrades global growth forecast slightly", "Resilient labor markets cited."),
        ]
        return [
            NewsItem(
                title=title,
                summary=summary,
                source="mock",
                published_at=(now - timedelta(hours=i)).strftime("%Y%m%dT%H%M%S"),
            )
            for i, (title, summary) in enumerate(mock_data)
        ]
