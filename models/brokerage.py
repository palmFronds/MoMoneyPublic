from sqlmodel import SQLModel, Field
from typing import Optional

# Brokerages we are working with (In Sha Allah, lol)
class Brokerage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    referral_link: str
    description: Optional[str] = None