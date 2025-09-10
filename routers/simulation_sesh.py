from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query, Path
from sqlmodel import Session, select
from db import get_session
from models.trading_sim import Action, Trade, OrderType, OrderStatus, SimulationSession, PortfolioEntry
from sim_services.simulation_engine import (start_session, process_trade, get_current_tick,
                                          sync_current_tick_for_session, get_active_portfolio,
                                          get_quote_for_symbol, get_all_symbols, get_ohlc_for_symbol,
                                          get_df_len, end_session, update_prices, set_exit_conditions,
                                          sim_engine)
from sim_services.s3_data_adapter import s3_adapter
from sim_services.tick_indexer import tick_indexer
from typing import Optional, List, Dict
from pydantic import BaseModel
from google.cloud.firestore import FieldFilter

# has the TICKER_LIST guvnor
from sim_services import simulation_engine as session_service
import asyncio
import json
from datetime import datetime, timezone
import pandas as pd
import pandas_ta as ta

""" ABSOLUTELY CRUCIAL ALL DATASETS ARE EQUALLY LONG 〜(￣▽￣〜) """

router = APIRouter(prefix="/sim", tags=["Simulation"])

class TradeRequest(BaseModel):
    symbol: str
    action: Action
    quantity: int
    price: float
    order_type: OrderType = OrderType.MARKET
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class SessionActivationRequest(BaseModel):
    session_id: str

