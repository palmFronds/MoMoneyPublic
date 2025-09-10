from sqlmodel import SQLModel, Field
from typing import Optional

# storing the progress of each user in terms of the units defined

class UserUnitProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")

    # connects directly to some specific Level row
    unit_id: int = Field(foreign_key="level.id")

    # tentative attributes
    completed: bool = False
    unlocked: bool = False