import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .seed_data import seed_database
from .services.sla_service import check_and_escalate_overdue_tickets
from .config import BACKGROUND_CHECK_INTERVAL_SECONDS
from .routers import tickets, technicians, users, stats, recurring

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smres")

# Background periodic SLA checker
async def background_sla_monitor():
    while True:
        try:
            await asyncio.sleep(BACKGROUND_CHECK_INTERVAL_SECONDS)
            db = SessionLocal()
            try:
                escalated = check_and_escalate_overdue_tickets(db)
                if escalated:
                    logger.info(f"[SLA Monitor] Escalated {len(escalated)} overdue ticket(s): {[t.id for t in escalated]}")
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[SLA Monitor Error] {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed demo data
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Database initialized and demo data verified.")
    finally:
        db.close()

    # Start background SLA task
    monitor_task = asyncio.create_task(background_sla_monitor())
    yield
    # Shutdown
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Smart Maintenance Request & Escalation System (SMRES)",
    description="Enterprise maintenance management platform with explainable smart priority scoring, duplicate incident detection, skill-based technician dispatch, and SLA automated escalation.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with dual route support for /api/tickets and /api/requests
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])
app.include_router(tickets.router, prefix="/api/requests", tags=["Requests"])
app.include_router(technicians.router)
app.include_router(users.router)
app.include_router(stats.router)
app.include_router(recurring.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SMRES Backend",
        "database": "connected",
        "sla_monitor": "active",
    }