@router.post("/activate-session")
async def activate_simulation_session(request: SessionActivationRequest):
    """
    Activate a dormant Firestore simulation session and start it rolling.
    This endpoint handles the complete activation process.
    """
    try:
        success = sim_engine.activate_firestore_session(request.session_id)
        
        if success:
            return {
                "success": True,
                "message": f"Session {request.session_id} activated successfully",
                "session_id": request.session_id
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to activate session {request.session_id}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error activating session: {str(e)}")

@router.post("/deactivate-session")
async def deactivate_simulation_session(request: SessionActivationRequest):
    """
    Deactivate an active Firestore simulation session.
    This stops the session and calculates final P&L.
    """
    try:
        success = sim_engine.deactivate_firestore_session(request.session_id)
        
        if success:
            return {
                "success": True,
                "message": f"Session {request.session_id} deactivated successfully",
                "session_id": request.session_id
            }
        else:
            raise HTTPException(status_code=400, detail=f"Failed to deactivate session {request.session_id}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deactivating session: {str(e)}")

@router.get("/session-status/{session_id}")
async def get_session_status(session_id: str):
    """
    Get the status of a Firestore simulation session.
    """
    try:
        status = sim_engine.get_firestore_session_status(session_id)
        
        if status:
            return {
                "success": True,
                "session": status
            }
        else:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session status: {str(e)}")

@router.get("/user-sessions/{user_id}")
async def get_user_firestore_sessions(user_id: str):
    """
    Get all simulation sessions for a user from Firestore.
    """
    try:
        from unified_app.firebase_setup.firebaseSet import db
        
        # Query Firestore for user's sessions
        sessions_ref = db.collection("simulation_sessions")
        sessions_query = sessions_ref.where("user_id", "==", user_id)
        sessions_docs = sessions_query.stream()
        
        sessions = []
        for doc in sessions_docs:
            session_data = doc.to_dict()
            session_data["id"] = doc.id
            sessions.append(session_data)
        
        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting user sessions: {str(e)}")

@router.websocket("/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    print(f"🔍 WebSocket: Attempting to connect for session {session_id}")
    
    try:
        await websocket.accept()
        print(f"✅ WebSocket: Successfully connected for session {session_id}")
        
        while True:
            try:
                # Use Firestore for session and portfolio data
                from unified_app.firebase_setup.firebaseSet import db as firestore_db
                
                print(f"🔍 WebSocket: Fetching session data for {session_id}")
                
                # Get session from Firestore
                session_ref = firestore_db.collection("simulation_sessions").document(session_id)
                session_doc = session_ref.get()
                
                if not session_doc.exists:
                    print(f"❌ WebSocket: Session {session_id} not found in Firestore")
                    await websocket.send_text(json.dumps({"error": "Session not found"}))
                    break
                
                session_data = session_doc.to_dict()
                print(f"🔍 WebSocket: Session data retrieved: {session_data}")
                
                # Check if session is active
                is_active = session_data.get("is_active", False)
                print(f"🔍 WebSocket: Session is_active = {is_active}")
                
                if not is_active:
                    print(f"❌ WebSocket: Session {session_id} is not active")
                    await websocket.send_text(json.dumps({"status": "session_ended"}))
                    break
                
                # Calculate current tick based on elapsed time
                current_time = datetime.now(timezone.utc)
                start_time_str = session_data.get("start_time")
                
                print(f"🔍 WebSocket: start_time_str = {start_time_str}")
                
                if not start_time_str:
                    print(f"❌ WebSocket: No start_time found for session {session_id}")
                    await websocket.send_text(json.dumps({"error": "Session start time not found"}))
                    break
                
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
                
                print(f"🔍 WebSocket: elapsed_seconds = {elapsed_seconds}, duration_seconds = {duration_seconds}")
                
                # Calculate current tick based on elapsed time
                # 1 day = 780 ticks (6.5 hours * 2 trades/min)
                ticks_per_day = 780
                total_ticks = (duration_seconds / 86400) * ticks_per_day
                
                # Ensure we have a minimum number of ticks
                if total_ticks < 1:
                    total_ticks = 780  # Default to 1 day worth of ticks
                
                # Calculate current tick based on elapsed time
                if elapsed_seconds <= 0:
                    current_tick = 0
                elif elapsed_seconds >= duration_seconds:
                    current_tick = int(total_ticks) - 1
                else:
                    current_tick = int((elapsed_seconds / duration_seconds) * total_ticks)
                
                # Ensure current_tick is within bounds
                current_tick = max(0, min(current_tick, int(total_ticks) - 1))
                
                print(f"🔍 WebSocket: calculated current_tick = {current_tick}, total_ticks = {total_ticks}")
                print(f"🔍 WebSocket: elapsed_seconds = {elapsed_seconds}, duration_seconds = {duration_seconds}")
                print(f"🔍 WebSocket: progress = {(elapsed_seconds / duration_seconds) * 100:.2f}%")
                
                # Update current_tick in Firestore session
                try:
                    session_ref.update({
                        "current_tick": current_tick,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    })
                    print(f"✅ Updated current_tick in Firestore: {current_tick}")

                except Exception as e:
                    print(f"⚠️ Warning: Could not update current_tick in Firestore: {e}")
                
                # Get portfolio data from Firestore
                portfolio_ref = firestore_db.collection("portfolio_entries")
                portfolio_entries = list(portfolio_ref.where("session_id", "==", session_id).stream())
                
                print(f"🔍 WebSocket: Found {len(portfolio_entries)} portfolio entries")
                
                portfolio_data = []
                for entry_doc in portfolio_entries:
                    entry = entry_doc.to_dict()
                    # Get current price for this symbol
                    symbol = entry.get("symbol")
                    current_price = 0.0
                    
                    if symbol:
                        try:
                            # Get current price from tick data
                            current_price = tick_indexer.get_current_price(symbol, current_tick)
                            if current_price is not None:
                                # Update the portfolio entry in Firestore with current price
                                portfolio_ref = firestore_db.collection("portfolio_entries")
                                portfolio_query = portfolio_ref.where("session_id", "==", session_id).where("symbol", "==", symbol)
                                portfolio_docs = list(portfolio_query.stream())
                                
                                if portfolio_docs:
                                    doc_ref = portfolio_docs[0].reference
                                    holdings = entry.get("holdings", 0)
                                    avg_price = entry.get("avg_price", 0.0)
                                    
                                    # Calculate PnL
                                    if holdings > 0 and avg_price > 0:
                                        pnl = (current_price - avg_price) * holdings
                                    else:
                                        pnl = 0.0
                                    
                                    doc_ref.update({
                                        "last_price": current_price,
                                        "pnl": pnl,
                                        "updated_at": datetime.now(timezone.utc).isoformat()
                                    })
                                    
                                    # Update entry data for response
                                    entry["last_price"] = current_price
                                    entry["pnl"] = pnl
                                else:
                                    current_price = entry.get("last_price", 0.0)
                            else:
                                current_price = entry.get("last_price", 0.0)
                        except Exception as e:
                            print(f"⚠️ Warning: Could not get current price for {symbol}: {e}")
                            current_price = entry.get("last_price", 0.0)
                    else:
                        current_price = entry.get("last_price", 0.0)
                    
                    portfolio_data.append({
                        "symbol": entry.get("symbol"),
                        "holdings": entry.get("holdings", 0),
                        "last_price": current_price,
                        "avg_price": entry.get("avg_price", 0),
                        "pnl": entry.get("pnl", 0),
                        "market_value": entry.get("holdings", 0) * current_price,
                        "stop_loss_price": entry.get("stop_loss_price"),
                        "take_profit_price": entry.get("take_profit_price")
                    })
                
                # Prepare response
                response = {
                    "session_id": session_id,
                    "current_tick": current_tick,
                    "cash": session_data.get("cash", 100000),
                    "is_active": session_data.get("is_active", False),
                    "pnl": session_data.get("pnl", 0),
                    "portfolio": portfolio_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                print(f"🔍 WebSocket: Sending response: {response}")
                await websocket.send_text(json.dumps(response))
            
                # Wait before next update
                await asyncio.sleep(30)
            
            except Exception as e:
                print(f"❌ WebSocket: Error in main loop for session {session_id}: {e}")
                await websocket.send_text(json.dumps({"error": str(e)}))
                break
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket: Disconnected for session {session_id}")
    except Exception as e:
        print(f"❌ WebSocket: Connection error for session {session_id}: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except:
            pass

"""
The WebSocket and the POST /trade endpoint are completely separate communication channels.
"""
@router.post("/trade")
def place_trade(
    session_id: str = Query(..., description="The ID of the simulation session"),
    user_id: str = Query(..., description="The user ID"),
    symbol: str = Query(..., description="The symbol to trade"),
    action: Action = Query(..., description="Buy or sell action"),
    quantity: int = Query(..., description="Number of shares"),
    price: float = Query(..., description="Price per share"),
    order_type: OrderType = Query(OrderType.MARKET, description="Order type"),
    stop_loss: Optional[float] = Query(None, description="Stop loss price"),
    take_profit: Optional[float] = Query(None, description="Take profit price"),
    db: Session = Depends(get_session)
):
    """Place a trade in a simulation session using Firebase only"""
    try:
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        print(f"[TRADE] Processing trade: {symbol} {action} {quantity} @ ${price}")
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
    
        session_data = session_doc.to_dict()
        
        # Validate user owns the session
        if session_data.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied - you can only trade on your own sessions")
        
        if not session_data.get("is_active", False):
            raise HTTPException(status_code=400, detail="Session is not active")
        
        # Get current cash and validate buy orders
        current_cash = session_data.get("cash", 100000.0)
        trade_value = quantity * price
        
        if action == Action.BUY:
            if current_cash < trade_value:
                raise HTTPException(status_code=400, detail=f"Insufficient funds. Need ${trade_value:.2f}, have ${current_cash:.2f}")
        
        # Get or create portfolio entry for this symbol
        portfolio_ref = firestore_db.collection("portfolio_entries")
        portfolio_entries = list(portfolio_ref.where("session_id", "==", session_id).where("symbol", "==", symbol).stream())
        
        if portfolio_entries:
            portfolio_entry = portfolio_entries[0]
            entry_data = portfolio_entry.to_dict()
            current_holdings = entry_data.get("holdings", 0)
            current_avg_price = entry_data.get("avg_price", 0.0)
        else:
            # Create new portfolio entry
            entry_data = {
                "session_id": session_id,
                "symbol": symbol,
                "holdings": 0,
                "avg_price": 0.0,
                "last_price": price,
                "pnl": 0.0,
                "stop_loss_price": None,
                "take_profit_price": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            portfolio_entry = portfolio_ref.add(entry_data)[1]  # Get the document reference
            current_holdings = 0
            current_avg_price = 0.0
        
        # Validate sell orders
        if action == Action.SELL:
            if current_holdings < quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient shares. Need {quantity}, have {current_holdings}")
        
        # Execute the trade
        new_holdings = current_holdings
        new_avg_price = current_avg_price
        new_cash = current_cash
        
        if action == Action.BUY:
            # Buy logic
            new_holdings += quantity
            new_cash -= trade_value
            
            # Update average price
            if new_holdings > 0:
                total_cost = (current_avg_price * current_holdings) + trade_value
                new_avg_price = total_cost / new_holdings
            
        elif action == Action.SELL:
            # Sell logic
            new_holdings -= quantity
            new_cash += trade_value
            
            # Reset average price if no holdings left
            if new_holdings <= 0:
                new_avg_price = 0.0
        
        # Calculate new PnL
        new_pnl = (price - new_avg_price) * new_holdings if new_holdings > 0 else 0.0
        
        # Update portfolio entry
        if portfolio_entries:
            # Update existing entry
            portfolio_entries[0].reference.update({
                "holdings": new_holdings,
                "avg_price": new_avg_price,
                "last_price": price,
                "pnl": new_pnl,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            # Update the newly created entry
            portfolio_entry.update({
                "holdings": new_holdings,
                "avg_price": new_avg_price,
                "last_price": price,
                "pnl": new_pnl,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Update session cash
        session_ref.update({
            "cash": new_cash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Log trade to Firebase
        trades_ref = firestore_db.collection("trades")
        trade_data = {
            "session_id": session_id,
            "user_id": user_id,
            "symbol": symbol,
            "action": action.value if hasattr(action, 'value') else str(action),
            "quantity": quantity,
            "price": price,
            "order_type": order_type.value if hasattr(order_type, 'value') else str(order_type),
            "status": "filled",
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        trade_doc = trades_ref.add(trade_data)[1]
        
        print(f"✅ Trade executed: {symbol} {action} {quantity} @ ${price}")
        print(f"   New holdings: {new_holdings}, New cash: ${new_cash:.2f}")
        
        return {
            "success": True,
            "trade_id": trade_doc.id,
            "symbol": symbol,
            "action": action.value if hasattr(action, 'value') else str(action),
            "quantity": quantity,
            "price": price,
            "status": "filled",
            "new_holdings": new_holdings,
            "new_cash": new_cash
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Trade processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Trade processing failed: {str(e)}")

@router.get("/orders")
def get_orders(
    session_id: str = Query(..., description="The ID of the simulation session"),
    user_id: str = Query(..., description="The user ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    db: Session = Depends(get_session)
):
    """Get all trades/orders for a session and user from Firestore."""
    try:
        print(f"[ORDERS] user_id={user_id}, session_id={session_id}, status={status}")
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get trades from Firestore
        trades_ref = firestore_db.collection("trades")
        query = trades_ref.where("session_id", "==", session_id).where("user_id", "==", user_id)
        
        if status:
            query = query.where("status", "==", status)
            
        print(f"[ORDERS] Executing Firestore query...")
        trades = [doc.to_dict() for doc in query.stream()]
        print(f"[ORDERS] Found {len(trades)} trades")
        
        return trades
        
    except Exception as e:
        print(f"[ORDERS] Error fetching orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {str(e)}")

@router.post("/orders/{order_id}/cancel")
def cancel_order(
    session_id: str = Query(..., description="The ID of the simulation session"),
    user_id: str = Query(..., description="The user ID"),
    order_id: int = Path(..., description="The ID of the order to cancel"),
    db: Session = Depends(get_session)
):
    """Cancel an order in a simulation session"""
    session = session_service.get_simulation_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Validate user owns the session
    if session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied - you can only cancel orders for your own sessions")

    try:
        result = session_service.cancel_order(db, session_id, order_id)
        return {"success": True, "message": f"Order {order_id} cancelled"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")

@router.get("/portfolio")
def get_portfolio(
    user_id: str = Query(..., description="The user ID"),
    session_id: str = Query(..., description="The simulation session ID"),
    db: Session = Depends(get_session)
):
    """Get portfolio for a user in a specific session using Firebase"""
    try:
        print(f"[PORTFOLIO] user_id={user_id}, session_id={session_id}")
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        from google.cloud.firestore import FieldFilter
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        print(f"[PORTFOLIO] session_doc.exists={session_doc.exists}")
        if not session_doc.exists:
            print(f"[PORTFOLIO] Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        session_data = session_doc.to_dict()
        print(f"[PORTFOLIO] session_data: {session_data}")
        if not session_data.get("is_active", False):
            print(f"[PORTFOLIO] Session is not active")
            raise HTTPException(status_code=400, detail="Session is not active")
        if session_data.get("user_id") != user_id:
            print(f"[PORTFOLIO] Access denied: session user_id={session_data.get('user_id')} != {user_id}")
            raise HTTPException(status_code=403, detail="Access denied")
        # Get portfolio entries from Firebase
        try:
            portfolio_ref = firestore_db.collection("portfolio_entries")
            portfolio_entries = list(portfolio_ref.where("session_id", "==", session_id).stream())
            print(f"[PORTFOLIO] Found {len(portfolio_entries)} portfolio entries")
        except Exception as e:
            print(f"[PORTFOLIO] Error fetching portfolio entries: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio entries: {e}")
        portfolio = []
        for entry_doc in portfolio_entries:
            try:
                entry_data = entry_doc.to_dict()
                print(f"[PORTFOLIO] Processing entry: {entry_data}")
                symbol = entry_data.get("symbol")
                if not symbol:
                    print(f"[PORTFOLIO] Skipping entry with no symbol: {entry_data}")
                    continue
                start_time_str = session_data.get("start_time")
                if not start_time_str:
                    print(f"[PORTFOLIO] No start_time for session, using last_price")
                    current_price = entry_data.get("last_price", 0.0)
                else:
                    try:
                        start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                        if start_time.tzinfo is None:
                            start_time = start_time.replace(tzinfo=timezone.utc)
                        elapsed_seconds = (datetime.now(timezone.utc) - start_time).total_seconds()
                        duration_seconds = session_data.get("duration_seconds", 3600)
                        ticks_per_day = 780
                        total_ticks = (duration_seconds / 86400) * ticks_per_day
                        current_tick = min(int((elapsed_seconds / duration_seconds) * total_ticks), int(total_ticks) - 1)
                        current_tick = max(0, current_tick)
                        print(f"[PORTFOLIO] Calculated current_tick={current_tick} for symbol={symbol}")
                        try:
                            current_price = tick_indexer.get_current_price(symbol, current_tick)
                            print(f"[PORTFOLIO] Current price for {symbol} at tick {current_tick}: {current_price}")
                            if current_price is None:
                                current_price = entry_data.get("last_price", 0.0)
                        except Exception as e:
                            print(f"[PORTFOLIO] Error getting current price for {symbol}: {e}")
                            current_price = entry_data.get("last_price", 0.0)
                    except Exception as e:
                        print(f"[PORTFOLIO] Error parsing start_time or calculating tick: {e}")
                        current_price = entry_data.get("last_price", 0.0)
                holdings = entry_data.get("holdings", 0)
                avg_price = entry_data.get("avg_price", 0.0)
                if holdings > 0 and avg_price > 0:
                    pnl = (current_price - avg_price) * holdings
                else:
                    pnl = 0.0
                market_value = holdings * current_price
                portfolio.append({
                    "symbol": symbol,
                    "holdings": holdings,
                    "last_price": current_price,
                    "avg_price": avg_price,
                    "pnl": pnl,
                    "market_value": market_value,
                    "stop_loss_price": entry_data.get("stop_loss_price"),
                    "take_profit_price": entry_data.get("take_profit_price")
                })
            except Exception as e:
                print(f"[PORTFOLIO] Error processing entry: {e}")
        print(f"[PORTFOLIO] Final portfolio: {portfolio}")
        return {
            "session_id": session_id,
            "user_id": user_id,
        "session": {
                "cash": session_data.get("cash", 100000.0)
            },
            "portfolio": portfolio
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[PORTFOLIO] Unhandled error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get portfolio: {str(e)}")

@router.get("/quote/{session_id}/{symbol}")
def get_quote(session_id: str, symbol: str, db: Session = Depends(get_session)):
    """
    Returns the current quote for a symbol in a session (last price, prev close, abs and pct change)
    """
    return get_quote_for_symbol(db, session_id, symbol)

@router.get("/symbols")
def list_symbols(db: Session = Depends(get_session)):
    """Returns all available symbols for the watchlist"""
    return get_all_symbols(db)

@router.get("/ohlc/{session_id}/{symbol}")
def get_ohlc(session_id: str, symbol: str, db: Session = Depends(get_session)):
    """
    Returns the current tick's OHLC and volume for a symbol in a session
    """
    return get_ohlc_for_symbol(db, session_id, symbol)

@router.get("/current-tick/{session_id}/{symbol}")
def get_current_tick_for_symbol(session_id: str, symbol: str, db: Session = Depends(get_session)):
    """
    Get the current tick for a specific symbol in a session.
    This endpoint is used to get the current simulation tick position.
    """
    try:
        session = db.exec(select(SimulationSession).where(SimulationSession.id == session_id)).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Calculate current tick based on elapsed time using centralized function
        current_tick = get_current_tick(db, session)
        
        # Get total ticks for response
        symbols = s3_adapter.get_available_symbols()
        total_ticks = tick_indexer.get_total_ticks(symbols[0]) if symbols else 0
        
        # Calculate elapsed time for response
        current_time = datetime.now(timezone.utc)
        session_start = session.start_time.replace(tzinfo=timezone.utc) if session.start_time.tzinfo is None else session.start_time
        elapsed = (current_time - session_start).total_seconds()
        
        return {
            "session_id": session_id,
            "symbol": symbol,
            "current_tick": current_tick,
            "total_ticks": total_ticks,
            "elapsed_seconds": elapsed,
            "session_duration_seconds": session.duration_seconds
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting current tick for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting current tick: {str(e)}")

class ExitConditionsRequest(BaseModel):
    session_id: str
    symbol: str
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@router.post("/set_exit_conditions")
def set_exit_conditions_endpoint(
    request: ExitConditionsRequest,
    user_id: str = Query(..., description="The user ID"),
    db: Session = Depends(get_session)
):
    """
    Set stop-loss and take-profit levels for an existing position
    """
    try:
        # Use Firestore for session validation
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(request.session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = session_doc.to_dict()
        
        # Validate user owns the session
        if session_data.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied - you can only set exit conditions for your own sessions")
        
        # Get SQLite session for trading engine (still needed for get_current_tick)
        sqlite_session = db.exec(select(SimulationSession).where(SimulationSession.id == request.session_id)).first()
        if not sqlite_session:
            # Create SQLite session if it doesn't exist
            sqlite_session = SimulationSession(
                id=request.session_id,
                user_id=session_data.get("user_id"),
                current_tick=session_data.get("current_tick", 0),
                cash=session_data.get("cash", 100000.0),
                is_active=session_data.get("is_active", False),
                label=session_data.get("label", "Trading Session"),
                start_time=datetime.fromisoformat(session_data.get("start_time").replace('Z', '+00:00')) if session_data.get("start_time") else datetime.now(timezone.utc),
                duration_seconds=session_data.get("duration_seconds", 3600),
                pnl=session_data.get("pnl", 0.0)
            )
            db.add(sqlite_session)
            db.commit()
        
        # Validate position exists in SQLite (still needed for portfolio management)
        position = db.exec(select(PortfolioEntry)
                          .where(PortfolioEntry.session_id == request.session_id)
                          .where(PortfolioEntry.symbol == request.symbol)).first()
        
        if not position or position.holdings <= 0:
            raise HTTPException(status_code=404, detail="Position not found")
        
        # Get current price for validation
        current_tick = get_current_tick(db, sqlite_session)
        current_price = tick_indexer.get_current_price(request.symbol, current_tick)
        
        if current_price is None:
            raise HTTPException(status_code=400, detail="Unable to get current price for validation")
        
        # Validate stop-loss and take-profit levels
        if request.stop_loss is not None:
            if request.stop_loss >= current_price:
                raise HTTPException(status_code=400, detail="Stop loss must be below current price")
        
        if request.take_profit is not None:
            if request.take_profit <= current_price:
                raise HTTPException(status_code=400, detail="Take profit must be above current price")
        
        # Set exit conditions
        set_exit_conditions(
            db=db,
            session_id=request.session_id,
            symbol=request.symbol,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit
        )
        
        # Return updated position
        updated_position = db.exec(select(PortfolioEntry)
                                 .where(PortfolioEntry.session_id == request.session_id)
                                 .where(PortfolioEntry.symbol == request.symbol)).first()
        
        return {
            "status": "success",
            "message": "Exit conditions updated successfully",
            "position": {
                "symbol": updated_position.symbol,
                "stop_loss_price": updated_position.stop_loss_price,
                "take_profit_price": updated_position.take_profit_price
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error setting exit conditions: {e}")
        raise HTTPException(status_code=500, detail=f"Error setting exit conditions: {str(e)}")

@router.get("/fundamentals/{session_id}/{symbol}")
def get_fundamental_data_endpoint(
    session_id: str,
    symbol: str,
    db: Session = Depends(get_session)
):
    """
    Get fundamental and technical indicators for a symbol at its current tick date.
    """
    try:
        print(f"API: Received request for fundamental data for {symbol} in session {session_id}")
        
        # Use Firestore to validate session instead of SQLite
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = session_doc.to_dict()
        
        # Check if session is active
        if not session_data.get("is_active", False):
            raise HTTPException(status_code=400, detail="Session is not active")
        
        print(f"API: Session validated in Firestore - {session_id} is active")

        # Get the current tick for the session
        # Calculate current tick based on elapsed time
        current_time = datetime.now(timezone.utc)
        start_time_str = session_data.get("start_time")
        
        if not start_time_str:
            raise HTTPException(status_code=400, detail="Session start time not found")
        
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

        # 1. Get fundamental data (pre-calculated daily)
        date_str = tick_indexer.get_date_from_tick(symbol, current_tick)
        if not date_str:
            # Use an empty dict if no fundamental data is found for the date
            indicators = {}
        else:
            indicators = s3_adapter.get_fundamental_indicators(symbol, date_str)
            if not indicators:
                indicators = {}

        # 2. Calculate technical indicators from recent tick data
        # Fetch last 100 ticks for indicator calculation (e.g., for SMA, RSI)
        history_ticks = 100
        start_tick = max(0, current_tick - history_ticks)
        
        # Get historical data as a list of dicts
        tick_data_list = tick_indexer.get_tick_range(symbol, start_tick, current_tick)
        
        if not tick_data_list:
            # If no tick data, return whatever fundamental data we have
            return indicators if indicators else {"message": "No data available"}
        
        # Convert to DataFrame for TA calculations
        df = pd.DataFrame(tick_data_list)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)

        # Standardize column names for pandas_ta
        df.rename(columns={
            "open": "Open", "high": "High", "low": "Low", 
            "close": "Close", "volume": "Volume"
        }, inplace=True)
        
        # Calculate indicators
        df.ta.sma(length=20, append=True)
        df.ta.rsi(length=14, append=True)
        df.ta.atr(length=14, append=True)
        df.ta.macd(append=True)
        df.ta.vwap(append=True)
        
        # Calculate 5-day change % (approximate with ticks)
        # 1 day = 780 ticks (6.5 hours * 2 trades/min)
        five_day_ticks = 780 * 5 
        if current_tick >= five_day_ticks:
            price_5_days_ago = tick_indexer.get_current_price(symbol, current_tick - five_day_ticks)
            if price_5_days_ago and price_5_days_ago > 0:
                current_price = df['Close'].iloc[-1]
                indicators['5D_Change%'] = ((current_price - price_5_days_ago) / price_5_days_ago) * 100
            else:
                indicators['5D_Change%'] = 0
        else:
            indicators['5D_Change%'] = 0

        # Extract the latest values of the calculated indicators
        latest_indicators = df.iloc[-1]
        indicators['SMA_20'] = latest_indicators.get('SMA_20')
        indicators['RSI_14'] = latest_indicators.get('RSI_14')
        indicators['ATR_14'] = latest_indicators.get('ATRr_14') # pandas-ta names it ATRr_14
        indicators['MACD'] = latest_indicators.get('MACD_12_26_9')
        indicators['VWAP'] = latest_indicators.get('VWAP_D')

        print(f"API: Successfully retrieved and calculated indicators for {symbol}. Returning data.")
        return indicators

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting fundamental data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting fundamental data: {str(e)}")

@router.post("/validate-trade")
def validate_trade(
    session_id: str = Query(..., description="The ID of the simulation session"),
    user_id: str = Query(..., description="The user ID"),
    symbol: str = Query(..., description="The symbol to trade"),
    action: Action = Query(..., description="Buy or sell action"),
    quantity: int = Query(..., description="Number of shares"),
    price: float = Query(..., description="Price per share"),
    db: Session = Depends(get_session)
):
    """Validate if a trade can be executed (for frontend validation)"""
    try:
        from unified_app.firebase_setup.firebaseSet import db as firestore_db
        
        # Get session from Firestore
        session_ref = firestore_db.collection("simulation_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            return {"valid": False, "error": "Session not found"}
        
        session_data = session_doc.to_dict()
        
        # Validate user owns the session
        if session_data.get("user_id") != user_id:
            return {"valid": False, "error": "Access denied"}
        
        if not session_data.get("is_active", False):
            return {"valid": False, "error": "Session is not active"}
        
        # Get current cash
        current_cash = session_data.get("cash", 100000.0)
        trade_value = quantity * price
        
        # Validate buy orders
        if action == Action.BUY:
            if current_cash < trade_value:
                return {
                    "valid": False, 
                    "error": f"Insufficient funds. Need ${trade_value:.2f}, have ${current_cash:.2f}",
                    "can_buy": False,
                    "max_affordable_quantity": int(current_cash / price) if price > 0 else 0
                }
        
        # Get portfolio entry for this symbol
        portfolio_ref = firestore_db.collection("portfolio_entries")
        portfolio_entries = list(portfolio_ref.where("session_id", "==", session_id).where("symbol", "==", symbol).stream())
        
        current_holdings = 0
        if portfolio_entries:
            entry_data = portfolio_entries[0].to_dict()
            current_holdings = entry_data.get("holdings", 0)
        
        # Validate sell orders
        if action == Action.SELL:
            if current_holdings < quantity:
                return {
                    "valid": False, 
                    "error": f"Insufficient shares. Need {quantity}, have {current_holdings}",
                    "can_sell": False,
                    "max_sellable_quantity": current_holdings
                }
        
        return {
            "valid": True,
            "current_cash": current_cash,
            "current_holdings": current_holdings,
            "trade_value": trade_value,
            "can_buy": action == Action.SELL or current_cash >= trade_value,
            "can_sell": action == Action.BUY or current_holdings >= quantity,
            "max_affordable_quantity": int(current_cash / price) if price > 0 else 0,
            "max_sellable_quantity": current_holdings
        }
        
    except Exception as e:
        return {"valid": False, "error": f"Validation failed: {str(e)}"}
