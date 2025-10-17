from fastapi import APIRouter, HTTPException
from unified_app.firebase_setup.firebaseSet import db
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/level", tags=["Level"])

# Pydantic model for JSON request body
class LevelCompleteRequest(BaseModel):
    user_id: str  # Firebase UID
    level_id: int

@router.get("/user/{user_id}")
def get_levels_for_user(user_id: str, unit: int):
    # Fetch all levels for the unit
    levels_ref = db.collection("levels").where("unit_id", "==", unit)
    levels_docs = list(levels_ref.stream())
    levels = [doc.to_dict() | {"id": int(doc.id)} for doc in levels_docs]
    levels.sort(key=lambda x: x.get("id", 0))  # Sort by 'order' field ascending
    if not levels:
        return []

    # Get all level IDs in unit
    level_ids = [level["id"] for level in levels]

    # Fetch existing progress entries for this user & unit
    progress_ref = db.collection("user_level_progress") \
        .where("user_id", "==", user_id) \
        .where("level_id", "in", level_ids)
    progress_docs = list(progress_ref.stream())
    progress_dict = {doc.to_dict()["level_id"]: doc.to_dict() for doc in progress_docs}

    # Initialize progress if missing
    if not progress_dict:
        for i, level in enumerate(sorted(levels, key=lambda l: l["order"])):
            db.collection("user_level_progress").add({
                "user_id": user_id,
                "level_id": level["id"],
                "unlocked": (i == 0),  # only first is unlocked
                "completed": False
            })
        # Fetch the newly added progress again
        progress_docs = list(progress_ref.stream())
        progress_dict = {doc.to_dict()["level_id"]: doc.to_dict() for doc in progress_docs}

    # Build level display data
    result = []
    for i, level in enumerate(sorted(levels, key=lambda l: l["order"])):
        user_progress = progress_dict.get(level["id"], {})
        unlocked = user_progress.get("unlocked", False)
        completed = user_progress.get("completed", False)
        level_data = {
            "id": level["id"],
            "title": level["title"],
            "order": level["order"],
            "type": level["type"],
            "unit": level["unit_id"],
            "unlocked": unlocked,
            "completed": completed,
        }
        result.append(level_data)

    return result

@router.post("/api/complete")
def complete_level_json(request: LevelCompleteRequest):
    user_id = request.user_id
    level_id = request.level_id
    print("=== /api/complete endpoint called ===")

    # Fetch user progress for this level
    progress_ref = db.collection("user_level_progress").where("user_id", "==", user_id).where("level_id", "==", level_id)
    progress_docs = list(progress_ref.stream())
    progress = progress_docs[0].to_dict() if progress_docs else None
    if not progress:
        raise HTTPException(status_code=403, detail="Level not unlocked")
    if not progress.get("unlocked", False):
        raise HTTPException(status_code=403, detail="Level is still locked")
    if progress.get("completed", False):
        return {"message": f"Level already completed."}
    # Mark as completed
    progress_doc_id = progress_docs[0].id
    db.collection("user_level_progress").document(progress_doc_id).update({"completed": True})
    # Get current level
    level_doc = db.collection("levels").document(str(level_id)).get()
    current_level = level_doc.to_dict() if level_doc.exists else None
    current_unit_id = current_level["unit_id"]
    # Find next level in same unit with higher id
    next_level_query = db.collection("levels").where("unit_id", "==", current_unit_id).where("id", ">", level_id).order_by("id").limit(1)
    next_level_docs = list(next_level_query.stream())
    next_level = next_level_docs[0].to_dict() if next_level_docs else None

    # If no next level in current unit, find first level of next unit by lowest 'order'
    if not next_level:
        print(f"No next level in current unit {current_unit_id}, searching next unit...")
        next_unit_query = db.collection("levels").where("unit_id", "==", current_unit_id + 1).order_by("order").limit(1)
        next_unit_docs = list(next_unit_query.stream())
        next_level = next_unit_docs[0].to_dict() if next_unit_docs else None
        # Mark the current unit as completed in user_unit_progress
        unit_progress_ref = db.collection("user_unit_progress").where("user_id", "==", user_id).where("unit_id", "==", current_unit_id)
        unit_progress_docs = list(unit_progress_ref.stream())
        if unit_progress_docs:
            unit_progress_doc_id = unit_progress_docs[0].id
            db.collection("user_unit_progress").document(unit_progress_doc_id).update({"completed": True})
        else:
            db.collection("user_unit_progress").add({
                "user_id": user_id,
                "unit_id": current_unit_id,
                "completed": True,
                "unlocked": True
            })
    # If next level is in a new unit, unlock the first level of the next unit for the user
    if next_level and next_level["unit_id"] != current_unit_id:
        # Unlock the next unit for the user
        next_unit_progress_ref = db.collection("user_unit_progress").where("user_id", "==", user_id).where("unit_id", "==", next_level["unit_id"])
        next_unit_progress_docs = list(next_unit_progress_ref.stream())
        if next_unit_progress_docs:
            db.collection("user_unit_progress").document(next_unit_progress_docs[0].id).update({"unlocked": True})
        else:
            db.collection("user_unit_progress").add({
                "user_id": user_id,
                "unit_id": next_level["unit_id"],
                "completed": False,
                "unlocked": True
            })
    if next_level:
        print(f"Next level found: {next_level['id']} (unit {next_level['unit_id']}, order {next_level['order']})")
        # Unlock next level for user
        next_progress_ref = db.collection("user_level_progress").where("user_id", "==", user_id).where("level_id", "==", next_level["id"])
        next_progress_docs = list(next_progress_ref.stream())
        if next_progress_docs:
            next_progress_doc_id = next_progress_docs[0].id
            print(f"next_progress_doc_id found: {next_progress_doc_id}, updating unlocked=True")
            db.collection("user_level_progress").document(next_progress_doc_id).update({"unlocked": True})
        else:
            print(f"No next_progress_doc_id found, creating new user_level_progress for level {next_level['id']}")
            db.collection("user_level_progress").add({
                "user_id": user_id,
                "level_id": next_level["id"],
                "unlocked": True,
                "completed": False
            })
        # If next level is in a new unit, return info for redirection
        if next_level["unit_id"] != current_unit_id:
            response_dict = {
                "message": f"Level {current_level['order']} completed, unit {current_unit_id} completed, next unit {next_level['unit_id']} unlocked, next level {next_level['id']} unlocked",
                "completed_level": current_level["order"],
                "completed_unit": current_unit_id,
                "next_unit": next_level["unit_id"],
                "next_level": next_level["id"],
                "next_level_type": next_level["type"],
                "redirect": "next_unit"
            }
            print(f"current_unit_id: {current_unit_id}")
            print(f"next_level: {next_level}")
            print("Returning response:", response_dict)
            return response_dict
        else:
            response_dict = {
                "message": f"Level {current_level['order']} completed and level {next_level['id']} unlocked",
                "completed_level": current_level["order"],
                "next_level": next_level["id"],
                "next_level_type": next_level["type"],
                "redirect": "next_level"
            }
            print(f"current_unit_id: {current_unit_id}")
            print(f"next_level: {next_level}")
            print("Returning response:", response_dict)
            return response_dict
    else:
        print("No next level or next unit found. Nothing to unlock.")
        response_dict = {
            "message": f"Level {current_level['order']} completed and unit {current_unit_id} completed. No more levels or units.",
            "completed_level": current_level["order"],
            "completed_unit": current_unit_id,
            "redirect": "dashboard"
        }
        print(f"current_unit_id: {current_unit_id}")
        print("Returning response:", response_dict)
        return response_dict

