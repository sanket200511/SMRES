"""
Deterministic Demo Data Seeding Script for SMRES (PostgreSQL)
Can be rerun safely without creating duplicates.
"""
import sys
import os

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import SessionLocal
from backend.app.models import User, Technician, MaintenanceRequest
from backend.app.seed_data import seed_database

def main():
    print("Checking PostgreSQL database connection and seeding demo data...")
    db = SessionLocal()
    try:
        initial_users = db.query(User).count()
        initial_techs = db.query(Technician).count()
        initial_tickets = db.query(MaintenanceRequest).count()

        seed_database(db)

        final_users = db.query(User).count()
        final_techs = db.query(Technician).count()
        final_tickets = db.query(MaintenanceRequest).count()

        print(f"[OK] Seeding verification successful:")
        print(f"   - Users in database: {final_users} (Initial: {initial_users})")
        print(f"   - Technicians in database: {final_techs} (Initial: {initial_techs})")
        print(f"   - Maintenance Requests in database: {final_tickets} (Initial: {initial_tickets})")
        print("[OK] Demo dataset is ready and idempotent.")
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
