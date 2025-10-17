from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

# storing the progress of each user in terms of the nodes defined
# one UserLevelProgress object exists for each Level completed and/or unlocked by user

class UserLevelProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")

    # connects directly to some specific Level row
    level_id: int = Field(foreign_key="level.id")

    # tentative attributes
    completed: bool = False
    unlocked: bool = False