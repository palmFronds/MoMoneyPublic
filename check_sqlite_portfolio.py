#!/usr/bin/env python3
"""
Check SQLite portfolio entries to see if they match the trades
"""

from db import get_session
from models.trading_sim import PortfolioEntry, Trade
from sqlmodel import select

def check_sqlite_portfolio():
    """Check SQLite portfolio entries vs trades"""
    
    session_id = "session_71JDaONSbEZDztu8UcprSGMXR1s2_1"
    
    print("🔍 Checking SQLite Portfolio vs Trades...")
    
    # Get database session
    db = next(get_session())
    
    try:
        # Get all trades for MSFT
        msft_trades = db.exec(select(Trade)
                             .where(Trade.session_id == session_id)
                             .where(Trade.symbol == "MSFT")).all()
        
        print(f"\n📊 MSFT Trades in SQLite:")
        total_bought = 0
        total_sold = 0
        
        for trade in msft_trades:
            action = trade.action.value if hasattr(trade.action, 'value') else str(trade.action)
            status = trade.status.value if hasattr(trade.status, 'value') else str(trade.status)
            print(f"  {action.upper()} {trade.quantity} @ ${trade.price} - {status}")
            
            if status == 'filled':
                if action == 'buy':
                    total_bought += trade.quantity
                elif action == 'sell':
                    total_sold += trade.quantity
        
        print(f"\n  Total bought: {total_bought}")
        print(f"  Total sold: {total_sold}")
        print(f"  Net holdings: {total_bought - total_sold}")
        
        # Get MSFT portfolio entry
        msft_entry = db.exec(select(PortfolioEntry)
                            .where(PortfolioEntry.session_id == session_id)
                            .where(PortfolioEntry.symbol == "MSFT")).first()
        
        if msft_entry:
            print(f"\n📋 MSFT Portfolio Entry in SQLite:")
            print(f"  Holdings: {msft_entry.holdings}")
            print(f"  Avg Price: {msft_entry.avg_price}")
            print(f"  Last Price: {msft_entry.last_price}")
            print(f"  PnL: {msft_entry.pnl}")
            
            # Check if SQLite matches trade calculation
            expected_holdings = total_bought - total_sold
            if msft_entry.holdings == expected_holdings:
                print(f"  ✅ SQLite holdings match trades: {expected_holdings}")
            else:
                print(f"  ❌ SQLite holdings ({msft_entry.holdings}) don't match trades ({expected_holdings})")
        else:
            print(f"\n❌ No MSFT portfolio entry found in SQLite")
        
        # Get all portfolio entries
        all_entries = db.exec(select(PortfolioEntry)
                             .where(PortfolioEntry.session_id == session_id)).all()
        
        print(f"\n📋 All SQLite Portfolio Entries:")
        for entry in all_entries:
            if entry.holdings > 0:
                print(f"  {entry.symbol}: {entry.holdings} shares @ ${entry.avg_price}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_sqlite_portfolio() 