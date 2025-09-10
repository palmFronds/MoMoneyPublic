import csv
from unified_app.firebase_setup.firebaseSet import db

def load_levels(file_path: str = "data/csv/sample_levels.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("levels").document(str(row["id"])).set({
                "id": int(row["id"]),
                "title": row["title"],
                "type": row["type"],
                "order": int(row["order"]),
                "unit_id": int(row["unit_id"])
            })

if __name__ == "__main__":
    load_levels()