import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base, get_db
from backend.app.seed_data import seed_database
from backend.app.main import app

# PostgreSQL is mandatory for test execution
TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg://postgres@localhost:5433/smres_test")

if not TEST_DB_URL.startswith("postgresql"):
    raise RuntimeError(
        "PostgreSQL is mandatory for SMRES tests. SQLite fallback is strictly prohibited. "
        "Please provide a valid PostgreSQL TEST_DATABASE_URL."
    )

test_engine = create_engine(TEST_DB_URL, pool_pre_ping=True)

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
