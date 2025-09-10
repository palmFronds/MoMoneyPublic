import csv
from datetime import datetime
from unified_app.firebase_setup.firebaseSet import db

def parse_boolean(value):
    """Parse string boolean values to Python boolean"""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == 'true'
    return bool(value)

def load_user_answers(file_path: str = "data/csv/sample_user_answer.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("user_answers").document(str(row["id"])).set({
                "id": int(row["id"]),
                "user_id": int(row["user_id"]),
                "question_id": int(row["question_id"]),
                "selected_option_id": int(row["selected_option_id"]),
                "is_correct": parse_boolean(row["is_correct"]),
                "answered_at": row["answered_at"]
            }) 