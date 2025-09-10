from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session
from db import get_session
from typing import List, Dict, Optional
from sim_services.s3_data_adapter import s3_adapter
from sim_services.tick_indexer import tick_indexer

router = APIRouter(prefix="/chart_data", tags=["Chart Data"])

@router.get("/{symbol}")
async def get_chart_data(
    symbol: str,
    interval: str = Query('30s', description="Time interval (30s, 1min, 5min, 30min)"),
    days: int = Query(7, description="Number of days of data to retrieve"),
    session_id: str = Query(None, description="Simulation session ID to get data up to current tick"),
    db: Session = Depends(get_session)
):
    """
    Get OHLCV chart data for a symbol with specified interval and time range.
    If session_id is provided, returns data up to the current simulation tick.
    
    Example: GET /chart_data/AAPL?interval=5min&days=7&session_id=abc123
    """
    try:
        # Validate interval
        available_intervals = s3_adapter.get_available_intervals()
        if interval not in available_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid interval. Available intervals: {available_intervals}"
            )
        
        # If session_id is provided, get data up to current tick
        if session_id:
            from sim_services.simulation_engine import get_quote_for_symbol
            from models.trading_sim import SimulationSession
            from sqlmodel import select
            
            # Get session and calculate current tick
            session = db.exec(select(SimulationSession).where(SimulationSession.id == session_id)).first()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Calculate current tick based on elapsed time using centralized function
            from sim_services.simulation_engine import get_current_tick
            current_tick = get_current_tick(db, session)
            
            # Get data up to current tick
            data = tick_indexer.get_tick_range(symbol, 0, current_tick, interval)
        else:
            # Get data by days (original behavior)
            data = s3_adapter.get_ohlc_by_days(symbol, days, interval)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol} with interval {interval}"
            )
        
        return {
            "symbol": symbol,
            "interval": interval,
            "days": days if not session_id else None,
            "session_id": session_id,
            "current_tick": current_tick if session_id else None,
            "data": data,
            "count": len(data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chart data: {str(e)}")

@router.get("/{symbol}/range")
async def get_chart_data_range(
    symbol: str,
    start_tick: int = Query(..., description="Starting tick index"),
    end_tick: int = Query(..., description="Ending tick index"),
    interval: str = Query('30s', description="Time interval"),
    db: Session = Depends(get_session)
):
    """
    Get OHLCV chart data for a symbol within a specific tick range.
    
    Example: GET /chart_data/AAPL/range?start_tick=1000&end_tick=2000&interval=30s
    """
    try:
        # Validate interval
        available_intervals = s3_adapter.get_available_intervals()
        if interval not in available_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid interval. Available intervals: {available_intervals}"
            )
        
        # Get data by tick range
        data = tick_indexer.get_tick_range(symbol, start_tick, end_tick, interval)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol} in tick range {start_tick}-{end_tick}"
            )
        
        return {
            "symbol": symbol,
            "interval": interval,
            "start_tick": start_tick,
            "end_tick": end_tick,
            "data": data,
            "count": len(data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chart data: {str(e)}")

@router.get("/{symbol}/tick/{tick}")
async def get_tick_data(
    symbol: str,
    tick: int,
    interval: str = Query('30s', description="Time interval"),
    db: Session = Depends(get_session)
):
    """
    Get OHLCV data for a specific tick.
    
    Example: GET /chart_data/AAPL/tick/1000?interval=30s
    """
    try:
        # Validate interval
        available_intervals = s3_adapter.get_available_intervals()
        if interval not in available_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid interval. Available intervals: {available_intervals}"
            )
        
        # Get specific tick data
        data = tick_indexer.get_tick_data(symbol, tick, interval)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol} at tick {tick}"
            )
        
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving tick data: {str(e)}")

@router.get("/intervals")
async def get_available_intervals(db: Session = Depends(get_session)):
    """Get list of available time intervals."""
    try:
        intervals = s3_adapter.get_available_intervals()
        return {
            "intervals": intervals,
            "default": "30s"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving intervals: {str(e)}")

@router.get("/symbols/{interval}")
async def get_symbols_for_interval(
    interval: str,
    db: Session = Depends(get_session)
):
    """Get list of available symbols for a specific interval."""
    try:
        # Validate interval
        available_intervals = s3_adapter.get_available_intervals()
        if interval not in available_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid interval. Available intervals: {available_intervals}"
            )
        
        symbols = s3_adapter.get_available_symbols(interval)
        return {
            "interval": interval,
            "symbols": symbols,
            "count": len(symbols)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving symbols: {str(e)}")

@router.get("/metadata/{symbol}")
async def get_symbol_metadata(
    symbol: str,
    interval: str = Query('30s', description="Time interval"),
    db: Session = Depends(get_session)
):
    """Get metadata for a symbol including total ticks and date range."""
    try:
        # Validate interval
        available_intervals = s3_adapter.get_available_intervals()
        if interval not in available_intervals:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid interval. Available intervals: {available_intervals}"
            )
        
        # Get DataFrame to extract metadata
        df = s3_adapter.get_dataframe(symbol, interval)
        
        if df is None or len(df) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for {symbol} with interval {interval}"
            )
        
        return {
            "symbol": symbol,
            "interval": interval,
            "total_ticks": len(df),
            "start_date": df['timestamp'].min().isoformat(),
            "end_date": df['timestamp'].max().isoformat(),
            "columns": list(df.columns)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving metadata: {str(e)}") 