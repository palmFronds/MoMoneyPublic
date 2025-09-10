from sqlmodel import SQLModel, create_engine
from models import * # importing every model for import

# Sessions imports
from sqlmodel import Session
from contextlib import contextmanager
from typing import Generator
import sqlite3

# ------ CONFIG DEETS --------
DATABASE_URL = "sqlite:///./momoney.db"

# engine to generate tables off metadata
engine = create_engine(
    DATABASE_URL, 
    echo=True,  # setting echo=False to silence SQL logs
    connect_args={
        "check_same_thread": False,
        "timeout": 30.0,  # Increase timeout for busy database
    }
)

# Enable WAL mode for better concurrency
def enable_wal_mode():
    """Enable WAL mode for better concurrent access."""
    try:
        with engine.connect() as conn:
            conn.execute(sqlite3.connect("momoney.db").execute("PRAGMA journal_mode=WAL"))
            conn.execute(sqlite3.connect("momoney.db").execute("PRAGMA synchronous=NORMAL"))
            conn.execute(sqlite3.connect("momoney.db").execute("PRAGMA cache_size=10000"))
            conn.execute(sqlite3.connect("momoney.db").execute("PRAGMA temp_store=MEMORY"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not enable WAL mode: {e}")

# creating the tables from the models
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    enable_wal_mode()

# FastAPI dependency function for route connections
def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        try:
            yield session
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
