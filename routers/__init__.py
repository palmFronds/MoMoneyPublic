from .questions import router as questions_router
from .options import router as options_router
from .unit_path import router as interactive_path_router
from .level import router as level_router
from .quiz_page import router as quiz_page_router
from .microlearning_page import router as microlearning_page_router
from .mo_ai import router as mo_ai_router
from .simulation_sesh import router as simulation_router
from .sim_dashboard import router as sim_dashboard_router
from .unit_path import router as unit_router

# from .quizLesson import router as quiz_lesson_router
# quiz_lesson_router excluded since it lacks a router

all_routers = [
    questions_router,
    options_router,
    microlearning_page_router,
    level_router,
    interactive_path_router,
    unit_router,
    quiz_page_router,
    mo_ai_router,
    quiz_page_router,
    simulation_router,
    sim_dashboard_router
]
