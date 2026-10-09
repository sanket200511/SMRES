import os
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import jwt
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

# Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smres-hackathon-super-secret-jwt-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """PBKDF2-HMAC-SHA256 password hashing with random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verifies plain password against hashed salt$key or default demo password."""
    # Fallback for seeded demo users whose hashed_password wasn't set yet
    if not hashed_password:
        return plain_password in ["password123", "admin123", "demo123"]
    if "$" not in hashed_password:
        return plain_password == hashed_password
    try:
        salt, key_hex = hashed_password.split("$", 1)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str, name: str) -> str:
    """Generates signed JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "name": name,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

def get_current_user_from_token(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Extracts User from Authorization: Bearer <token> if present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.id == payload["sub"]).first()
