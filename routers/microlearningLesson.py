from sqlmodel import Session, select
from models.microlearningLesson import MicrolearningLesson

def count_microlearning_pages_in_level(session: Session, level_id: int) -> int:
    return len(session.exec(
        select(MicrolearningLesson).where(MicrolearningLesson.level_id == level_id)
    ).all())

# more functions here