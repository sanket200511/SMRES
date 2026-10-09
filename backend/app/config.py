import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Primary PostgreSQL database URL
DEFAULT_POSTGRES_URL = "postgresql+psycopg://postgres@localhost:5433/smres"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_POSTGRES_URL)



# Priority engine weights
WEIGHT_SAFETY = 8
WEIGHT_OPERATIONAL = 5
WEIGHT_PEOPLE = 4
WEIGHT_TIME = 3

# Calibrated Thresholds
THRESHOLD_CRITICAL = 75
THRESHOLD_HIGH = 50
THRESHOLD_MEDIUM = 25

# Hackathon Demo vs Production SLA Mode
# Demo thresholds: Critical: 1m, High: 2m, Medium: 5m, Low: 10m
SLA_MODE = os.getenv("SLA_MODE", "demo")

# Stored in fractional hours (1 min = 1/60 hr)
SLA_HOURS_DEMO = {
    "Critical": 1.0 / 60.0,   # 1 minute
    "High": 2.0 / 60.0,       # 2 minutes
    "Medium": 5.0 / 60.0,     # 5 minutes
    "Low": 10.0 / 60.0,       # 10 minutes
}

# Alias for backward compatibility with older tests and modules
SLA_HOURS = SLA_HOURS_DEMO

SLA_HOURS_PROD = {
    "Critical": 1.0,   # 1 hour
    "High": 4.0,       # 4 hours
    "Medium": 24.0,    # 24 hours
    "Low": 48.0,       # 48 hours
}

def get_configured_sla_hours(priority: str) -> float:
    table = SLA_HOURS_DEMO if SLA_MODE.lower() == "demo" else SLA_HOURS_PROD
    return table.get(priority, 5.0 / 60.0 if SLA_MODE.lower() == "demo" else 24.0)

# Periodic background SLA check interval in seconds
BACKGROUND_CHECK_INTERVAL_SECONDS = 15
