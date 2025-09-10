from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routers import all_routers
from routers.chart_data import router as chart_data_router
from routers.simulation_sesh import router as simulation_router
from fastapi.middleware.cors import CORSMiddleware
from db import create_db_and_tables
import uvicorn
import os

# Configuration - Change these values to update server settings
SERVER_CONFIG = {
    "host": "0.0.0.0",  # Listen on all interfaces
    "port": 8000,        # Backend server port (set to 8000 for consistency)
    "reload": True,      # Auto-reload on code changes
    "log_level": "info"
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],  # or ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers dynamically
for router in all_routers:
    app.include_router(router)

# Include chart data and simulation routers explicitly
app.include_router(chart_data_router)
app.include_router(simulation_router)

# Run the server if this file is executed directly
if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", SERVER_CONFIG["port"]))
    host = os.getenv("BACKEND_HOST", SERVER_CONFIG["host"])
    print(f"🚀 Starting MoMoney backend server on {host}:{port}")
    print(f"📊 API Documentation: http://{host}:{port}/docs")
    print(f"🔗 Health Check: http://{host}:{port}/health")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=SERVER_CONFIG["reload"],
        log_level=SERVER_CONFIG["log_level"]
    )