# this post request should be sent out if the user finishes some microlearning or quiz
# should be sent out automatically and update database accordingly
@router.post("/complete")
def complete_level(user_id: str, level_id: int):
    # finding the UserLevelProgress by user_id and level_id
    progress_ref = db.collection("user_level_progress").where("user_id", "==", user_id).where("level_id", "==", level_id)
    progress_docs = list(progress_ref.stream())
    progress = progress_docs[0].to_dict() if progress_docs else None

    if not progress: # if the level can't be found in UserLevelProgress
        raise HTTPException(status_code=403, detail="Level not unlocked")
        # also flags if user_id doesn't exist in the db

    if not progress.get("unlocked", False): # if the level hasn't been unlocked
        raise HTTPException(status_code=403, detail="Level is still locked")

    if progress.get("completed", False): # if the level's already completed, no error
        return {"message": f"Level already completed."}

    # marking as completed if level has been unlocked since all unlocked levels must be
    # completed before the next locked level is unlocked
    progress_doc_id = progress_docs[0].id
    db.collection("user_level_progress").document(progress_doc_id).update({"completed": True})

    # getting the current level
    level_doc = db.collection("levels").document(str(level_id)).get()
    current_level = level_doc.to_dict() if level_doc.exists else None

    # find the next available level in the same unit with a higher level_id
    next_level_query = db.collection("levels").where("unit_id", "==", current_level["unit_id"]).where("id", ">", level_id).order_by("id").limit(1)
    next_level_docs = list(next_level_query.stream())
    next_level = next_level_docs[0].to_dict() if next_level_docs else None
    # if no next level in current unit, find the first level of the next unit by lowest 'order'
    if not next_level:
        next_unit_query = db.collection("levels").where("unit_id", "==", current_level["unit_id"] + 1).order_by("order").limit(1)
        next_unit_docs = list(next_unit_query.stream())
        next_level = next_unit_docs[0].to_dict() if next_unit_docs else None
        # if no next unit exists, user has completed all units
        if not next_level:
            print(f"User {user_id} has completed all units! No more levels to unlock.")

    if next_level: # if next_level exists
        # checking that the next_level isn't already unlocked and/or completed
        next_progress_ref = db.collection("user_level_progress").where("user_id", "==", user_id).where("level_id", "==", next_level["id"])
        next_progress_docs = list(next_progress_ref.stream())
        if not next_progress_docs: # if the next level hasn't been unlocked and/or completed
            db.collection("user_level_progress").add({
                "user_id": user_id,
                "level_id": next_level["id"],
                "unlocked": True,
                "completed": False
            })

    return {"message": f"Level {current_level['order']} completed "
                       f"and level {next_level['id'] if next_level else 'none'} unlocked"}