import pandas as pd
from typing import Dict, Optional, Tuple
import threading
import time
from datetime import datetime, timedelta

class OHLCVCache:
    """
    Thread-safe cache for OHLCV DataFrames with automatic expiration.
    """
    
    def __init__(self, max_size: int = 50, ttl_seconds: int = 300):
        self._cache: Dict[str, Tuple[pd.DataFrame, float]] = {}
        self._lock = threading.RLock()
        self._max_size = max_size
        self._ttl_seconds = ttl_seconds
    
    def _get_cache_key(self, symbol: str, interval: str) -> str:
        """Generate cache key for symbol and interval."""
        return f"{symbol}:{interval}"
    
    def _is_expired(self, timestamp: float) -> bool:
        """Check if cached item is expired."""
        return time.time() - timestamp > self._ttl_seconds
    
    def get(self, symbol: str, interval: str = '30s') -> Optional[pd.DataFrame]:
        """Get DataFrame from cache if available and not expired."""
        with self._lock:
            key = self._get_cache_key(symbol, interval)
            if key in self._cache:
                df, timestamp = self._cache[key]
                if not self._is_expired(timestamp):
                    return df
                else:
                    # Remove expired item
                    del self._cache[key]
            return None
    
    def set(self, symbol: str, df: pd.DataFrame, interval: str = '30s') -> None:
        """Store DataFrame in cache."""
        with self._lock:
            key = self._get_cache_key(symbol, interval)
            
            # Remove oldest item if cache is full
            if len(self._cache) >= self._max_size and key not in self._cache:
                oldest_key = min(self._cache.keys(), 
                               key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            
            self._cache[key] = (df, time.time())
    
    def invalidate(self, symbol: str, interval: str = '30s') -> None:
        """Remove specific item from cache."""
        with self._lock:
            key = self._get_cache_key(symbol, interval)
            if key in self._cache:
                del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove all expired items from cache."""
        with self._lock:
            expired_keys = [
                key for key, (_, timestamp) in self._cache.items()
                if self._is_expired(timestamp)
            ]
            for key in expired_keys:
                del self._cache[key]
    
    def get_stats(self) -> Dict:
        """Get cache statistics."""
        with self._lock:
            self.cleanup_expired()
            return {
                "size": len(self._cache),
                "max_size": self._max_size,
                "ttl_seconds": self._ttl_seconds,
                "keys": list(self._cache.keys())
            }

# Global cache instance
ohlcv_cache = OHLCVCache(max_size=50, ttl_seconds=300)  # 5 minutes TTL 