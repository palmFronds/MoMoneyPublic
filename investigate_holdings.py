#!/usr/bin/env python3
"""
Investigate MSFT holdings discrepancy
"""

from unified_app.firebase_setup.firebaseSet import db

def investigate_msft_holdings():
    """Investigate why MSFT holdings show 12 instead of 3"""
    
    session_id = "session_71JDaONSbEZDztu8UcprSGMXR1s2_1"
    
    print("🔍 Investigating Holdings Discrepancy...")
    
    # 1. Check all MSFT trades
    print("\n1. All MSFT trades:")
    trades_ref = db.collection('trades')
    msft_trades = list(trades_ref.where('session_id', '==', session_id).where('symbol', '==', 'MSFT').stream())
    print(f"   Found {len(msft_trades)} MSFT trades")
    
    total_bought = 0
    total_sold = 0
    
    for i, trade_doc in enumerate(msft_trades):
        trade = trade_doc.to_dict()
        action = trade['action']
        quantity = trade['quantity']
        price = trade['price']
        status = trade['status']
        
        if action == 'buy':
            total_bought += quantity
        elif action == 'sell':
            total_sold += quantity
            
        print(f"   {i+1}. {action.upper()} {quantity} @ ${price} - {status}")
    
    print(f"\n   Total bought: {total_bought}")
    print(f"   Total sold: {total_sold}")
    print(f"   Net holdings: {total_bought - total_sold}")
    
    # 2. Check GOOGL trades
    print("\n2. All GOOGL trades:")
    googl_trades = list(trades_ref.where('session_id', '==', session_id).where('symbol', '==', 'GOOGL').stream())
    print(f"   Found {len(googl_trades)} GOOGL trades")
    
    googl_total_bought = 0
    googl_total_sold = 0
    
    for i, trade_doc in enumerate(googl_trades):
        trade = trade_doc.to_dict()
        action = trade['action']
        quantity = trade['quantity']
        price = trade['price']
        status = trade['status']
        
        if action == 'buy':
            googl_total_bought += quantity
        elif action == 'sell':
            googl_total_sold += quantity
            
        print(f"   {i+1}. {action.upper()} {quantity} @ ${price} - {status}")
    
    print(f"\n   Total bought: {googl_total_bought}")
    print(f"   Total sold: {googl_total_sold}")
    print(f"   Net holdings: {googl_total_bought - googl_total_sold}")
    
    # 3. Check portfolio entries
    print("\n3. Portfolio entries:")
    portfolio_ref = db.collection('portfolio_entries')
    
    # MSFT portfolio entry
    msft_portfolio = list(portfolio_ref.where('session_id', '==', session_id).where('symbol', '==', 'MSFT').stream())
    if msft_portfolio:
        portfolio_entry = msft_portfolio[0].to_dict()
        print(f"   MSFT - Holdings: {portfolio_entry.get('holdings', 0)}, Avg price: {portfolio_entry.get('avg_price', 0)}")
    else:
        print("   MSFT - No portfolio entry found")
    
    # GOOGL portfolio entry
    googl_portfolio = list(portfolio_ref.where('session_id', '==', session_id).where('symbol', '==', 'GOOGL').stream())
    if googl_portfolio:
        portfolio_entry = googl_portfolio[0].to_dict()
        print(f"   GOOGL - Holdings: {portfolio_entry.get('holdings', 0)}, Avg price: {portfolio_entry.get('avg_price', 0)}")
    else:
        print("   GOOGL - No portfolio entry found")
    
    # 4. Check all portfolio entries with holdings > 0
    print("\n4. All portfolio entries with holdings > 0:")
    all_entries = list(portfolio_ref.where('session_id', '==', session_id).stream())
    
    for entry_doc in all_entries:
        entry = entry_doc.to_dict()
        holdings = entry.get('holdings', 0)
        if holdings > 0:
            symbol = entry.get('symbol', 'Unknown')
            avg_price = entry.get('avg_price', 0)
            print(f"   {symbol}: {holdings} shares @ ${avg_price}")

if __name__ == "__main__":
    investigate_msft_holdings() 