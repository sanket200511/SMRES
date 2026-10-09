import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "smres.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# Priority engine weights
WEIGHT_SAFETY = 8
WEIGHT_OPERATIONAL = 5
WEIGHT_PEOPLE = 4
WEIGHT_TIME = 3

# Calibrated Thresholds
THRESHOLD_CRITICAL = 75
THRESHOLD_HIGH = 50
THRESHOLD_MEDIUM = 25

# SLA response thresholds in hours (for hackathon demo: 1, 2, 5, 10 minutes)
SLA_HOURS = {
    "Critical": 1.0 / 60.0,
    "High": 2.0 / 60.0,
    "Medium": 5.0 / 60.0,
    "Low": 10.0 / 60.0,
}

# Fast escalation check interval in seconds for background task
BACKGROUND_CHECK_INTERVAL_SECONDS = 30
