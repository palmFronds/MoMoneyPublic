#!/usr/bin/env python3
"""
Test script to check portfolio values and calculations
"""

import requests

def test_portfolio():
    """Test the portfolio endpoint and check calculations"""
    
    session_id = "session_71JDaONSbEZDztu8UcprSGMXR1s2_1"
    user_id = "71JDaONSbEZDztu8UcprSGMXR1s2"
    
    print("🔍 Testing Portfolio Values...")
    
    try:
        # Get portfolio data
        r = requests.get(f'http://localhost:8000/sim/portfolio?user_id={user_id}&session_id={session_id}')
        print(f"Portfolio Status: {r.status_code}")
        
        if r.status_code != 200:
            print(f"Error: {r.text}")
            return
            
        data = r.json()
        
        # Extract data
        session_cash = data['session']['cash']
        portfolio_positions = data['portfolio']
        
        print(f"\n💰 Session Cash: ${session_cash:.2f}")
        print(f"📊 Number of Positions: {len(portfolio_positions)}")
        
        # Calculate totals
        total_market_value = 0
        total_pnl = 0
        
        print("\n📈 Portfolio Positions:")
        for pos in portfolio_positions:
            symbol = pos['symbol']
            holdings = pos['holdings']
            last_price = pos['last_price']
            market_value = pos['market_value']
            pnl = pos['pnl']
            
            print(f"  {symbol}: {holdings} shares @ ${last_price:.2f} = ${market_value:.2f} (PnL: ${pnl:.2f})")
            
            total_market_value += market_value
            total_pnl += pnl
        
        print(f"\n📊 Summary:")
        print(f"  Total Market Value: ${total_market_value:.2f}")
        print(f"  Total PnL: ${total_pnl:.2f}")
        print(f"  Total Portfolio Value: ${session_cash + total_market_value:.2f}")
        
        # Check if this matches expectations
        expected_total = 100000 + total_pnl
        actual_total = session_cash + total_market_value
        
        print(f"\n🔍 Analysis:")
        print(f"  Expected Total (100k + PnL): ${expected_total:.2f}")
        print(f"  Actual Total (Cash + Market Value): ${actual_total:.2f}")
        print(f"  Difference: ${actual_total - expected_total:.2f}")
        
        if abs(actual_total - expected_total) > 0.01:
            print(f"  ❌ Mismatch detected!")
        else:
            print(f"  ✅ Values match!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_portfolio() 