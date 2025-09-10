import csv
from models.quizLesson import QuizLesson
from sqlmodel import Session

def load_quiz_lessons(session: Session, file_path: str = "data/csv/sample_quiz_lessons.csv"):
    with open(file_path, newline="", encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            lesson = QuizLesson(
                id=int(row["id"]),
                level_id=int(row["level_id"]),
                title=row["title"],
                order=int(row["order"]),
                solution_explanation=row.get("solution_explanation")
            )
            session.add(lesson)
        session.commit()
