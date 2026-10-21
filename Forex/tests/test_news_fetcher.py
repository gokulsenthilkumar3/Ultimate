"""
tests/test_news_fetcher.py
==========================
Tests for the v2 NewsFetcher: multi-source ingestion, LLM sentiment scoring,
backward-compatible fetch_recent_news(), and offline mock fallback.
"""
import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from src.data.news_fetcher import (
    NewsFetcher,
    SentimentScore,
    NewsItem,
    HAWKISH_KEYWORDS,
    DOVISH_KEYWORDS,
    _detect_cb_bias,
    LLMSentimentBackend,
)


class TestNewsFetcherBackwardCompat(unittest.TestCase):
    """Backward-compatible tests: fetch_recent_news() must keep working."""

    def setUp(self):
        self.fetcher = NewsFetcher(llm_provider="mock")

    def test_fetch_news_fallback_no_api_key(self):
        """When no API key is set, fetch_recent_news falls back to mock data."""
        self.fetcher.api_key = ""  # uses backward-compat setter → sets av_key
        news = self.fetcher.fetch_recent_news("FOREX:EUR")
        # mock produces 5 articles
        self.assertGreaterEqual(len(news), 1)
        # each item must have required keys
        for item in news:
            self.assertIn("title", item)
            self.assertIn("summary", item)

    @patch("src.data.news_fetcher.requests.get")
    def test_fetch_news_returns_dicts(self, mock_get):
        """fetch_recent_news always returns List[dict] with title/summary keys."""
        # Simulate an AlphaVantage response being patched
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "feed": [
                {
                    "title": "EUR/USD rallies heavily",
                    "summary": "European Central Bank announces surprise rate hike.",
                    "time_published": "20250101T120000",
                    "url": "https://example.com/1",
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        # Give a real-looking API key so AlphaVantage path is attempted
        self.fetcher.api_key = "FAKE_API_KEY"
        news = self.fetcher.fetch_recent_news("FOREX:EUR", limit=5)

        self.assertIsInstance(news, list)
        self.assertGreaterEqual(len(news), 1)
        self.assertIn("title", news[0])
        self.assertIn("summary", news[0])

    def test_api_key_property_alias(self):
        """api_key getter/setter are backward-compatible aliases for av_key."""
        self.fetcher.api_key = "MY_KEY"
        self.assertEqual(self.fetcher.av_key, "MY_KEY")
        self.assertEqual(self.fetcher.api_key, "MY_KEY")


class TestSentimentScore(unittest.TestCase):
    """Test SentimentScore dataclass and feature serialisation."""

    def test_to_feature_dict_keys(self):
        score = SentimentScore(
            currency_code="USD",
            date="2025-09-01",
            sentiment_score=0.4,
            cb_bias="hawkish",
            cb_bias_strength=0.8,
            scenario_weights={"bull": 0.3, "mild_bull": 0.2, "neutral": 0.2, "mild_bear": 0.2, "bear": 0.1},
        )
        features = score.to_feature_dict()
        expected_keys = [
            "env_sentiment_score",
            "env_sentiment_confidence",
            "env_cb_bias",
            "env_cb_bias_strength",
            "env_propaganda_score",
            "env_scenario_bull",
            "env_scenario_bear",
            "env_n_articles",
        ]
        for key in expected_keys:
            self.assertIn(key, features)

    def test_hawkish_cb_maps_to_positive(self):
        score = SentimentScore("USD", "2025-01-01", cb_bias="hawkish")
        features = score.to_feature_dict()
        self.assertGreater(features["env_cb_bias"], 0)

    def test_dovish_cb_maps_to_negative(self):
        score = SentimentScore("EUR", "2025-01-01", cb_bias="dovish")
        features = score.to_feature_dict()
        self.assertLess(features["env_cb_bias"], 0)


class TestCBBiasDetection(unittest.TestCase):
    """Test rule-based hawkish/dovish detection."""

    def test_hawkish_articles(self):
        articles = [
            NewsItem(title="Fed signals rate hike imminent", summary="Tighten monetary policy.", source="mock"),
            NewsItem(title="Rate increase expected in July", summary="Restrictive stance from FOMC.", source="mock"),
        ]
        bias, strength = _detect_cb_bias(articles)
        self.assertEqual(bias, "hawkish")
        self.assertGreater(strength, 0)

    def test_dovish_articles(self):
        articles = [
            NewsItem(title="Fed cuts rates amid recession risk", summary="Easing monetary policy.", source="mock"),
            NewsItem(title="QE resumed, stimulus expanded", summary="Accommodative stance.", source="mock"),
        ]
        bias, strength = _detect_cb_bias(articles)
        self.assertEqual(bias, "dovish")
        self.assertGreater(strength, 0)

    def test_neutral_articles(self):
        articles = [
            NewsItem(title="Markets closed for holiday", summary="No major events.", source="mock"),
        ]
        bias, strength = _detect_cb_bias(articles)
        self.assertEqual(bias, "neutral")
        self.assertEqual(strength, 0.0)


class TestLLMSentimentBackendMock(unittest.TestCase):
    """Test the mock LLM backend (no API key needed)."""

    def setUp(self):
        self.backend = LLMSentimentBackend(provider="mock")

    def test_mock_score_returns_required_keys(self):
        articles = [
            NewsItem(title="Rate hike expected", summary="Hawkish comments from central bank", source="mock"),
        ]
        result = self.backend.score_sentiment("USD", articles, "2025-09-01")
        required_keys = [
            "sentiment_score", "confidence", "cb_bias", "cb_bias_strength",
            "propaganda_score", "scenario_weights", "driving_headline",
        ]
        for key in required_keys:
            self.assertIn(key, result)

    def test_scenario_weights_sum_to_one(self):
        articles = [NewsItem(title="Test", summary="Test summary", source="mock")]
        result = self.backend.score_sentiment("EUR", articles, "2025-09-01")
        weights = result.get("scenario_weights", {})
        total = sum(weights.values())
        self.assertAlmostEqual(total, 1.0, places=2)

    def test_sentiment_score_in_range(self):
        articles = [NewsItem(title="Test", summary="Test summary", source="mock")]
        result = self.backend.score_sentiment("GBP", articles, "2025-09-01")
        score = result.get("sentiment_score", 0)
        self.assertGreaterEqual(score, -1.0)
        self.assertLessEqual(score, 1.0)


class TestNewsFetcherGetSentiment(unittest.TestCase):
    """Integration-style tests for get_sentiment() in mock mode."""

    def setUp(self):
        self.fetcher = NewsFetcher(llm_provider="mock", enable_rss=False)

    def test_get_sentiment_returns_score_object(self):
        score = self.fetcher.get_sentiment("USD", "2025-09-01")
        self.assertIsInstance(score, SentimentScore)
        self.assertEqual(score.currency_code, "USD")
        self.assertEqual(score.date, "2025-09-01")

    def test_get_sentiment_score_in_valid_range(self):
        score = self.fetcher.get_sentiment("EUR", "2025-09-01")
        self.assertGreaterEqual(score.sentiment_score, -1.0)
        self.assertLessEqual(score.sentiment_score, 1.0)

    def test_get_sentiment_caching(self):
        """Second call with same args should be served from cache."""
        score1 = self.fetcher.get_sentiment("GBP", "2025-09-01")
        score2 = self.fetcher.get_sentiment("GBP", "2025-09-01")
        # Both should have same values (from cache)
        self.assertEqual(score1.sentiment_score, score2.sentiment_score)

    def test_get_batch_sentiment(self):
        results = self.fetcher.get_batch_sentiment(["USD", "EUR", "GBP"], "2025-09-01")
        self.assertEqual(set(results.keys()), {"USD", "EUR", "GBP"})
        for code, score in results.items():
            self.assertIsInstance(score, SentimentScore)


if __name__ == "__main__":
    unittest.main()
