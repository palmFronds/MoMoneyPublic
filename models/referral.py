from sqlmodel import SQLModel, Field
from typing import Optional

# Class regarding users transferred to brokerages/banks
class Referral(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    brokerage_id: int = Field(foreign_key="brokerage.id")
    converted: bool = False
    commission_earned: Optional[float] = None # Dollas