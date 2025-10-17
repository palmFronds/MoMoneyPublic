from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

# not the question's answer but instead what the user answers
# this should only be POST?

class UserAnswer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")

    question_id: int = Field(foreign_key="question.id")           # for which question
    selected_option_id: int = Field(foreign_key="option.id")
    is_correct: bool = False
    answered_at: datetime = Field(default_factory=lambda: datetime.now())
