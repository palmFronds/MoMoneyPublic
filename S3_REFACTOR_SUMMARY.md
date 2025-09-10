# S3-Based Market Data System Refactor

## Overview
This refactor replaces the old MarketTick SQL model with a new S3-based system that loads OHLCV market data from organized S3 buckets with different time intervals.

## New Architecture

### 1. S3 Data Adapter (`sim_services/s3_data_adapter.py`)
- **Purpose**: Handles S3 operations for the new folder structure
- **Key Features**:
  - Supports multiple time intervals (30s, 1min, 5min, 30min)
  - Automatic dtype specification to avoid pandas warnings
  - Efficient DataFrame loading with proper error handling
  - Methods for getting data by days, tick ranges, and individual ticks

### 2. OHLCV Cache (`sim_services/ohlcv_cache.py`)
- **Purpose**: Thread-safe caching for DataFrame data
- **Key Features**:
  - Automatic cache expiration (5 minutes TTL)
  - LRU eviction when cache is full
  - Thread-safe operations with locks
  - Cache statistics and cleanup methods

### 3. Tick Indexer (`sim_services/tick_indexer.py`)
- **Purpose**: Handles tick-based operations and provides efficient tick management
- **Key Features**:
  - Cached total tick counts per symbol
  - Efficient tick data retrieval using `.iloc[tick]`
  - Price change calculations and quote generation
  - Range-based data retrieval

### 4. Updated Simulation Engine (`sim_services/simulation_engine.py`)
- **Purpose**: Core simulation logic using the new S3 system
- **Key Changes**:
  - Replaced S3 service calls with tick indexer calls
  - Improved error handling and transaction management
  - Better PnL calculations using average prices
  - Enhanced trade execution logic

### 5. New Chart Data Router (`routers/chart_data.py`)
- **Purpose**: Handles chart data requests with flexible parameters
- **Endpoints**:
  - `GET /chart_data/{symbol}?interval=5min&days=7` - Get data by days
  - `GET /chart_data/{symbol}/range?start_tick=1000&end_tick=2000` - Get data by tick range
  - `GET /chart_data/{symbol}/tick/{tick}` - Get specific tick data
  - `GET /chart_data/intervals` - Get available intervals
  - `GET /chart_data/symbols/{interval}` - Get symbols for interval
  - `GET /chart_data/metadata/{symbol}` - Get symbol metadata

## S3 Bucket Structure
```
s3://<bucket-name>/
├── 30s/
│   ├── AAPL-30s.csv
│   ├── MSFT-30s.csv
│   └── ...
├── 1min/
│   ├── AAPL-1min.csv
│   ├── MSFT-1min.csv
│   └── ...
├── 5min/
└── 30min/
```

## Performance Improvements

### 1. Caching Strategy
- **DataFrame Caching**: Each symbol/interval combination is cached for 5 minutes
- **Tick Count Caching**: Total ticks per symbol are cached to avoid repeated S3 calls
- **Automatic Cleanup**: Expired cache entries are automatically removed

### 2. Efficient Data Access
- **Index-Based Access**: Uses `.iloc[tick]` instead of filtering by timestamp
- **Batch Operations**: Multiple ticks can be retrieved in a single operation
- **Lazy Loading**: Data is only loaded when needed

### 3. Reduced S3 Calls
- **Cache-First Strategy**: Always check cache before making S3 requests
- **Metadata Caching**: Symbol lists and intervals are cached
- **Smart Invalidation**: Cache is invalidated only when necessary

## API Changes

### New Endpoints
```http
# Get chart data for last 7 days with 5-minute intervals
GET /chart_data/AAPL?interval=5min&days=7

# Get data for specific tick range
GET /chart_data/MSFT/range?start_tick=1000&end_tick=2000&interval=30s

# Get specific tick data
GET /chart_data/GOOGL/tick/1500?interval=1min

# Get available intervals
GET /chart_data/intervals

# Get symbols for specific interval
GET /chart_data/symbols/30s

# Get symbol metadata
GET /chart_data/metadata/AAPL?interval=30s
```

### Updated Endpoints
- All existing simulation endpoints now use the new tick-based system
- Improved error handling and response consistency
- Better performance due to caching

## Migration Guide

### 1. Environment Variables
Ensure your `.env` file has the correct S3 configuration:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
```

### 2. S3 Bucket Setup
- Create folders for each time interval (30s, 1min, 5min, 30min)
- Upload CSV files with naming pattern: `{SYMBOL}-{INTERVAL}.csv`
- Ensure CSV files have columns: timestamp, open, high, low, close, volume

### 3. Testing
- Test with a small dataset first
- Verify cache behavior with multiple requests
- Check performance improvements

## Benefits

### 1. Scalability
- **Horizontal Scaling**: Multiple instances can share the same S3 data
- **No Database Bottlenecks**: Market data is no longer stored in SQLite
- **Flexible Storage**: Easy to add new symbols or time intervals

### 2. Performance
- **Faster Access**: Cached data provides instant access
- **Reduced Latency**: Index-based access is much faster than filtering
- **Efficient Memory Usage**: Only load data when needed

### 3. Maintainability
- **Modular Design**: Clear separation of concerns
- **Easy Testing**: Each component can be tested independently
- **Extensible**: Easy to add new features or data sources

## Monitoring and Debugging

### Cache Statistics
```python
from sim_services.ohlcv_cache import ohlcv_cache
stats = ohlcv_cache.get_stats()
print(f"Cache size: {stats['size']}/{stats['max_size']}")
```

### Cache Management
```python
from sim_services.tick_indexer import tick_indexer

# Clear all caches
tick_indexer.clear_cache()

# Invalidate specific symbol
tick_indexer.invalidate_symbol("AAPL", "30s")
```

### Error Handling
- All S3 operations include proper error handling
- Failed requests return appropriate HTTP status codes
- Detailed error messages for debugging

## Future Enhancements

### 1. Advanced Caching
- Redis-based distributed caching
- Predictive caching based on usage patterns
- Cache warming strategies

### 2. Data Compression
- Gzip compression for CSV files
- Parquet format for better performance
- Streaming data access

### 3. Real-time Updates
- WebSocket streaming for real-time data
- Delta updates for changed data
- Event-driven architecture

## Troubleshooting

### Common Issues

1. **S3 Access Denied**
   - Check AWS credentials and permissions
   - Verify bucket name and region

2. **Cache Not Working**
   - Check cache statistics
   - Verify cache TTL settings
   - Clear cache if needed

3. **Slow Performance**
   - Check cache hit rates
   - Verify S3 region proximity
   - Consider increasing cache size

4. **Missing Data**
   - Verify S3 file structure
   - Check CSV file format
   - Validate symbol names

### Debug Commands
```python
# Check available symbols
from sim_services.s3_data_adapter import s3_adapter
symbols = s3_adapter.get_available_symbols("30s")
print(f"Available symbols: {symbols}")

# Check total ticks
from sim_services.tick_indexer import tick_indexer
total_ticks = tick_indexer.get_total_ticks("AAPL", "30s")
print(f"Total ticks for AAPL: {total_ticks}")

# Get cache stats
from sim_services.ohlcv_cache import ohlcv_cache
stats = ohlcv_cache.get_stats()
print(f"Cache stats: {stats}")
``` 