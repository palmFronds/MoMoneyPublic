from sqlmodel import SQLModel, Field
from typing import Optional

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    level_id: int = Field(foreign_key="level.id")  # to connect to corresponding level
    # foreign_key links the levels to the questions in the database, avoiding orphans

    text: str   # contents of the questions
    order: int  # the sequence within that specific Level
    # more here