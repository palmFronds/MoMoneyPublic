"""
Firestore Database Seeding Script
Loads all CSV data into Firestore collections in the correct order
"""
import sys
import os

# Add the parent directory to the path so we can import the firebase setup
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from load_units import load_units
from load_levels import load_levels
from load_microlearning_lessons import load_microlearning_lessons
from load_quiz_lessons import load_quiz_lessons
from load_questions import load_questions
from load_options import load_options
from load_users import load_users
from load_user_level_progress import load_user_level_progress
from load_user_answer import load_user_answer

def seed_all():
    """Load all data into Firestore in the correct order"""
    print("🌱 Starting Firestore database seeding...")
    
    try:
        # Load in dependency order
        print("📚 Loading units...")
        load_units()
        
        print("📊 Loading levels...")
        load_levels()
        
        print("📖 Loading microlearning lessons...")
        load_microlearning_lessons()
        
        print("🧠 Loading quiz lessons...")
        load_quiz_lessons()
        
        print("❓ Loading questions...")
        load_questions()
        
        print("🔘 Loading options...")
        load_options()
        
        print("👥 Loading users...")
        load_users()
        
        print("📈 Loading user level progress...")
        load_user_level_progress()
        
        print("✍️ Loading user answers...")
        load_user_answer()
        
        print("✅ Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        raise

if __name__ == "__main__":
    seed_all()