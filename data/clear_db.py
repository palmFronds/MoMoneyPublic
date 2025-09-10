"""
Clear all Firestore collections
Use this before reseeding to ensure clean data
"""
import sys
import os

# Add the parent directory to the path so we can import the firebase setup
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from unified_app.firebase_setup.firebaseSet import db

def clear_all_collections():
    """Clear all collections in Firestore"""
    collections = [
        "units", "levels", "microlearning_lessons", "quiz_lessons", 
        "questions", "options", "users", "user_level_progress", "user_answer"
    ]
    
    print("🗑️ Clearing Firestore collections...")
    
    for collection_name in collections:
        try:
            # Get all documents in the collection
            docs = db.collection(collection_name).stream()
            
            # Delete each document
            deleted_count = 0
            for doc in docs:
                doc.reference.delete()
                deleted_count += 1
            
            print(f"✅ Cleared {collection_name}: {deleted_count} documents")
            
        except Exception as e:
            print(f"⚠️ Error clearing {collection_name}: {e}")
    
    print("🎉 Database cleared successfully!")

if __name__ == "__main__":
    clear_all_collections() 