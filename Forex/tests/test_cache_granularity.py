import tempfile
import unittest
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
import pandas as pd
from src.data.mf_data_downloader import AsyncForexDataDownloader


class CacheGranularityTest(unittest.TestCase):
    def create_cache(self, directory, config=None):
        config_path = Path(directory) / 'config.json'
        config_path.write_text(json.dumps(config or {'interval': 'H1'}))
        return AsyncForexDataDownloader(config_path=str(config_path), db_path=str(Path(directory) / 'cache.db'))

    def test_intervals_never_overwrite_each_other(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = AsyncForexDataDownloader(config_path=str(Path(directory) / 'absent.json'), db_path=str(Path(directory) / 'cache.db'))
            timestamp = datetime(2026, 11, 1)
            frame = pd.DataFrame([dict(timestamp=timestamp, open=1.0, high=2.0, low=0.5, close=1.5, volume=10)])
            cache._cache_data('EUR_USD', frame, 'H1')
            frame['close'] = 1.7
            cache._cache_data('EUR_USD', frame, 'D')
            self.assertEqual(cache.get_cached_data('EUR_USD', timestamp, timestamp, 'H1').iloc[0]['close'], 1.5)
            self.assertEqual(cache.get_cached_data('EUR_USD', timestamp, timestamp, 'D').iloc[0]['close'], 1.7)

    def test_same_instant_in_another_timezone_updates_one_candle(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = self.create_cache(directory)
            timestamp = datetime(2026, 11, 1, tzinfo=timezone.utc)
            frame = pd.DataFrame([dict(timestamp=timestamp, open=1.0, high=2.0, low=0.5, close=1.5, volume=10)])
            cache._cache_data('EUR_USD', frame)
            frame['timestamp'] = frame['timestamp'].dt.tz_convert(timezone(timedelta(hours=5, minutes=30)))
            frame['close'] = 1.7
            cache._cache_data('EUR_USD', frame)
            result = cache.get_cached_data('EUR_USD', timestamp, timestamp + timedelta(hours=6))
            self.assertEqual(len(result), 1)
            self.assertEqual(result.iloc[0]['close'], 1.7)
            local_time = timestamp.astimezone(timezone(timedelta(hours=-4)))
            self.assertEqual(len(cache.get_cached_data('EUR_USD', local_time, local_time)), 1)

    def test_legacy_cache_remains_intact_without_guessing_its_interval(self):
        with tempfile.TemporaryDirectory() as directory:
            with closing(sqlite3.connect(str(Path(directory) / 'cache.db'))) as conn:
                conn.execute('CREATE TABLE ohlcv_cache (instrument TEXT, timestamp DATETIME, close REAL, PRIMARY KEY (instrument, timestamp))')
                conn.execute("INSERT INTO ohlcv_cache VALUES ('EUR_USD', '2026-11-01 00:00:00', 1.2)")
                conn.commit()
            cache = self.create_cache(directory, {'interval': 'D'})
            timestamp = datetime(2026, 11, 1)
            self.assertTrue(cache.get_cached_data('EUR_USD', timestamp, timestamp).empty)
            with closing(sqlite3.connect(cache.db_path)) as conn:
                self.assertEqual(conn.execute('SELECT close FROM ohlcv_cache').fetchone()[0], 1.2)

    def test_configured_interval_and_instrument_remain_isolated_after_reopen(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = self.create_cache(directory, {'interval': 'D'})
            timestamp = datetime(2026, 11, 1)
            frame = pd.DataFrame([dict(timestamp=timestamp, open=1.0, high=2.0, low=0.5, close=1.5, volume=10)])
            cache._cache_data('EUR_USD', frame)
            frame['close'] = 1.8
            cache._cache_data('GBP_USD', frame)
            cache = self.create_cache(directory, {'interval': 'D'})
            self.assertEqual(cache.get_cached_data('EUR_USD', timestamp, timestamp).iloc[0]['close'], 1.5)
            self.assertEqual(cache.get_cached_data('GBP_USD', timestamp, timestamp).iloc[0]['close'], 1.8)
            self.assertTrue(cache.get_cached_data('EUR_USD', timestamp, timestamp, 'H1').empty)

    def test_invalid_batch_rolls_back_all_candles(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = self.create_cache(directory)
            timestamp = datetime(2026, 11, 1)
            frame = pd.DataFrame([
                dict(timestamp=timestamp, open=1.0, high=2.0, low=0.5, close=1.5, volume=10),
                dict(timestamp=None, open=1.0, high=2.0, low=0.5, close=1.5, volume=10),
            ])
            with self.assertRaises(ValueError):
                cache._cache_data('EUR_USD', frame)
            self.assertTrue(cache.get_cached_data('EUR_USD', timestamp, timestamp).empty)


if __name__ == '__main__':
    unittest.main()
