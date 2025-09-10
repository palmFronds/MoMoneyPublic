import pandas as pd
from datetime import datetime, timezone
from uuid import uuid4
from models.trading_sim import (SimulationSession, Trade, Action, PortfolioEntry,
                                START_BALANCE, DURATION_SECONDS, OrderType, OrderStatus)
from sqlmodel import Session, select
from typing import Dict, Optional, List
from .tick_indexer import tick_indexer
from datetime import datetime, timezone
from unified_app.firebase_setup.firebaseSet import db
from .s3_data_adapter import s3_adapter
from db import get_session
import threading
import time

class SimulationEngine:
    def __init__(self):
        self.active_sessions = {}
        self.session_threads = {}
        self.stop_event = threading.Event()
        
        # Start background thread for price updates
        self.price_update_thread = threading.Thread(target=self._price_update_loop, daemon=True)
        self.price_update_thread.start()
        
    def get_current_tick(self, session_id: str) -> int:
        """Get the current tick for a session."""
        try:
            db = next(get_session())
            session = db.query(SimulationSession).filter_by(id=session_id).first()
            if not session:
                return 0
            
            # Calculate tick based on elapsed time
            # Ensure both datetimes are timezone-aware
            current_time = datetime.now(timezone.utc)
            session_start = session.start_time.replace(tzinfo=timezone.utc) if session.start_time.tzinfo is None else session.start_time
            elapsed = (current_time - session_start).total_seconds()

            # Get total ticks from any available symbol
            symbols = s3_adapter.get_available_symbols()
            if not symbols:
                return 0
                
            total_ticks = tick_indexer.get_total_ticks(symbols[0])
            
            if total_ticks == 0:
                return 0
            
            # Calculate tick based on elapsed time and session duration
            tick = int((elapsed / session.duration_seconds) * total_ticks)
            
            # Ensure tick is within bounds
            tick = max(0, min(tick, total_ticks - 1))
            
            return tick
            
        except Exception as e:
            print(f"Error getting current tick: {e}")
            return 0
        finally:
            db.close()

    def activate_firestore_session(self, session_id: str) -> bool:
        """
        Activate a dormant Firestore simulation session and start it rolling.
        This function handles the complete activation process including:
        - Updating session status in Firestore
        - Creating corresponding SQLite session for trading engine
        - Initializing portfolio entries if needed
        - Starting the session in the simulation engine
        - Adding to active sessions tracking
        """
        try:
            # Get the session from Firestore
            session_ref = db.collection("simulation_sessions").document(session_id)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                print(f"Session {session_id} not found in Firestore")
                return False
            
            session_data = session_doc.to_dict()
            
            # Check if session is already active
            if session_data.get("is_active", False):
                print(f"Session {session_id} is already active")
                return True
            
            # Update session to active status
            current_time = datetime.now(timezone.utc)
            session_ref.update({
                "is_active": True,
                "start_time": current_time.isoformat(),
                "current_tick": 0,
                "last_activated": current_time.isoformat()
            })
            
            # Create corresponding SQLite session for trading engine
            try:
                with get_session() as sqlite_db:
                    # Check if SQLite session already exists
                    existing_session = sqlite_db.exec(select(SimulationSession).where(SimulationSession.id == session_id)).first()
                    
                    if not existing_session:
                        # Create new SQLite session
                        sqlite_session = SimulationSession(
                            id=session_id,
                            user_id=session_data.get("user_id"),
                            current_tick=0,
                            cash=session_data.get("cash", 100000.0),
                            is_active=True,
                            label=session_data.get("label", "Trading Session"),
                            start_time=current_time,
                            duration_seconds=session_data.get("duration_seconds", 3600),
                            pnl=0.0
                        )
                        sqlite_db.add(sqlite_session)
                        
                        # Initialize portfolio entries in SQLite
                        symbols = s3_adapter.get_available_symbols()
                        for symbol in symbols:
                            entry = PortfolioEntry(
                                session_id=session_id,
                                symbol=symbol,
                                holdings=0,
                                last_price=0.0,
                                avg_price=0.0,
                                pnl=0.0,
                                stop_loss_price=None,
                                take_profit_price=None
                            )
                            sqlite_db.add(entry)
                        
                        sqlite_db.commit()
                        print(f"   - Created SQLite session {session_id} for trading engine")
                    else:
                        # Update existing SQLite session to active
                        existing_session.is_active = True
                        existing_session.start_time = current_time
                        existing_session.current_tick = 0
                        sqlite_db.commit()
                        print(f"   - Reactivated existing SQLite session {session_id}")
                        
            except Exception as e:
                print(f"Warning: Could not create SQLite session: {e}")
                # Continue with Firestore activation even if SQLite fails
            
            # Initialize portfolio entries if they don't exist
            self._initialize_portfolio_entries(session_id)
            
            # Add to active sessions tracking
            self.active_sessions[session_id] = {
                "id": session_id,
                "user_id": session_data.get("user_id"),
                "start_time": current_time,
                "duration_seconds": session_data.get("duration_seconds", 3600),
                "cash": session_data.get("cash", 100000.0),
                "label": session_data.get("label", "Trading Session")
            }
            
            print(f"✅ Successfully activated session {session_id}")
            print(f"   - User: {session_data.get('user_id')}")
            print(f"   - Label: {session_data.get('label')}")
            print(f"   - Cash: ${session_data.get('cash', 100000.0):,.2f}")
            print(f"   - Duration: {session_data.get('duration_seconds', 3600)} seconds")
            
            return True
            
        except Exception as e:
            print(f"❌ Error activating session {session_id}: {e}")
            return False
    
    def _initialize_portfolio_entries(self, session_id: str) -> None:
        """
        Initialize portfolio entries for a session if they don't exist.
        This ensures the session has portfolio entries for all available symbols.
        """
        try:
            # Get available symbols
            symbols = s3_adapter.get_available_symbols()
            if not symbols:
                print(f"No symbols available for session {session_id}")
                return
            
            # Check if portfolio entries already exist
            portfolio_ref = db.collection("portfolio_entries")
            existing_entries = portfolio_ref.where("session_id", "==", session_id).stream()
            existing_symbols = {entry.to_dict().get("symbol") for entry in existing_entries}
            
            # Create entries for missing symbols
            for symbol in symbols:
                if symbol not in existing_symbols:
                    portfolio_ref.add({
                        "session_id": session_id,
                        "symbol": symbol,
                        "holdings": 0,
                        "last_price": 0.0,
                        "avg_price": 0.0,
                        "pnl": 0.0,
                        "stop_loss_price": None,
                        "take_profit_price": None,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                    print(f"   - Created portfolio entry for {symbol}")
            
        except Exception as e:
            print(f"Error initializing portfolio entries for session {session_id}: {e}")
    
    def deactivate_firestore_session(self, session_id: str) -> bool:
        """
        Deactivate an active Firestore simulation session.
        This stops the session and calculates final P&L.
        """
        try:
            # Get the session from Firestore
            session_ref = db.collection("simulation_sessions").document(session_id)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                print(f"Session {session_id} not found in Firestore")
                return False
            
            session_data = session_doc.to_dict()
            
            # Check if session is already inactive
            if not session_data.get("is_active", False):
                print(f"Session {session_id} is already inactive")
                return True
            
            # Calculate final P&L from portfolio entries
            total_pnl = 0.0
            portfolio_ref = db.collection("portfolio_entries")
            portfolio_entries = portfolio_ref.where("session_id", "==", session_id).stream()
            
            for entry in portfolio_entries:
                entry_data = entry.to_dict()
                if entry_data.get("holdings", 0) > 0:
                    # Get current price for this symbol (you might need to implement this)
                    current_price = entry_data.get("last_price", 0.0)
                    avg_price = entry_data.get("avg_price", 0.0)
                    holdings = entry_data.get("holdings", 0)
                    
                    if current_price > 0 and avg_price > 0:
                        entry_pnl = (current_price - avg_price) * holdings
                        total_pnl += entry_pnl
            
            # Update session to inactive status
            current_time = datetime.now(timezone.utc)
            session_ref.update({
                "is_active": False,
                "end_time": current_time.isoformat(),
                "pnl": total_pnl,
                "last_deactivated": current_time.isoformat()
            })
            
            # Deactivate corresponding SQLite session
            try:
                with get_session() as sqlite_db:
                    sqlite_session = sqlite_db.exec(select(SimulationSession).where(SimulationSession.id == session_id)).first()
                    if sqlite_session:
                        sqlite_session.is_active = False
                        sqlite_session.pnl = total_pnl
                        sqlite_db.commit()
                        print(f"   - Deactivated SQLite session {session_id}")
            except Exception as e:
                print(f"Warning: Could not deactivate SQLite session: {e}")
            
            # Remove from active sessions tracking
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            
            print(f"✅ Successfully deactivated session {session_id}")
            print(f"   - Final P&L: ${total_pnl:,.2f}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error deactivating session {session_id}: {e}")
            return False
    
    def get_firestore_session_status(self, session_id: str) -> Optional[Dict]:
        """
        Get the status of a Firestore simulation session.
        """
        try:
            session_ref = db.collection("simulation_sessions").document(session_id)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                return None
            
            session_data = session_doc.to_dict()
            
            # Calculate current tick if session is active
            current_tick = 0
            if session_data.get("is_active", False):
                start_time_str = session_data.get("start_time")
                if start_time_str:
                    try:
                        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        current_time = datetime.now(timezone.utc)
                        elapsed = (current_time - start_time).total_seconds()
                        duration = session_data.get("duration_seconds", 3600)
                        
                        # Get total ticks from any available symbol
                        symbols = s3_adapter.get_available_symbols()
                        if symbols:
                            total_ticks = tick_indexer.get_total_ticks(symbols[0])
                            if total_ticks > 0:
                                current_tick = int((elapsed / duration) * total_ticks)
                                current_tick = max(0, min(current_tick, total_ticks - 1))
                    except Exception as e:
                        print(f"Error calculating current tick: {e}")
            
            return {
                "id": session_id,
                "user_id": session_data.get("user_id"),
                "current_tick": current_tick,
                "cash": session_data.get("cash", 100000.0),
                "is_active": session_data.get("is_active", False),
                "label": session_data.get("label", "Trading Session"),
                "start_time": session_data.get("start_time"),
                "duration_seconds": session_data.get("duration_seconds", 3600),
                "pnl": session_data.get("pnl", 0.0),
                "created_at": session_data.get("created_at")
            }
            
        except Exception as e:
            print(f"Error getting session status {session_id}: {e}")
            return None

    def start_simulation_session(session_id):
        session_ref = db.collection("simulation_sessions").document(session_id)
        session = session_ref.get()
        if session.exists:
            session_ref.update({
                "is_active": True,
                "start_time": datetime.now(timezone.utc).isoformat(),
                "current_tick": 0
            })
            print(f"Session {session_id} started.")
        else:
            print(f"Session {session_id} not found.")
            
    def get_total_ticks(self, symbol: str, interval: str = '30s') -> int:
        """Get total number of ticks for a symbol."""
        return tick_indexer.get_total_ticks(symbol, interval)
        
    def get_quote_for_symbol(self, session_id: str, symbol: str) -> Optional[Dict]:
        """Get current quote for a symbol in a session using Firebase."""
        try:
            # Use Firestore for session validation
            from unified_app.firebase_setup.firebaseSet import db as firestore_db
            
            # Get session from Firestore
            session_ref = firestore_db.collection("simulation_sessions").document(session_id)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                return None
            
            session_data = session_doc.to_dict()
            
            # Check if session is active
            if not session_data.get("is_active", False):
                return None
            
            # Calculate current tick based on elapsed time
            current_time = datetime.now(timezone.utc)
            start_time_str = session_data.get("start_time")
            
            if not start_time_str:
                return None
            
            # Parse start time
            if isinstance(start_time_str, str):
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            else:
                start_time = start_time_str
            
            # Ensure timezone awareness
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            
            # Calculate elapsed time and current tick
            elapsed_seconds = (current_time - start_time).total_seconds()
            duration_seconds = session_data.get("duration_seconds", 3600)
            
            # Calculate current tick based on elapsed time
            # 1 day = 780 ticks (6.5 hours * 2 trades/min)
            ticks_per_day = 780
            total_ticks = (duration_seconds / 86400) * ticks_per_day
            current_tick = min(int((elapsed_seconds / duration_seconds) * total_ticks), int(total_ticks) - 1)
            current_tick = max(0, current_tick)
            
            return tick_indexer.get_quote(symbol, current_tick)
            
        except Exception as e:
            print(f"Error getting quote: {e}")
            return None
            
    def sync_current_tick_for_session(self, session_id: str) -> None:
        """Sync the current tick for a session."""
        db = None
        try:
            db = next(get_session())
            session = db.query(SimulationSession).filter_by(id=session_id).first()
            if not session or not session.is_active:
                return
                
            # Calculate current tick based on elapsed time
            current_tick = self.get_current_tick(session_id)
            
            # Get total ticks from any available symbol (since session doesn't have a specific symbol)
            symbols = s3_adapter.get_available_symbols()
            if not symbols:
                return
                
            total_ticks = self.get_total_ticks(symbols[0])  # Use first available symbol
            
            if current_tick >= total_ticks - 1:
                self.end_session(session_id)
                return
                
            # Update session's current_tick to match the calculated tick
            session.current_tick = current_tick
            
            # Update prices for the new tick
            print(f"Updating prices for session {session_id} at tick {session.current_tick}")
            update_prices(db, session_id, session.current_tick)
            
            db.commit()
            
        except Exception as e:
            print(f"Error syncing current tick: {e}")
            if db:
                try:
                    db.rollback()
                except:
                    pass  # Ignore rollback errors
        finally:
            if db:
                db.close()
            
    def end_session(self, session_id: str) -> None:
        """End a simulation session."""
        db = None
        try:
            db = next(get_session())
            session = db.query(SimulationSession).filter_by(id=session_id).first()
            if not session:
                return
                
            session.is_active = False
            # Note: end_time field doesn't exist in the model, so we'll skip it
            
            # Calculate final PNL from portfolio entries instead of session symbol
            entries = db.query(PortfolioEntry).filter_by(session_id=session_id).all()
            total_pnl = 0.0
            
            # Get current tick based on elapsed time
            current_tick = self.get_current_tick(session_id)
            
            for entry in entries:
                if entry.holdings > 0:
                    # Get current price for this symbol
                    current_price = tick_indexer.get_current_price(entry.symbol, current_tick)
                    if current_price:
                        entry.pnl = (current_price - entry.avg_price) * entry.holdings
                        total_pnl += entry.pnl
            
            session.pnl = total_pnl
            db.commit()
            
        except Exception as e:
            print(f"Error ending session: {e}")
            if db:
                try:
                    db.rollback()
                except:
                    pass  # Ignore rollback errors
        finally:
            if db:
                db.close()
            
    def clear_cache(self) -> None:
        """Clear the tick data cache."""
        tick_indexer.clear_cache()

    def get_price_at_tick(self, symbol: str, tick: int) -> Optional[float]:
        """Get the price for a symbol at a specific tick."""
        try:
            tick_data = tick_indexer.get_tick_data(symbol, tick)
            if tick_data:
                return tick_data.get("close")
            return None
        except Exception as e:
            print(f"Error getting price for {symbol} at tick {tick}: {e}")
            return None

    def start_session(self, session_id: str, user_id: str, duration_seconds: int = 3600, label: str = "Trading Session"):
        """Start a new simulation session."""
        try:
            with get_session() as db:
                # Create session
                session = SimulationSession(
                    id=session_id,
                    user_id=user_id,
                    current_tick=0,
                    cash=100000.0,
                    is_active=True,
                    label=label,
                    start_time=datetime.now(timezone.utc),
                    duration_seconds=duration_seconds,
                    pnl=0.0
                )
                
                db.add(session)
                
                # Initialize portfolio with all available symbols
                symbols = s3_adapter.get_available_symbols()
                for symbol in symbols:
                    entry = PortfolioEntry(
                        session_id=session_id,
                        symbol=symbol,
                        holdings=0,
                        last_price=0.0,
                        avg_price=0.0,
                        pnl=0.0,
                        stop_loss_price=None,
                        take_profit_price=None
                    )
                    db.add(entry)
                
                db.commit()
                
                # Add to active sessions
                self.active_sessions[session_id] = session
                
                print(f"Started simulation session {session_id}")
                return True
                
        except Exception as e:
            print(f"Error starting session {session_id}: {e}")
            return False
    
    def stop_session(self, session_id: str):
        """Stop a simulation session."""
        try:
            with get_session() as db:
                session = db.query(SimulationSession).filter(
                    SimulationSession.id == session_id
                ).first()
                
                if session:
                    session.is_active = False
                    db.commit()
                
                # Remove from active sessions
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                
                print(f"Stopped simulation session {session_id}")
                return True
                
        except Exception as e:
            print(f"Error stopping session {session_id}: {e}")
            return False
    
    def get_session_status(self, session_id: str) -> Optional[Dict]:
        """Get the status of a simulation session."""
        try:
            with get_session() as db:
                session = db.query(SimulationSession).filter(
                    SimulationSession.id == session_id
                ).first()
                
                if not session:
                    return None
                
                current_tick = self.get_current_tick(session_id)
                
                return {
                    "id": session.id,
                    "user_id": session.user_id,
                    "current_tick": current_tick,
                    "cash": session.cash,
                    "is_active": session.is_active,
                    "label": session.label,
                    "start_time": session.start_time.isoformat(),
                    "duration_seconds": session.duration_seconds,
                    "pnl": session.pnl
                }
                
        except Exception as e:
            print(f"Error getting session status {session_id}: {e}")
            return None
    
    def _price_update_loop(self):
        """Background loop for updating prices."""
        while not self.stop_event.is_set():
            try:
                # Update prices for all active sessions
                for session_id in list(self.active_sessions.keys()):
                    try:
                        with get_session() as db:
                            session = db.query(SimulationSession).filter(
                                SimulationSession.id == session_id
                            ).first()
                            
                            if not session or not session.is_active:
                                if session_id in self.active_sessions:
                                    del self.active_sessions[session_id]
                                continue
                            
                            # Calculate current tick based on elapsed time
                            current_tick = self.get_current_tick(session_id)
                            
                            # Update session's current_tick field
                            session.current_tick = current_tick
                            
                            # Update prices for current tick
                            self.sync_current_tick_for_session(session_id)
                            
                            # Check exit conditions
                            symbols = s3_adapter.get_available_symbols()
                            if symbols:
                                total_ticks = self.get_total_ticks(symbols[0])
                                if current_tick >= total_ticks - 1:
                                    session.is_active = False
                                    db.commit()
                                    if session_id in self.active_sessions:
                                        del self.active_sessions[session_id]
                                    print(f"Session {session_id} completed")
                                    
                    except Exception as e:
                        print(f"Error updating session {session_id}: {e}")
                        continue
                
                # Sleep for a short interval
                time.sleep(30)
                
            except Exception as e:
                print(f"Error in price update loop: {e}")
                time.sleep(30)
    
    def cleanup(self):
        """Cleanup resources."""
        self.stop_event.set()
        self.clear_cache()

# Global simulation engine instance
sim_engine = SimulationEngine()

""" to streamline making, storing sessions, processing trades, streaming the ticks, 
and streamlining the clusterfuckery """

""" when the user hits 'start rolling' and the trading time window open """
def start_session(db: Session, user_id: str, label: str = "New Simulation",
                  duration_seconds: int = 600):
    session = SimulationSession(
        user_id=user_id,
        label=label,
        duration_seconds=duration_seconds
    )  # now searching against label since we might have more than one session

    db.add(session)
    db.commit()
    db.refresh(session)

    # Get available symbols from S3
    symbols = s3_adapter.get_available_symbols()
    for symbol in symbols:
        entry = PortfolioEntry(
            session_id=session.id,
            symbol=symbol,
            holdings=0,
            last_price=0.0
        )
        db.add(entry)

    db.commit()
    return session


""" retrieve a specific session, when user reopens or the current status is needed """


def get_simulation_session(db: Session, session_id: str) -> Optional[SimulationSession]:
    session = db.exec(select(SimulationSession).where(SimulationSession.id == session_id)).first()
    # searching by simulation_id, might have to add a simpler means to do that

    if session:  # if that bih around
        # Don't call sync_current_tick_for_session here as it creates its own db session
        # The sync should be done separately when needed
        pass

    return session


""" getting all the active or inactive simulation sessions for user {user_id}"""


def get_user_sessions(db: Session, user_id: str) -> List[SimulationSession]:
    sessions = db.exec(select(SimulationSession).where(SimulationSession.user_id == user_id)).all()
    # Don't call sync_current_tick_for_session here as it creates its own db session
    # The sync should be done separately when needed

    # parse output for whatever you need on the dashboard
    return [{'tick': s.current_tick, 'active': s.is_active} for s in sessions]

    # return sessions doesn't work, it's not serialized


""" calculating pnl for the current user, within session {session_id} """


def calculate_pnl(db: Session, session: SimulationSession) -> float:
    entries = db.exec(select(PortfolioEntry).where(PortfolioEntry.session_id == session.id)).all()
    total = session.cash
    for e in entries:
        total += e.holdings * e.last_price  # taking this bitch on faith

    return total - START_BALANCE


""" when we move to the next tick in the session """


def update_prices(db: Session, session_id: str, tick: int) -> bool:
    """Update prices for all portfolio entries at the given tick."""
    try:
        # Get session
        session = db.query(SimulationSession).filter(
            SimulationSession.id == session_id
        ).first()
        
        if not session:
            return False
        
        # Get all portfolio entries for this session
        portfolio_entries = db.query(PortfolioEntry).filter(
            PortfolioEntry.session_id == session_id
        ).all()
        
        if not portfolio_entries:
            return False
        
        # Update prices for each symbol
        for entry in portfolio_entries:
            try:
                # Get price for this symbol at current tick
                price = tick_indexer.get_current_price(entry.symbol, tick)
                if price is not None:
                    old_price = entry.last_price
                    entry.last_price = price
                    
                    # Calculate P&L
                    if entry.holdings > 0 and entry.avg_price:
                        entry.pnl = (price - entry.avg_price) * entry.holdings
                    else:
                        entry.pnl = 0.0
                    
                    print(f"Updated {entry.symbol}: {old_price} -> {price} (tick {tick})")
                        
            except Exception as e:
                print(f"Error updating price for {entry.symbol}: {e}")
                continue
        
        # Commit changes
        db.commit()
        return True
        
    except Exception as e:
        print(f"Error updating prices for tick {tick}: {e}")
        return False


""" processing trades within the simulation """


def process_trade(db: Session, session: SimulationSession, symbol: str, action: Action,
                  quantity: int, price: float, order_type: OrderType = OrderType.MARKET,
                  stop_loss: Optional[float] = None, take_profit: Optional[float] = None):

    # syncing the ticks manually before the trade
    sync_current_tick_for_session(db, session)

    # Get current tick data using time-based calculation
    current_tick = get_current_tick(db, session)
    tick_data = tick_indexer.get_tick_data(symbol, current_tick)
    
    if not tick_data:
        raise ValueError(f"No data available for {symbol} at tick {current_tick}")

    # Use current market price if not specified
    if price == 0:
        price = tick_data["close"]

    # Create trade record
    trade = Trade(
        session_id=session.id,
        symbol=symbol,
        action=action,
        quantity=quantity,
        price=price,
        order_type=order_type,
        status=OrderStatus.PENDING,
        stop_loss=stop_loss,
        take_profit=take_profit
    )

    db.add(trade)
    db.commit()
    db.refresh(trade)

    # Execute the trade immediately for market orders
    if order_type == OrderType.MARKET:
        entry = db.exec(select(PortfolioEntry)
                       .where(PortfolioEntry.session_id == session.id)
                       .where(PortfolioEntry.symbol == symbol)).first()
        
        if not entry:
            entry = PortfolioEntry(
                session_id=session.id,
                symbol=symbol,
                holdings=0,
                last_price=price
            )
            db.add(entry)

        execute_trade(db, session, entry, trade)
        
        # Set exit conditions (stop-loss and take-profit) on the portfolio entry
        if stop_loss is not None or take_profit is not None:
            set_exit_conditions(db, session.id, symbol, stop_loss, take_profit)

    return trade


def execute_trade(db: Session, session: SimulationSession, entry: PortfolioEntry, trade: Trade):
    """Execute a trade and update portfolio."""
    try:
        # Calculate trade value
        trade_value = trade.quantity * trade.price
        
        if trade.action == Action.BUY:
            # Buy logic
            if session.cash >= trade_value:
                session.cash -= trade_value
                entry.holdings += trade.quantity
                
                # Update average price
                total_cost = (entry.avg_price * (entry.holdings - trade.quantity)) + trade_value
                entry.avg_price = total_cost / entry.holdings if entry.holdings > 0 else 0
                
                trade.status = OrderStatus.FILLED

            else:
                trade.status = OrderStatus.REJECTED
                raise ValueError("Insufficient funds")
                
        elif trade.action == Action.SELL:
            # Sell logic
            if entry.holdings >= trade.quantity:
                session.cash += trade_value
                entry.holdings -= trade.quantity
                
                # Update average price (only if still holding)
                if entry.holdings > 0:
                    # Keep the same average price for remaining shares
                    pass
                else:
                    entry.avg_price = 0

                trade.status = OrderStatus.FILLED

            else:
                trade.status = OrderStatus.REJECTED
                raise ValueError("Insufficient shares")
        
        # Update entry price and PnL
        entry.last_price = trade.price
        if entry.holdings != 0:
            entry.pnl = (trade.price - entry.avg_price) * entry.holdings
        
        # Update session PnL
        session.pnl = calculate_pnl(db, session)
        
        db.commit()
        
    except Exception as e:
        print(f"Error executing trade: {e}")
        db.rollback()
        raise


def check_pending_orders(db: Session, session: SimulationSession):
    """Check and execute pending orders based on current prices."""
    try:
        current_tick = get_current_tick(db, session)
        pending_orders = db.exec(select(Trade)
                               .where(Trade.session_id == session.id)
                               .where(Trade.status == OrderStatus.PENDING)).all()
        
        for order in pending_orders:
            current_price = tick_indexer.get_current_price(order.symbol, current_tick)
            if not current_price:
                continue

            # Check stop loss
            if order.stop_loss and order.action == Action.SELL:
                if current_price <= order.stop_loss:
                    order.price = current_price
                    entry = db.exec(select(PortfolioEntry)
                                  .where(PortfolioEntry.session_id == session.id)
                                  .where(PortfolioEntry.symbol == order.symbol)).first()
                    if entry:
                        execute_trade(db, session, entry, order)
            
            # Check take profit
            elif order.take_profit and order.action == Action.BUY:
                if current_price >= order.take_profit:
                    order.price = current_price
                    entry = db.exec(select(PortfolioEntry)
                                  .where(PortfolioEntry.session_id == session.id)
                                  .where(PortfolioEntry.symbol == order.symbol)).first()
                    if entry:
                        execute_trade(db, session, entry, order)

        db.commit()
        
    except Exception as e:
        print(f"Error checking pending orders: {e}")
        db.rollback()


def cancel_order(db: Session, session_id: str, order_id: int):
    """Cancel a pending order."""
    try:
        order = db.exec(select(Trade)
                       .where(Trade.id == order_id)
                       .where(Trade.session_id == session_id)).first()
        
        if not order:
            raise ValueError("Order not found")
        
        if order.status != OrderStatus.PENDING:
            raise ValueError("Order cannot be cancelled")
        
        order.status = OrderStatus.CANCELLED
        db.commit()
        
        return order
        
    except Exception as e:
        print(f"Error cancelling order: {e}")
        db.rollback()
        raise


def log_trade(db: Session, session_id: str, symbol: str, action: Action, quantity: int,
              price: float, triggered: bool):
    # logging each trade, for a trade history
    trade = Trade(
        session_id=session_id,
        symbol=symbol,
        action=action,
        quantity=quantity,
        price=price,
        status=OrderStatus.FILLED if triggered else OrderStatus.PENDING
    )
    db.add(trade)
    db.commit()
    return trade


def set_exit_conditions(db: Session, session_id: str, symbol: str, stop_loss: Optional[float] = None,
                        take_profit: Optional[float] = None):
    """Set stop loss and take profit for a symbol."""
    try:
        entry = db.exec(select(PortfolioEntry)
                       .where(PortfolioEntry.session_id == session_id)
                       .where(PortfolioEntry.symbol == symbol)).first()
        
        if not entry:
            raise ValueError("Portfolio entry not found")

        # Always update the values, even if they are None (to remove exit conditions)
            entry.stop_loss_price = stop_loss
            entry.take_profit_price = take_profit

        db.commit()

    except Exception as e:
        print(f"Error setting exit conditions: {e}")
        db.rollback()
        raise


def get_current_tick(db: Session, session: SimulationSession) -> int:
    """Get the current tick for a session."""
    try:
        # Calculate tick based on elapsed time
        # Ensure both datetimes are timezone-aware
        current_time = datetime.now(timezone.utc)
        session_start = session.start_time.replace(tzinfo=timezone.utc) if session.start_time.tzinfo is None else session.start_time
        elapsed = (current_time - session_start).total_seconds()

        # Get total ticks from any available symbol
        symbols = s3_adapter.get_available_symbols()
        if not symbols:
            return 0
            
        total_ticks = tick_indexer.get_total_ticks(symbols[0])
        
        if total_ticks == 0:
            return 0
        
        # Calculate tick based on elapsed time and session duration
        tick = int((elapsed / session.duration_seconds) * total_ticks)
        
        # Ensure tick is within bounds
        tick = max(0, min(tick, total_ticks - 1))
        
        return tick
        
    except Exception as e:
        print(f"Error calculating current tick: {e}")
        return 0


def sync_current_tick_for_session(db: Session, session: SimulationSession) -> None:
    """Sync the current tick for a session."""

    try:
        if not session.is_active:
            return
        
        # Calculate current tick based on elapsed time
        current_tick = get_current_tick(db, session)
        
        # Get total ticks from any available symbol
        symbols = s3_adapter.get_available_symbols()
        if not symbols:
            return
            
        total_ticks = tick_indexer.get_total_ticks(symbols[0])
        
        if current_tick >= total_ticks - 1:
            # End session if we've reached the end
            end_session(db, session)
            return
        
        # Update session's current_tick to match the calculated tick
        session.current_tick = current_tick
        
        # Update prices for current tick
        update_prices(db, session.id, current_tick)
        
        # Check exit conditions
        check_exit_conditions(db, session)
        
        db.commit()

    except Exception as e:
        print(f"Error syncing current tick: {e}")
        try:
            db.rollback()

        except:
            pass  # Ignore rollback errors


def check_exit_conditions(db: Session, session: SimulationSession):
    """Check and execute exit conditions for all portfolio entries."""

    try:
        entries = db.exec(select(PortfolioEntry)
                         .where(PortfolioEntry.session_id == session.id)).all()
        
        current_tick = get_current_tick(db, session)

        for entry in entries:
            current_price = tick_indexer.get_current_price(entry.symbol, current_tick)
            if not current_price:
                continue

            # Check stop loss
            if entry.stop_loss_price and current_price <= entry.stop_loss_price:
                # Execute stop loss
                trade = Trade(
                    session_id=session.id,
                    symbol=entry.symbol,
                    action=Action.SELL,
                    quantity=entry.holdings,
                    price=current_price,
                    order_type=OrderType.STOP,
                    status=OrderStatus.FILLED
                )
                db.add(trade)
                execute_trade(db, session, entry, trade)
            
            # Check take profit
            elif entry.take_profit_price and current_price >= entry.take_profit_price:

                # Execute take profit
                trade = Trade(
                    session_id=session.id,
                    symbol=entry.symbol,
                    action=Action.SELL,
                    quantity=entry.holdings,
                    price=current_price,
                    order_type=OrderType.LIMIT,
                    status=OrderStatus.FILLED
                )
                db.add(trade)
                execute_trade(db, session, entry, trade)

                db.commit()
        
    except Exception as e:
        print(f"Error checking exit conditions: {e}")
        db.rollback()


def end_session(db: Session, session: SimulationSession) -> None:
    """End a simulation session."""
    try:
        session.is_active = False
        # Note: end_time field doesn't exist in the model
        
        # Calculate final PnL from portfolio entries
        current_tick = get_current_tick(db, session)
        entries = db.exec(select(PortfolioEntry)
                         .where(PortfolioEntry.session_id == session.id)).all()
        
        total_pnl = 0.0
        for entry in entries:
            if entry.holdings > 0:
                current_price = tick_indexer.get_current_price(entry.symbol, current_tick)
                if current_price:
                    entry.last_price = current_price
                    entry.pnl = (current_price - entry.avg_price) * entry.holdings
                    total_pnl += entry.pnl
        
        session.pnl = total_pnl
        db.commit()
        
    except Exception as e:
        print(f"Error ending session: {e}")
        try:
            db.rollback()
        except:
            pass  # Ignore rollback errors


def get_df_len(db: Session) -> int:
    """Get total number of ticks available."""
    try:
        symbols = s3_adapter.get_available_symbols()
        if not symbols:
            return 0
        
        # Use the first available symbol to get total ticks
        return tick_indexer.get_total_ticks(symbols[0])
        
    except Exception as e:
        print(f"Error getting total ticks: {e}")
        return 0


def get_active_portfolio(db: Session, user_id: str, session_id: str) -> List[Dict]:
    # finding the user's active session
    session = db.exec(select(SimulationSession)
                     .where(SimulationSession.id == session_id)
                     .where(SimulationSession.user_id == user_id)).first()

    if not session:
        return []

    # sync the current tick
    sync_current_tick_for_session(db, session)

    # get all portfolio entries
    entries = db.exec(select(PortfolioEntry)
                     .where(PortfolioEntry.session_id == session_id)).all()

    portfolio = []
    for entry in entries:
        # Get current price from tick data using time-based calculation
        current_tick = get_current_tick(db, session)
        current_price = tick_indexer.get_current_price(entry.symbol, current_tick)
        
        if current_price is not None:
            entry.last_price = current_price
            if entry.holdings > 0 and entry.avg_price:
                entry.pnl = (current_price - entry.avg_price) * entry.holdings
            else:
                entry.pnl = 0.0

        # Calculate market value: holdings * current price
        market_value = entry.holdings * (current_price or 0)

        portfolio.append({
            "symbol": entry.symbol,
            "holdings": entry.holdings,
            "last_price": entry.last_price,
            "avg_price": entry.avg_price,
            "pnl": entry.pnl,
            "market_value": market_value,
            "stop_loss_price": entry.stop_loss_price,
            "take_profit_price": entry.take_profit_price
        })

    db.commit()
    return portfolio


def get_average_price_for_symbol(db: Session, session_id: str, symbol: str) -> Optional[float]:
    """Get average price for a symbol in a session."""
    try:
        entry = db.exec(select(PortfolioEntry)
                       .where(PortfolioEntry.session_id == session_id)
                       .where(PortfolioEntry.symbol == symbol)).first()
        
        if entry and entry.holdings > 0:
            return entry.avg_price
        return None

    except Exception as e:
        print(f"Error getting average price: {e}")
        return None


def get_quote_for_symbol(db: Session, session_id: str, symbol: str) -> Optional[Dict]:
    """Get current quote for a symbol in a session using Firebase."""
    try:
        # Use Firestore for session validation
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return None
        
        session_data = session_doc.to_dict()
        
        # Check if session is active
        if not session_data.get("is_active", False):
            return None
        
        # Calculate current tick based on elapsed time
        current_time = datetime.now(timezone.utc)
        start_time_str = session_data.get("start_time")
        
        if not start_time_str:
            return None
        
        # Parse start time
        if isinstance(start_time_str, str):
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        else:
            start_time = start_time_str
        
        # Ensure timezone awareness
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        
        # Calculate elapsed time and current tick
        elapsed_seconds = (current_time - start_time).total_seconds()
        duration_seconds = session_data.get("duration_seconds", 3600)
        
        # Calculate current tick based on elapsed time
        # 1 day = 780 ticks (6.5 hours * 2 trades/min)
        ticks_per_day = 780
        total_ticks = (duration_seconds / 86400) * ticks_per_day
        current_tick = min(int((elapsed_seconds / duration_seconds) * total_ticks), int(total_ticks) - 1)
        current_tick = max(0, current_tick)
        
        return tick_indexer.get_quote(symbol, current_tick)
        
    except Exception as e:
        print(f"Error getting quote: {e}")
        return None


def get_all_symbols(db: Session):
    """Get all available symbols."""
    return s3_adapter.get_available_symbols()


def get_ohlc_for_symbol(db: Session, session_id: str, symbol: str):
    """Get OHLC data for a symbol at the current tick using Firebase."""
    try:
        # Use Firestore for session validation
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return None
        
        session_data = session_doc.to_dict()
        
        # Check if session is active
        if not session_data.get("is_active", False):
            return None
        
        # Calculate current tick based on elapsed time
        current_time = datetime.now(timezone.utc)
        start_time_str = session_data.get("start_time")
        
        if not start_time_str:
            return None
        
        # Parse start time
        if isinstance(start_time_str, str):
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
        else:
            start_time = start_time_str
        
        # Ensure timezone awareness
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        
        # Calculate elapsed time and current tick
        elapsed_seconds = (current_time - start_time).total_seconds()
        duration_seconds = session_data.get("duration_seconds", 3600)
        
        # Calculate current tick based on elapsed time
        # 1 day = 780 ticks (6.5 hours * 2 trades/min)
        ticks_per_day = 780
        total_ticks = (duration_seconds / 86400) * ticks_per_day
        current_tick = min(int((elapsed_seconds / duration_seconds) * total_ticks), int(total_ticks) - 1)
        current_tick = max(0, current_tick)

        return tick_indexer.get_ohlc_for_tick(symbol, current_tick)
    
    except Exception as e:
        print(f"Error getting OHLC: {e}")
        return None