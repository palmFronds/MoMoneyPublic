from sqlmodel import Session, SQLModel, create_engine
from db import engine  # existing DB engine setup

def reset_db():
    print("🧼 Dropping and recreating tables...")
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    print("\nreset successful babagrill $_$")

# run this with > python reset_db.py

if __name__ == "__main__":
    reset_db()