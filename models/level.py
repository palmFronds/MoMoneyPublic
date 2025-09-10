from sqlmodel import SQLModel, Field
from typing import Optional

# this is for the Candy Crush style level path screen
# defining each node in the path with a Level object

class Level(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str    # e.g. "Stock Basics", "Bonds & Loans"

    type: str     # "microlearning", "quiz", "checkpoint"
    order: int    # where it appears on the map within the unit

    unit_id: int = Field(foreign_key="unit.id")  # links to the unit this level belongs to

    # more here