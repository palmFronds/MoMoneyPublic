from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.split("Bearer ")[1]
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
