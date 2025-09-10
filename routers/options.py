from fastapi import APIRouter, HTTPException
from typing import List
from unified_app.firebase_setup.firebaseSet import db

router = APIRouter(prefix="/options", tags=["Options"])

# GET for options for some {question_id}
@router.get("/question/{question_id}")
def get_options_for_question(question_id: int) -> List[dict]:
    options_ref = db.collection("options").where("question_id", "==", question_id).order_by("order")
    docs = list(options_ref.stream())
    options = []
    for doc in docs:
        option = doc.to_dict()
        option["id"] = doc.id
        options.append(option)
    if not options:
        raise HTTPException(status_code=404, detail="Options not found for this question")
    return options
