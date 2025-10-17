import csv
from unified_app.firebase_setup.firebaseSet import db

def load_units(file_path: str = "data/csv/units.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            db.collection("units").document(str(row["id"])).set({
                "id": int(row["id"]),
                "title": row["title"],
                "description": row["description"],
                "order": int(row["order"]),
                "is_active": True
            })

if __name__ == "__main__":
    load_units()