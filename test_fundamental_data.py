#!/usr/bin/env python3
"""
Test script to debug fundamental data loading
"""

import os
from dotenv import load_dotenv
from sim_services.s3_data_adapter import s3_adapter
from sim_services.tick_indexer import tick_indexer

# Load environment variables
load_dotenv()

def test_fundamental_data():
    """Test fundamental data loading for MSFT"""
    symbol = "MSFT"
    
    print(f"=== Testing Fundamental Data for {symbol} ===")
    
    # Test 1: Check what dates are available in the fundamental CSV
    print("\n1. Checking fundamental CSV data...")
    try:
        s3_key = f"fundamental-measures/{symbol}_indicators_1d.csv"
        print(f"   S3 Key: {s3_key}")
        
        response = s3_adapter.s3_client.get_object(
            Bucket=s3_adapter.bucket_name, 
            Key=s3_key
        )
        
        import pandas as pd
        from io import StringIO
        
        df = pd.read_csv(StringIO(response['Body'].read().decode('utf-8')))
        print(f"   CSV loaded successfully with {len(df)} rows")
        print(f"   Columns: {df.columns.tolist()}")
        
        # Show the Date column
        print(f"   Date column type: {df['Date'].dtype}")
        print(f"   First 5 Date values: {df['Date'].head().tolist()}")
        
        # Convert to datetime and show unique dates
        df['Date'] = pd.to_datetime(df['Date'])
        unique_dates = df['Date'].unique()
        print(f"   Unique dates (first 10): {[str(d) for d in unique_dates[:10]]}")
        
    except Exception as e:
        print(f"   Error loading fundamental CSV: {e}")
        return
    
    # Test 2: Check what date we get from a tick
    print("\n2. Testing tick to date conversion...")
    try:
        # Get a sample tick (let's try tick 1000)
        test_tick = 1000
        date_str = tick_indexer.get_date_from_tick(symbol, test_tick)
        print(f"   Tick {test_tick} -> Date: {date_str}")
        
        # Test a few more ticks
        for tick in [0, 500, 1000, 1500, 2000]:
            date_str = tick_indexer.get_date_from_tick(symbol, tick)
            print(f"   Tick {tick} -> Date: {date_str}")
            
    except Exception as e:
        print(f"   Error in tick to date conversion: {e}")
    
    # Test 3: Try to get fundamental data for a specific date
    print("\n3. Testing fundamental data retrieval...")
    try:
        # Try with the date we got from tick 1000
        test_date = "2025-05-27"  # This is the date you mentioned
        print(f"   Testing date: {test_date}")
        
        indicators = s3_adapter.get_fundamental_indicators(symbol, test_date)
        if indicators:
            print(f"   ✅ Found fundamental data for {test_date}")
            print(f"   Sample indicators: {list(indicators.keys())[:5]}")
        else:
            print(f"   ❌ No fundamental data found for {test_date}")
            
    except Exception as e:
        print(f"   Error retrieving fundamental data: {e}")

if __name__ == "__main__":
    test_fundamental_data() 