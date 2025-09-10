import csv
from unified_app.firebase_setup.firebaseSet import db

def load_options(file_path: str = "data/csv/sample_options.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row_num, row in enumerate(reader, 1):
            try:
                db.collection("options").document(str(row["id"])).set({
                    "id": int(row["id"]),
                    "question_id": str(row["question_id"]),
                    "text": row["text"],
                    "is_correct": row["is_correct"].lower() == "true",
                    "order": int(row["order"])
                })
            except Exception as e:
                print(f"Error on row {row_num}: {e}")
                print(f"Row data: {row}")
                print(f"Available keys: {list(row.keys())}")
                raise

if __name__ == "__main__":
    load_options()