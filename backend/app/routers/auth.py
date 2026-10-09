import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, utc_now
from ..schemas import UserRegisterRequest, UserLoginRequest, AuthResponse, UserResponse
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user by email and password, returning a JWT token session."""
    normalized_email = payload.email.strip().lower()

    # Check if user already exists
    existing = db.query(User).filter(User.email.ilike(normalized_email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Derive name if not provided
    name = payload.name.strip() if payload.name and payload.name.strip() else normalized_email.split("@")[0].replace(".", " ").title()
    # Public self-registration is strictly restricted to employee role (never admin)
    role = "employee"

    # Generate sequential or unique user ID
    user_id = f"usr-{uuid.uuid4().hex[:8]}"

    hashed = hash_password(payload.password)

    new_user = User(
        id=user_id,
        name=name,
        email=normalized_email,
        hashed_password=hashed,
        role=role,
        department=payload.department or "General Operations",
        created_at=utc_now(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        user_id=new_user.id,
        email=new_user.email,
        role=new_user.role,
        name=new_user.name,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates user with email and password, issuing a JWT session token."""
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials.",
        )

    token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role,
        name=user.name,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    authorization: Optional[str] = Header(default=None),
    x_demo_user_id: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    """Returns the authenticated user's profile from JWT token or X-Demo-User-ID."""
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()

    if not user and x_demo_user_id:
        user = db.query(User).filter(User.id == x_demo_user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    return UserResponse.model_validate(user)
