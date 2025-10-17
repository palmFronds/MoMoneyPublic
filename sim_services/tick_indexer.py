from typing import Dict, Optional, List, Tuple
from datetime import datetime, timedelta, timezone
import pandas as pd
from .s3_data_adapter import s3_adapter
from .ohlcv_cache import ohlcv_cache

class TickIndexer:
    """
    Handles tick-based operations and provides efficient tick management.
    """
    
    def __init__(self):
        self._tick_cache: Dict[str, int] = {}  # Cache for total ticks per symbol
    
    def get_total_ticks(self, symbol: str, interval: str = '30s') -> int:
        """Get total number of ticks for a symbol with caching."""
        cache_key = f"{symbol}:{interval}"
        
        if cache_key not in self._tick_cache:
            # Try to get from cache first
            df = ohlcv_cache.get(symbol, interval)
            if df is not None:
                self._tick_cache[cache_key] = len(df)
            else:
                # Load from S3 and cache
                df = s3_adapter.get_dataframe(symbol, interval)
                if df is not None:
                    ohlcv_cache.set(symbol, df, interval)
                    self._tick_cache[cache_key] = len(df)
                else:
                    self._tick_cache[cache_key] = 0
        
        return self._tick_cache[cache_key]
    
    def get_tick_data(self, symbol: str, tick: int, interval: str = '30s') -> Optional[Dict]:
        """Get OHLCV data for a specific tick."""
        # Validate tick index
        total_ticks = self.get_total_ticks(symbol, interval)
        if tick < 0 or tick >= total_ticks:
            return None
        
        # Try to get from cache first
        df = ohlcv_cache.get(symbol, interval)
        if df is None:
            # Load from S3 and cache
            df = s3_adapter.get_dataframe(symbol, interval)
            if df is None:
                return None
            ohlcv_cache.set(symbol, df, interval)
        
        # Get the specific tick data
        row = df.iloc[tick]
        return {
            "symbol": symbol,
            "tick": tick,
            "timestamp": row["timestamp"].isoformat(),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["volume"])
        }
    
    def get_tick_range(self, symbol: str, start_tick: int, end_tick: int, 
                      interval: str = '30s') -> List[Dict]:
        """Get OHLCV data for a range of ticks."""
        # Validate tick range
        total_ticks = self.get_total_ticks(symbol, interval)
        start_tick = max(0, start_tick)
        end_tick = min(end_tick, total_ticks - 1)
        
        if start_tick > end_tick:
            return []
        
        # Try to get from cache first
        df = ohlcv_cache.get(symbol, interval)
        if df is None:
            # Load from S3 and cache
            df = s3_adapter.get_dataframe(symbol, interval)
            if df is None:
                return []
            ohlcv_cache.set(symbol, df, interval)
        
        # Get the range of tick data
        data = []
        for tick in range(start_tick, end_tick + 1):
            row = df.iloc[tick]
            data.append({
                "symbol": symbol,
                "tick": tick,
                "timestamp": row["timestamp"].isoformat(),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        
        return data
    
    def get_current_price(self, symbol: str, tick: int, interval: str = '30s') -> Optional[float]:
        """Get current price (close) for a symbol at a specific tick."""
        tick_data = self.get_tick_data(symbol, tick, interval)
        return tick_data["close"] if tick_data else None
    
    def get_price_change(self, symbol: str, current_tick: int, interval: str = '30s') -> Optional[Dict]:
        """Get price change information between current and previous tick."""
        if current_tick <= 0:
            return None
        
        current_data = self.get_tick_data(symbol, current_tick, interval)
        prev_data = self.get_tick_data(symbol, current_tick - 1, interval)
        
        if not current_data or not prev_data:
            return None
        
        current_price = current_data["close"]
        prev_price = prev_data["close"]
        abs_change = current_price - prev_price
        pct_change = (abs_change / prev_price) * 100 if prev_price != 0 else 0
        
        return {
            "current_price": current_price,
            "prev_price": prev_price,
            "abs_change": abs_change,
            "pct_change": pct_change
        }
    
    def get_quote(self, symbol: str, tick: int, interval: str = '30s') -> Optional[Dict]:
        """Get quote information for a symbol at a specific tick."""
        # Get current tick data
        current_data = self.get_tick_data(symbol, tick, interval)
        if not current_data:
            return None
        
        current_price = current_data["close"]
        
        # Try to get price change (requires at least 2 ticks)
        price_change = self.get_price_change(symbol, tick, interval)
        
        if price_change:
            # We have both current and previous tick data
            return {
                "last_price": price_change["current_price"],
                "prev_close": price_change["prev_price"],
                "abs_change": price_change["abs_change"],
                "pct_change": price_change["pct_change"]
            }
        else:
            # We're at the first tick or can't calculate change, return current price only
            return {
                "last_price": current_price,
                "prev_close": current_price,  # Same as current for first tick
                "abs_change": 0.0,
                "pct_change": 0.0
            }
    
    def get_ohlc_for_tick(self, symbol: str, tick: int, interval: str = '30s') -> Optional[Dict]:
        """Get OHLC data for a specific tick."""
        tick_data = self.get_tick_data(symbol, tick, interval)
        if not tick_data:
            return None
        
        return {
            "symbol": symbol,
            "tick": tick,
            "timestamp": tick_data["timestamp"],
            "open": tick_data["open"],
            "high": tick_data["high"],
            "low": tick_data["low"],
            "close": tick_data["close"],
            "volume": tick_data["volume"]
        }
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        self._tick_cache.clear()
        ohlcv_cache.clear()
    
    def invalidate_symbol(self, symbol: str, interval: str = '30s') -> None:
        """Invalidate cache for a specific symbol."""
        cache_key = f"{symbol}:{interval}"
        if cache_key in self._tick_cache:
            del self._tick_cache[cache_key]
        ohlcv_cache.invalidate(symbol, interval)

    def get_date_from_tick(self, symbol: str, tick: int, interval: str = '30s') -> Optional[str]:
        """Get the date (YYYY-MM-DD) for a specific tick."""
        tick_data = self.get_tick_data(symbol, tick, interval)
        if not tick_data:
            print(f"Tick Indexer: Could not get tick data for {symbol} at tick {tick}")
            return None
        
        # Convert timestamp string to datetime object and then to date string
        timestamp = datetime.fromisoformat(tick_data["timestamp"])
        
        # Handle timezone-aware timestamps by converting to UTC and then extracting date
        if timestamp.tzinfo is not None:
            # Convert to UTC to normalize timezone
            timestamp = timestamp.astimezone(timezone.utc)
        
        # Extract just the date part (YYYY-MM-DD)
        date_str = timestamp.strftime('%Y-%m-%d')
        print(f"Tick Indexer: Converted tick {tick} to date {date_str} for {symbol}")
        print(f"Tick Indexer: Original timestamp: {tick_data['timestamp']}")
        print(f"Tick Indexer: Parsed timestamp: {timestamp}")
        return date_str

# Global tick indexer instance
tick_indexer = TickIndexer() 