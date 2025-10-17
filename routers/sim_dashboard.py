from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from db import get_session
from sim_services import simulation_engine as session_service

# carrying over the simulation session duration
from models.trading_sim import DURATION_SECONDS

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/user-sessions")
def get_user_sessions(user_id: str, db: Session = Depends(get_session)):
    """
    getting all trading the simulations for user {used_id} to render dashboard
    """
    return session_service.get_user_sessions(db, user_id)

@router.post("/start-session")
def create_new_session(user_id: str, label: str, duration_seconds: int = DURATION_SECONDS,
                       db: Session = Depends(get_session)):
    """
    starts a new simulation from the dashboard, session started from sim dashboard ONLY
    """
    return session_service.start_session(db, user_id, label, duration_seconds)