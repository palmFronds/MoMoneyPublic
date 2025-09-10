import boto3
import pandas as pd
from io import StringIO
from typing import Dict, List, Optional, Tuple
import os
from datetime import datetime, timedelta
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class S3DataAdapter:
    """
    Adapter for S3-based market data with folder structure:
    s3://bucket/
    ├── 30s/
    ├── 1min/
    ├── 5min/
    └── 30min/
    """
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME')
        self.default_interval = '30s'  # Default to 30-second data
        
        if not all([self.s3_client, self.bucket_name]):
            raise ValueError("AWS credentials and bucket name must be set in environment variables")
    
    def _get_s3_key(self, symbol: str, interval: str = None) -> str:
        """Generate S3 key for a symbol and interval."""
        interval = interval or self.default_interval
        return f"{interval}/{symbol}-{interval}.csv"
    
    def get_dataframe(self, symbol: str, interval: str = None) -> Optional[pd.DataFrame]:
        """Load DataFrame for a symbol and interval from S3."""
        try:
            s3_key = self._get_s3_key(symbol, interval)
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            
            # Specify dtypes to avoid warnings and improve performance
            dtype_dict = {
                'timestamp': str,
                'open': float,
                'high': float,
                'low': float,
                'close': float,
                'volume': int
            }
            
            df = pd.read_csv(
                StringIO(response['Body'].read().decode('utf-8')),
                dtype=dtype_dict,
                low_memory=False
            )
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            return df
            
        except Exception as e:
            print(f"Error loading DataFrame for {symbol} ({interval}): {e}")
            return None
    
    def get_tick_data(self, symbol: str, tick: int, interval: str = None) -> Optional[Dict]:
        """Get OHLCV data for a specific tick."""
        df = self.get_dataframe(symbol, interval)
        if df is None or tick >= len(df):
            return None
        
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
    
    def get_total_ticks(self, symbol: str, interval: str = None) -> int:
        """Get total number of ticks for a symbol."""
        df = self.get_dataframe(symbol, interval)
        return len(df) if df is not None else 0
    
    def get_ohlc_range(self, symbol: str, start_tick: int, end_tick: int, 
                      interval: str = None) -> List[Dict]:
        """Get OHLCV data for a range of ticks."""
        df = self.get_dataframe(symbol, interval)
        if df is None:
            return []
        
        data = []
        for tick in range(start_tick, min(end_tick + 1, len(df))):
            row = df.iloc[tick]
            data.append({
                "tick": tick,
                "timestamp": row["timestamp"].isoformat(),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        return data
    
    def get_ohlc_by_days(self, symbol: str, days: int, interval: str = None) -> List[Dict]:
        """Get OHLCV data for the last N days."""
        df = self.get_dataframe(symbol, interval)
        if df is None:
            return []
        
        # Calculate the start date
        end_date = df['timestamp'].max()
        start_date = end_date - timedelta(days=days)
        
        # Filter data
        mask = (df['timestamp'] >= start_date) & (df['timestamp'] <= end_date)
        filtered_df = df[mask]
        
        data = []
        for idx, row in filtered_df.iterrows():
            data.append({
                "tick": idx,
                "timestamp": row["timestamp"].isoformat(),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": int(row["volume"])
            })
        return data
    
    @lru_cache(maxsize=100)
    def get_available_symbols(self, interval: str = None) -> List[str]:
        """Get list of available symbols for an interval."""
        try:
            interval = interval or self.default_interval
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=f"{interval}/"
            )
            
            symbols = []
            for obj in response.get('Contents', []):
                key = obj['Key']
                if key.endswith('.csv'):
                    # Extract symbol from filename like "AAPL-30s.csv"
                    filename = key.split('/')[-1]
                    symbol = filename.replace(f"-{interval}.csv", "")
                    symbols.append(symbol)
            
            return sorted(symbols)
            
        except Exception as e:
            print(f"Error getting available symbols for {interval}: {e}")
            return []
    
    def get_available_intervals(self) -> List[str]:
        """Get list of available time intervals."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Delimiter='/'
            )
            
            intervals = []
            for prefix in response.get('CommonPrefixes', []):
                interval = prefix['Prefix'].rstrip('/')
                intervals.append(interval)
            
            return sorted(intervals)
            
        except Exception as e:
            print(f"Error getting available intervals: {e}")
            return []

    def get_fundamental_indicators(self, symbol: str, date: str) -> Optional[Dict]:
        """Load fundamental indicators for a symbol on a specific date."""
        s3_key = f"fundamental-measures/{symbol}_indicators_1d.csv"
        print(f"S3 Adapter: Attempting to load fundamental data from s3://{self.bucket_name}/{s3_key}")
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            
            df = pd.read_csv(StringIO(response['Body'].read().decode('utf-8')))
            
            # Debug: Print the first few rows to see the date format
            print(f"S3 Adapter: Loaded CSV with {len(df)} rows")
            print(f"S3 Adapter: CSV columns: {df.columns.tolist()}")
            print(f"S3 Adapter: First few Date values: {df['Date'].head().tolist()}")
            
            # Ensure the 'Date' column is in datetime format
            df['Date'] = pd.to_datetime(df['Date'])
            
            # Debug: Print the date we're looking for
            date_dt = pd.to_datetime(date)
            print(f"S3 Adapter: Looking for date: {date} (parsed as: {date_dt})")
            print(f"S3 Adapter: Date type: {type(date_dt)}")
            
            # Make the search date timezone-aware to match CSV dates
            # The CSV dates appear to be in UTC-4 timezone
            if date_dt.tzinfo is None:
                # Assume the date is in UTC-4 timezone (Eastern Time)
                from datetime import timezone, timedelta
                et_tz = timezone(timedelta(hours=-4))
                date_dt = date_dt.replace(tzinfo=et_tz)
                print(f"S3 Adapter: Made date timezone-aware: {date_dt}")
            
            # Debug: Print unique dates in the dataframe
            unique_dates = df['Date'].unique()
            print(f"S3 Adapter: Available dates in CSV: {[str(d) for d in unique_dates[:10]]}")
            
            # Find the row for the specified date
            row_series = df[df['Date'] == date_dt]

            if row_series.empty:
                print(f"S3 Adapter: No exact match found for {symbol} on date {date}")
                print(f"S3 Adapter: Trying to find closest date...")
                
                # Try to find the closest date
                if len(df) > 0:
                    # Find the closest date
                    date_diff = abs(df['Date'] - date_dt)
                    closest_idx = date_diff.idxmin()
                    closest_date = df.loc[closest_idx, 'Date']
                    print(f"S3 Adapter: Closest date found: {closest_date}")
                    
                    # If the closest date is within 1 day, use it
                    if abs((closest_date - date_dt).days) <= 1:
                        print(f"S3 Adapter: Using closest date {closest_date} for {date}")
                        row = df.loc[closest_idx]
                        return row.where(pd.notnull(row), None).to_dict()
                    else:
                        print(f"S3 Adapter: Closest date {closest_date} is too far from {date}")
                
                return None

            row = row_series.iloc[0]
            print(f"S3 Adapter: Found exact match for {symbol} on date {date}")
            
            # Convert row to a dictionary and handle potential NaN values
            return row.where(pd.notnull(row), None).to_dict()
            
        except Exception as e:
            print(f"Error loading fundamental indicators for {symbol} on {date}: {e}")
            return None

# Global instance
s3_adapter = S3DataAdapter() 