import csv
from unified_app.firebase_setup.firebaseSet import db

def load_user_level_progress(file_path: str = "data/csv/sample_user_level_progress.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("user_level_progress").document(str(row["id"])).set({
                "id": int(row["id"]),
                "user_id": int(row["user_id"]),
                "level_id": int(row["level_id"]),
                "completed": row["completed"] == "1",
                "unlocked": row["unlocked"] == "1"
            })

if __name__ == "__main__":
    load_user_level_progress()