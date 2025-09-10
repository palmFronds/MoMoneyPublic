import csv
from unified_app.firebase_setup.firebaseSet import db

def load_questions(file_path: str = "data/csv/sample_questions.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile) # flags but works perfectly
        for row in reader:
            db.collection("questions").document(str(row["id"])).set({
                "id": int(row["id"]),
                "level_id": int(row["level_id"]),
                "text": row["text"],
                "order": int(row["order"])
            })

if __name__ == "__main__":
    load_questions()