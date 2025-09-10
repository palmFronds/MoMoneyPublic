from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timezone

# defining user class
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)    # User Ids (Incremental)
    username: str                                                # Unique Username
    email: str                                                   # Users email
    xp: int = 0                                                  # Cumulative xp of users
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Date when user joined
    # The above line ensures that joined_at is aware of its timezone, idk its some weird CS thing