import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.seed_data import seed_database
from backend.app.main import app

def init_test_engine():
    test_url = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg://postgres@localhost:5433/smres_test")
    if test_url and test_url.startswith("postgresql"):
        try:
            eng = create_engine(test_url, pool_pre_ping=True, connect_args={"connect_timeout": 1})
            with eng.connect() as conn:
                pass
            return eng
        except Exception:
            return create_engine("sqlite:///smres_test.db", connect_args={"check_same_thread": False})
    else:
        return create_engine("sqlite:///smres_test.db", connect_args={"check_same_thread": False})

test_engine = init_test_engine()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True, scope="session")
def setup_postgres_session():
    """Sets up schema in PostgreSQL smres_test for testing session."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    # Keep database tables for inspection or reset
