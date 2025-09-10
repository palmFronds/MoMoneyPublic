from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from unified_app.firebase_setup.firebaseSet import db

from db import get_session
from models.microlearningLesson import MicrolearningLesson
from .microlearningLesson import count_microlearning_pages_in_level  # <- moved to a helper file

router = APIRouter(prefix="/microlearning", tags=["Microlearning"])
templates = Jinja2Templates(directory="templates")

# New JSON API endpoints for React frontend
@router.get("/api/{level_id}/{page_order}")
def get_microlearning_data_json(
    level_id: int,
    page_order: int,
    user_id: str,  # Firebase UID
    unit: int
):
    # Fetch the microlearning lesson for this level and order
    lessons_ref = db.collection("microlearning_lessons").where("level_id", "==", level_id).where("order", "==", page_order)
    lessons_docs = list(lessons_ref.stream())
    if not lessons_docs:
        raise HTTPException(status_code=404, detail="Slide not found")
    lesson = lessons_docs[0].to_dict()
    # Get total pages for this level
    total_pages_ref = db.collection("microlearning_lessons").where("level_id", "==", level_id)
    total_pages = len(list(total_pages_ref.stream()))
    progress_percent = int((page_order / total_pages) * 100) if total_pages else 0
    has_next = page_order < total_pages
    return {
        "title": lesson.get("title", ""),
        "bullets": [lesson.get("bullet1"), lesson.get("bullet2"), lesson.get("bullet3"), lesson.get("bullet4")],
        "progress_percent": progress_percent,
        "has_next": has_next,
        "total_pages": total_pages,
        "current_page": page_order,
        "level_id": level_id
    }

"""@router.get("/", response_class=RedirectResponse)
def redirect_to_first_slide(level_id: int):
    return RedirectResponse(f"/microlearning/?level_id={level_id}&question_order=1&user_id=1")"""

@router.get("/")
def get_microlearning_slide(
    request: Request,
    level_id: int = Query(...),
    question_order: int = Query(...),
    user_id: str = Query(...),
    unit: int = Query(...)
):
    lessons_ref = db.collection("microlearning_lessons").where("level_id", "==", level_id).where("order", "==", question_order)
    lessons_docs = list(lessons_ref.stream())
    if not lessons_docs:
        raise HTTPException(status_code=404, detail="Slide not found")
    lesson = lessons_docs[0].to_dict()
    total_pages_ref = db.collection("microlearning_lessons").where("level_id", "==", level_id)
    total_pages = len(list(total_pages_ref.stream()))
    progress_percent = int((question_order / total_pages) * 100) if total_pages else 0
    next_order = question_order + 1
    has_next = next_order <= total_pages
    next_link = (
        f"/microlearning/?level_id={level_id}&question_order={next_order}&user_id={user_id}&unit={unit}"
        if has_next else f"/path/{user_id}?unit={unit}"
    )
    read_more = "Ight" if has_next else "Get me out"
    return templates.TemplateResponse("microlearning.html", {
        "request": request,
        "progress_percent": progress_percent,
        "microlearning_title": lesson.get("title", ""),
        "text_bullets": [lesson.get("bullet1"), lesson.get("bullet2"), lesson.get("bullet3"), lesson.get("bullet4")],
        "read_more": "Read More",
        "next_page": read_more,
        "next_link": next_link,
        "image_text": "Image Placeholder",
        "unit": unit
    })