from fastapi import APIRouter, HTTPException, Depends
from models.questions import Question
from sqlmodel import Session, select
from typing import List, Optional
from db import get_session

# handles all question prefixes
router = APIRouter(prefix="/questions", tags=["Questions"])

# basic GET for all the questions with a level
@router.get("/level/{level_id}", response_model=List[Question])
def get_questions_for_level(level_id: int, session: Session = Depends(get_session)) \
        -> List[Question]:

    questions = session.exec(select(Question).where(Question.level_id == level_id)).all()

    if not questions: # never flags since [None] returned if None
        raise HTTPException(status_code=404, detail=f"No questions found for level ID {level_id}")
    return questions

# getting each question by order within each level rather than
# randomly each question by Question.id
@router.get("/{level_id}/{order}", response_model=Question)
def get_question_by_order(level_id: int, order: int, session: Session = Depends(get_session)) \
        -> Optional[Question]:

    statement = select(Question).where(
        (Question.level_id == level_id) & (Question.order == order)
    )

    # there should only really be one match, returns an onject or None
    question = session.exec(statement).first()
    if not question: # if None
        raise HTTPException(status_code=404, detail="Question not found")
    return question

# if you want to GET by {question_id} anyway
@router.get("/{question_id}", response_model=Question)
def get_question_by_id(question_id: int, session: Session = Depends(get_session)) \
        -> Optional[Question]:

    question = session.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question