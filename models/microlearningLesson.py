from sqlmodel import SQLModel, Field
from typing import Optional

# subdividing a level into a micro-learning section where players can be
# presented information in some intuitive, simple, concise manner before being quizzed

class MicrolearningLesson(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    level_id: int = Field(foreign_key="level.id") # links to a specific level
    title: str  # lesson title

    # this accommodates for multiple micro-learning lesson flashcards per level
    # the default value is 1 but need to hard code order of flashcards
    order: int = Field(default=1)

    # concise informational bullets (optional)
    bullet1: Optional[str] = None
    bullet2: Optional[str] = None
    bullet3: Optional[str] = None
    bullet4: Optional[str] = None

    # more here