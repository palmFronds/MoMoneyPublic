import csv
from unified_app.firebase_setup.firebaseSet import db

def load_microlearning_lessons(file_path: str = "data/csv/sample_microlearning_lessons.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("microlearning_lessons").document(str(row["id"])).set({
                "id": int(row["id"]),
                "level_id": int(row["level_id"]),
                "title": row["title"],
                "order": int(row["order"]),
                "bullet1": row["bullet1"],
                "bullet2": row["bullet2"],
                "bullet3": row["bullet3"],
                "bullet4": row["bullet4"]
            })

if __name__ == "__main__":
    load_microlearning_lessons()