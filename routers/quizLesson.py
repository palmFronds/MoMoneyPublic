from fastapi import HTTPException
from sqlmodel import Session, select
from models.quizLesson import QuizLesson
from models.questions import Question

# quiz lesson router
# this is called within the routers/user_answer

def get_explanation_for_question(question_id: int, session: Session) -> str:
    # First get the question to find its level_id
    question = session.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Then find the quiz lesson for that level
    quiz = session.exec(
        select(QuizLesson).where(QuizLesson.level_id == question.level_id)
    ).first()

    if not quiz:
        raise HTTPException(status_code=404, detail="Explanation not found")

    # Return the solution_explanation from the model
    return quiz.solution_explanation or f"Explanation for {quiz.title}"