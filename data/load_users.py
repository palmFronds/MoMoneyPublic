import csv
from datetime import datetime
from unified_app.firebase_setup.firebaseSet import db

def load_users(file_path: str = "data/csv/sample_users.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("users").document(str(row["id"])).set({
                "id": int(row["id"]),
                "username": row["username"],
                "email": row["email"],
                "xp": int(row["xp"]),
                "joined_at": row["joined_at"]
            })
