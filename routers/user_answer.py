from sqlmodel import Session
from models.user_answer import UserAnswer
from models.options import Option
from fastapi import HTTPException
from .quizLesson import get_explanation_for_question
from sqlalchemy import select

def process_user_answer(answer: UserAnswer, session: Session) -> dict:
    # Validate the selected option
    option = session.get(Option, answer.selected_option_id)
    if not option:
        raise HTTPException(status_code=400, detail="Invalid option selected")

    if option.question_id != answer.question_id:
        raise HTTPException(status_code=400, detail="Option does not belong to question")

    # Assign correctness
    answer.is_correct = option.is_correct

    # Save to DB
    session.add(answer)
    session.commit()
    session.refresh(answer)

    # Get explanation
    explanation = get_explanation_for_question(answer.question_id, session)

    # Find the correct option ID for highlighting - use a simpler approach
    try:
        # Get all options for this question and find the correct one
        all_options = session.exec(
            select(Option).where(Option.question_id == answer.question_id)
        ).all()
        
        correct_option = next((opt for opt in all_options if opt.is_correct), None)
        correct_option_id = correct_option.id if correct_option else None
    except Exception as e:
        print(f"Error finding correct option: {e}")
        correct_option_id = None

    return {
        "is_correct": answer.is_correct,
        "user_answer_id": answer.id,
        "explanation": explanation,
        "correct_option_id": correct_option_id
    }