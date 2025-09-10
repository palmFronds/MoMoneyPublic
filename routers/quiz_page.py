from fastapi import APIRouter, Request, Depends, Form, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from unified_app.firebase_setup.firebaseSet import db

from routers.questions import get_question_by_order
from routers.options import get_options_for_question
from routers.user_answer import process_user_answer
from models.user_answer import UserAnswer
from models.questions import Question
from .quizLesson import get_explanation_for_question

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# Helper functions for Firestore

def get_question_by_order(level_id: int, order: int):
    questions_ref = db.collection("questions").where("level_id", "==", level_id).where("order", "==", order)
    docs = list(questions_ref.stream())
    if not docs:
        return None
    question = docs[0].to_dict()
    question["id"] = docs[0].id
    return question


def get_option_for_question(question_id: int):
    print(f"Fetching options for question ID: {question_id}")
    options_ref = db.collection("options").where("question_id", "==", question_id).order_by("order")
    docs = list(options_ref.stream())
    print(f"Number of options found: {len(docs)}")

    options = []
    for doc in docs:
        option = doc.to_dict()
        option["id"] = doc.id
        options.append(option)
    return options

def get_question_count_for_level(level_id: int):
    questions_ref = db.collection("questions").where("level_id", "==", level_id)
    docs = list(questions_ref.stream())
    return len(docs)

# Pydantic model for JSON request body
class QuizAnswerRequest(BaseModel):
    level_id: int
    question_order: int
    question_id: int
    user_id: str
    selected_option_id: int
    unit: int

# New JSON API endpoints for React frontend
@router.get("/api/{level_id}")
def get_quiz_data_json(level_id: int, user_id: str, unit: int):
    print("=== /quiz/api/{level_id} endpoint called ===")
    print(f"Received level_id: {level_id}, user_id: {user_id}, unit: {unit}")

    # Fetch all questions for the level, sorted by 'order'
    questions_ref = db.collection("questions").where("level_id", "==", level_id).order_by("order")
    docs = list(questions_ref.stream())
    print(f"Number of question documents found: {len(docs)}")

    if not docs:
        raise HTTPException(status_code=404, detail="No questions found for this level")

    questions = []
    for doc in docs:
        q = doc.to_dict()
        q["id"] = doc.id
        print(f"Processing question with ID: {doc.id}, Data: {q}")

        options = get_option_for_question(doc.id)
        q["options"] = sorted(options, key=lambda o: o.get("order", 0))
        questions.append(q)

    return {"questions": questions}

@router.post("/api/answer")
def submit_quiz_answer_json(request: QuizAnswerRequest):
    """Submit quiz answer and return JSON response (Firestore version)"""
    selected_option_ref = db.collection("options").document(str(request.selected_option_id))
    selected_option_doc = selected_option_ref.get()

    if not selected_option_doc.exists:
        raise HTTPException(status_code=404, detail="Selected option not found")

    selected_option = selected_option_doc.to_dict()
    is_correct = selected_option.get("is_correct", False)
    question_id = selected_option.get("question_id")

    # Fetch all options for this question to highlight the correct one
    options_ref = db.collection("options").where("question_id", "==", str(question_id))
    options = options_ref.stream()
    correct_option_id = None
    for opt in options:
        opt_data = opt.to_dict()
        if opt_data.get("is_correct"):
            correct_option_id = opt_data.get("id")
            break

    # Store answer
    db.collection("user_answers").add({
        "user_id": request.user_id,
        "level_id": request.level_id,
        "question_id": question_id,
        "question_order": request.question_order,
        "selected_option_id": request.selected_option_id,
        "unit": request.unit
    })

    # Fetch explanation from quiz_lessons if incorrect
    explanation = ""
    if not is_correct:
        # Get the question to find its level_id
        question_ref = db.collection("questions").document(str(request.question_id))
        question_doc = question_ref.get()
        if question_doc.exists:
            question_data = question_doc.to_dict()
            level_id = question_data.get("level_id")
            # Find the quiz lesson for that level
            quiz_lessons_ref = db.collection("quiz_lessons").where("level_id", "==", level_id)
            quiz_lessons = list(quiz_lessons_ref.stream())
            if quiz_lessons:
                quiz_lesson = quiz_lessons[0].to_dict()
                explanation = quiz_lesson.get("solution_explanation") or f"Explanation for {quiz_lesson.get('title', 'this quiz')}"

    return {
        "selected_option_id": request.selected_option_id,
        "is_correct": is_correct,
        "correct_option_id": correct_option_id,
        "explanation": explanation
    }



# Existing Jinja2 endpoints (kept for backward compatibility)
@router.get("/")
def get_quiz_page(request: Request, level_id: int, question_order: int,
                  user_id: int, unit: int):

    # getting question using routers.questions
    question = get_question_by_order(level_id, question_order)
    if not question: # if the question doesn't exist
        return RedirectResponse(url="/error")

    # getting ze options with routers.options
    numeric_qid = question.get("id_field") or question.get("id")
    options = get_option_for_question(numeric_qid)
    option_data = [{"id": o["id"], "text": o["text"]} for o in options]

    # returning the template
    return templates.TemplateResponse("quiz.html", {
        "request": request,
        "question": question["text"],
        "options": option_data,
        "explanation": "",  # empty before submission
        "user_id": user_id,
        "level_id": level_id,
        "question_order": question_order,
        "unit": unit
    })

# when the user submits an answer
@router.post("/answer")
def submit_quiz_answer(request: Request,
                       level_id: int = Form(...),
                       question_order: int = Form(...),
                       user_id: int = Form(...),
                       selected_option_id: int = Form(...),
                       unit: int = Form(...)):

    # using routers.questions
    question = get_question_by_order(level_id, question_order)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    numeric_qid = question.get("id_field") or question.get("id")
    answer = UserAnswer(
        user_id=user_id,
        level_id=level_id,
        question_id=numeric_qid,
        question_order=question_order,
        selected_option_id=selected_option_id
    )

    # getting the results from routers.user_answer
    result = process_user_answer(answer)

    # retrieving da bloody options again
    options = get_option_for_question(numeric_qid)
    option_data = [{"id": o["id"], "text": o["text"]} for o in options]

    # returning the templates with the explanation this time
    return templates.TemplateResponse("quiz.html", {
        "request": request,
        "question": question["text"],
        "options": option_data,
        "explanation": result["explanation"],
        "user_id": user_id,
        "level_id": level_id,
        "question_order": question_order,
        "unit": unit
    })

@router.get("/next")
def get_next_question(request: Request, level_id: int, question_order: int,
                      user_id: int, unit: int):

    # finding the total questions for each level
    total_questions = get_question_count_for_level(level_id)

    # the question_order for the next question
    next_order = question_order + 1

    if next_order > total_questions:
        return RedirectResponse(url=f"/path/{user_id}?unit={unit}")  # sending them back to the path

    else:
        return RedirectResponse(
            url=f"/quiz/?level_id={level_id}&question_order={next_order}&user_id={user_id}&unit={unit}"
        ) # if they ain't at the end, give em the next one