from db import engine
from sqlmodel import Session
from data.load_units import load_units
from data.load_levels import load_levels
from data.load_microlearning_lessons import load_microlearning_lessons
from data.load_questions import load_questions
from data.load_options import load_options
from data.load_quiz_lessons import load_quiz_lessons
from data.load_user_level_progress import load_user_level_progress
from data.load_users import load_users
from data.load_user_answer import load_user_answers

print("Starting data seeding...")

with Session(engine) as session:
    print("Loading units...")
    load_units(session)
    
    print("Loading levels...")
    load_levels(session)
    
    print("Loading microlearning lessons...")
    load_microlearning_lessons(session)
    
    print("Loading questions...")
    load_questions(session)
    
    print("Loading options...")
    load_options(session)
    
    print("Loading quiz lessons...")
    load_quiz_lessons(session)
    
    print("Loading user level progress...")
    load_user_level_progress(session)
    
    print("Loading users...")
    load_users(session)
    
    print("Loading user answers...")
    load_user_answers(session)

print("😫💦 CSV data seeded successfully!") 