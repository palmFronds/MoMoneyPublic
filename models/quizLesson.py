from sqlmodel import SQLModel, Field
from typing import Optional

# the other subdivision of Level holding the lessons that are prompted after
# answering each quiz question within this level

class QuizLesson(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    level_id: int = Field(foreign_key="level.id") # linking to level

    title: str              # title of the quiz lesson
    order: int              # order within the level
    solution_explanation: Optional[str] = None  # new field for explanation

    # more here