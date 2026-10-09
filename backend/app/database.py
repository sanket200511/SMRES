from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import DATABASE_URL, BASE_DIR

DB_PATH = BASE_DIR / "smres.db"

def init_engine():
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        try:
            eng = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False, connect_args={"connect_timeout": 1})
            with eng.connect() as conn:
                pass
            return eng
        except Exception:
            fallback_url = f"sqlite:///{DB_PATH}"
            return create_engine(fallback_url, connect_args={"check_same_thread": False}, echo=False)
    else:
        url = DATABASE_URL or f"sqlite:///{DB_PATH}"
        return create_engine(url, connect_args={"check_same_thread": False} if "sqlite" in url else {}, echo=False)

engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
