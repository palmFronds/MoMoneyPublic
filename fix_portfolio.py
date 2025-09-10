#!/usr/bin/env python3
"""
Fix portfolio entries by recalculating holdings based on actual trades
"""

from unified_app.firebase_setup.firebaseSet import db
from datetime import datetime, timezone

def fix_portfolio_holdings():
    """Recalculate all portfolio entries based on actual trades"""
    
    session_id = "session_71JDaONSbEZDztu8UcprSGMXR1s2_1"
    
    print("🔧 Fixing Portfolio Holdings...")
    
    # Get all trades for this session
    trades_ref = db.collection('trades')
    all_trades = list(trades_ref.where('session_id', '==', session_id).stream())
    
    print(f"Found {len(all_trades)} total trades")
    
    # Group trades by symbol
    symbol_trades = {}
    for trade_doc in all_trades:
        trade = trade_doc.to_dict()
        symbol = trade['symbol']
        if symbol not in symbol_trades:
            symbol_trades[symbol] = []
        symbol_trades[symbol].append(trade)
    
    print(f"Trades by symbol: {list(symbol_trades.keys())}")
    
    # Calculate correct holdings for each symbol
    correct_holdings = {}
    for symbol, trades in symbol_trades.items():
        total_bought = 0
        total_sold = 0
        total_cost = 0
        total_shares_bought = 0
        
        print(f"\n📊 Calculating holdings for {symbol}:")
        
        for trade in trades:
            action = trade['action']
            quantity = trade['quantity']
            price = trade['price']
            status = trade['status']
            
            print(f"  {action.upper()} {quantity} @ ${price} - {status}")
            
            if status == 'filled':
                if action == 'buy':
                    total_bought += quantity
                    total_cost += quantity * price
                    total_shares_bought += quantity
                elif action == 'sell':
                    total_sold += quantity
        
        net_holdings = total_bought - total_sold
        avg_price = total_cost / total_shares_bought if total_shares_bought > 0 else 0
        
        correct_holdings[symbol] = {
            'holdings': net_holdings,
            'avg_price': avg_price,
            'total_bought': total_bought,
            'total_sold': total_sold
        }
        
        print(f"  ✅ {symbol}: {net_holdings} shares @ ${avg_price:.2f}")
        print(f"     (Bought: {total_bought}, Sold: {total_sold})")
    
    # Update portfolio entries in Firebase
    portfolio_ref = db.collection('portfolio_entries')
    all_portfolio_entries = list(portfolio_ref.where('session_id', '==', session_id).stream())
    
    print(f"\n🔄 Updating {len(all_portfolio_entries)} portfolio entries...")
    
    for entry_doc in all_portfolio_entries:
        entry = entry_doc.to_dict()
        symbol = entry.get('symbol')
        
        if symbol in correct_holdings:
            correct_data = correct_holdings[symbol]
            
            # Update the portfolio entry
            entry_doc.reference.update({
                'holdings': correct_data['holdings'],
                'avg_price': correct_data['avg_price'],
                'pnl': 0,  # Will be recalculated by WebSocket
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
            
            print(f"  ✅ Updated {symbol}: {correct_data['holdings']} shares @ ${correct_data['avg_price']:.2f}")
        else:
            print(f"  ⚠️ No trades found for {symbol}, setting holdings to 0")
            entry_doc.reference.update({
                'holdings': 0,
                'avg_price': 0,
                'pnl': 0,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
    
    print("\n✅ Portfolio holdings fixed!")
    
    # Show final summary
    print("\n📋 Final Portfolio Summary:")
    for symbol, data in correct_holdings.items():
        if data['holdings'] > 0:
            print(f"  {symbol}: {data['holdings']} shares @ ${data['avg_price']:.2f}")

if __name__ == "__main__":
    fix_portfolio_holdings() 