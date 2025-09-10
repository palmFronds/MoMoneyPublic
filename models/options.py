from typing import Optional
from sqlmodel import SQLModel, Field

# each of the 4 options for each corresponding question
# options should only be retrieved via GET

class Option(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="question.id")  # connect to each question

    text: str                    # text on each option
    is_correct: bool             # whether this option is correct
    order: Optional[int] = None  # Optional: for controlling display sequence