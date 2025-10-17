#!/usr/bin/env python3
"""
Debug script to check CORT, TALO, and ZBRA data loading
"""

import os
from dotenv import load_dotenv
from sim_services.s3_data_adapter import s3_adapter
from sim_services.tick_indexer import tick_indexer

# Load environment variables
load_dotenv()

def debug_symbol(symbol, interval="30s"):
    """Debug a specific symbol"""
    print(f"\n=== Debugging {symbol} ===")
    
    try:
        # Check if symbol exists in S3
        print(f"1. Checking if {symbol} exists in S3...")
        symbols = s3_adapter.get_available_symbols(interval)
        if symbol in symbols:
            print(f"   ✅ {symbol} found in available symbols")
        else:
            print(f"   ❌ {symbol} NOT found in available symbols")
            return False
        
        # Try to load DataFrame
        print(f"2. Loading DataFrame for {symbol}...")
        df = s3_adapter.get_dataframe(symbol, interval)
        if df is None:
            print(f"   ❌ Failed to load DataFrame for {symbol}")
            return False
        
        print(f"   ✅ DataFrame loaded successfully")
        print(f"   Shape: {df.shape}")
        
        # Check for null/zero values
        print(f"3. Checking data quality...")
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            print(f"   {col}: {count} null values")
        
        # Check for zero values in price columns
        price_columns = ['open', 'high', 'low', 'close']
        for col in price_columns:
            zero_count = (df[col] == 0).sum()
            total_count = len(df)
            print(f"   {col}: {zero_count}/{total_count} zero values")
        
        # Show first and last few rows
        print(f"4. First 3 rows:")
        print(df.head(3).to_string())
        
        print(f"5. Last 3 rows:")
        print(df.tail(3).to_string())
        
        # Test tick indexer
        print(f"6. Testing tick indexer...")
        total_ticks = tick_indexer.get_total_ticks(symbol, interval)
        print(f"   Total ticks: {total_ticks}")
        
        if total_ticks > 0:
            # Test first tick
            tick_data = tick_indexer.get_tick_data(symbol, 0, interval)
            if tick_data:
                print(f"   First tick data: {tick_data}")
            else:
                print(f"   ❌ No data for first tick")
            
            # Test last tick
            last_tick = total_ticks - 1
            tick_data = tick_indexer.get_tick_data(symbol, last_tick, interval)
            if tick_data:
                print(f"   Last tick data: {tick_data}")
            else:
                print(f"   ❌ No data for last tick")
            
            # Test quote
            quote = tick_indexer.get_quote(symbol, 0, interval)
            if quote:
                print(f"   Quote at tick 0: {quote}")
            else:
                print(f"   ❌ No quote data")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Error debugging {symbol}: {e}")
        return False

def main():
    """Main debug function"""
    print("🔍 Debugging CORT, TALO, and ZBRA")
    print("=" * 50)
    
    symbols_to_debug = ['CORT', 'TALO', 'ZBRA']
    
    for symbol in symbols_to_debug:
        debug_symbol(symbol)
    
    print("\n" + "=" * 50)
    print("🏁 Debug complete!")

if __name__ == "__main__":
    main() 