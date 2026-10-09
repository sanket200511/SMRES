import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

from backend.app.models import Technician
from backend.app.database import Base
from backend.app.services.technician_service import recommend_best_technician, assign_technician_to_ticket, CATEGORY_SKILL_MAP

# Setup in-memory DB
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Seed technicians
    techs = [
        Technician(id="tech-1", name="Electrician Ed", email="ed@example.com", phone="123", skills="Electrical, Power Systems", active_tickets_count=0, is_available=True),
        Technician(id="tech-2", name="Plumber Pete", email="pete@example.com", phone="123", skills="Plumbing", active_tickets_count=2, is_available=True),
        Technician(id="tech-3", name="General Greg", email="greg@example.com", phone="123", skills="General", active_tickets_count=1, is_available=True),
        Technician(id="tech-4", name="Busy Bob", email="bob@example.com", phone="123", skills="Electrical, HVAC", active_tickets_count=5, is_available=True),
        Technician(id="tech-5", name="Offline Olivia", email="olivia@example.com", phone="123", skills="Electrical", active_tickets_count=0, is_available=False),
    ]
    db.add_all(techs)
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=test_engine)

def test_recommend_best_technician_skill_match(setup_db):
    db = setup_db
    # Electrician Ed has the best match and 0 workload
    rec = recommend_best_technician(db, "Electrical")
    assert rec is not None
    assert rec.technician_id == "tech-1"

def test_recommend_best_technician_workload_consideration(setup_db):
    db = setup_db
    # Both Ed and Bob have Electrical skill. Ed has 0 workload, Bob has 5.
    rec = recommend_best_technician(db, "Electrical")
    assert rec.technician_id == "tech-1"

def test_recommend_best_technician_availability(setup_db):
    db = setup_db
    # Olivia has Electrical skill and 0 workload, but is unavailable.
    # So Ed should be recommended.
    rec = recommend_best_technician(db, "Electrical")
    assert rec.technician_id != "tech-5"

def test_recommend_best_technician_no_suitable_tech(setup_db):
    db = setup_db
    # Let's make all tech unavailable
    db.query(Technician).update({"is_available": False})
    db.commit()
    
    rec = recommend_best_technician(db, "Electrical")
    assert rec is None

def test_recommend_best_technician_general_fallback(setup_db):
    db = setup_db
    # Structural category has no direct match. Should fallback to General Greg.
    rec = recommend_best_technician(db, "Structural")
    assert rec is not None
    assert rec.technician_id == "tech-3"

