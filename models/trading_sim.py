# all the models I need to boot simulation

"""when the user clicks 'Start Rolling', the app begins streaming historical market data
at a set pace. During this period, the user can buy, sell, or set stop-losses. Once the
data ends, trading is disabled and their performance stats are calculated and stored."""

START_BALANCE = 10000 # defined for this + sim_services/simulation_engine
DURATION_SECONDS = 300000 # defined for a day, for this + simulation_router

from pydantic import BaseModel
from sqlmodel import Field, Relationship, SQLModel
from typing import Optional, Dict, List
from enum import Enum
from datetime import datetime
from uuid import uuid4
import json
from datetime import datetime, timezone

# limiting functionality to this for the MVP?
class Action(str, Enum):
    BUY = "buy"
    SELL = "sell"
    # not adding more
    # this represents the 'side' of the trade

class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELED = "canceled"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"

# portfolio is abstracted into another class
""" this represents one of those cubes on /trading-dashboard """
class SimulationSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str
    current_tick: int = 0
    cash: float = START_BALANCE
    is_active: bool = True

    # for the ui
    label: str = "Timeline XXXX"
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    duration_seconds: int = DURATION_SECONDS  # total simulation time needs to be decided

    pnl: float = 0.0 # starting pnl
    portfolio_entries: List["PortfolioEntry"] = Relationship(back_populates="session")

""" this should really be called Position but fuck that noise """
# an object of PortfolioEntry exists for each change made to the portfolio
class PortfolioEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="simulationsession.id")
    symbol: str
    holdings: int = 0  # currently held number of shares
    last_price: float = 0.0  # updated on each tick
    avg_price: float = 0.0  # average price for position calculation
    pnl: float = 0.0  # profit/loss for this position

    stop_loss_price: Optional[float] = None  # sell if price ≤ this
    take_profit_price: Optional[float] = None  # sell if price ≥ this

    session: SimulationSession = Relationship(back_populates="portfolio_entries")

# an object for each monetary transaction
class Trade(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="simulationsession.id")
    symbol: str
    action: Action
    order_type: OrderType
    status: OrderStatus = OrderStatus.PENDING
    triggered: bool = False  # if stop loss or limit triggered
    quantity: int
    price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    timestamp: Optional[str] = None