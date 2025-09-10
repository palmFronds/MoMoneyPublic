from sqlmodel import SQLModel, Field
from typing import Optional

# defining tentative lessons model + data model
class Unit(SQLModel, table=True):
    # defining id as primary key and setting it incremental
    id: Optional[int] = Field(default=None, primary_key=True)

    title: str               # title of each lesson
    description: str         # description of each lesson (matches CSV)
    order: int              # order within the curriculum
    is_active: bool = True   # whether unit active on db
    # more to be defined.