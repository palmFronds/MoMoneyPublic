from fastapi import APIRouter, HTTPException
from unified_app.firebase_setup.firebaseSet import db
from typing import List

router = APIRouter(prefix="/units", tags=["Unit"])

@router.get("/", response_model=List[dict])
def get_all_units():
    try:
        units_ref = db.collection("units")
        docs = units_ref.stream()
        units = [{**doc.to_dict(), "id": doc.id} for doc in docs]
        units.sort(key=lambda x: x.get("order", 0))  # Sort by 'order' field ascending
        return units
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching units: {str(e)}")

@router.get("/{unit_id}", response_model=dict)
def get_unit_path(unit_id: str):
        doc_ref = db.collection("units").document(unit_id)
        doc = doc_ref.get()
        if doc.exists:
            return {**doc.to_dict(), "id": doc.id}
        else:
            raise HTTPException(status_code=404, detail="Unit not found")



