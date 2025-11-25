# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from .db import Base, engine, get_db
from . import models, schemas
from .auth import (
    hash_password,
    authenticate_user,
    create_access_token,
    get_current_user,
)

# Import ADK runner helper
from agents.skincoach_agent.agent import run_skincoach

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkinCoach API")

# CORS for your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_profile(profile: models.SkinProfile) -> schemas.SkinProfileOut:
    concerns_list: List[str] = []
    if profile.concerns:
        concerns_list = [c for c in profile.concerns.split(",") if c.strip()]
    return schemas.SkinProfileOut(
        id=profile.id,
        skin_type=profile.skin_type,
        concerns=concerns_list,
        sensitivity_notes=profile.sensitivity_notes,
        climate=profile.climate,
        budget_range=profile.budget_range,
    )


def serialize_diary_entry(entry: models.DiaryEntry) -> schemas.DiaryEntryOut:
    issues_list: List[str] = []
    if entry.issues:
        issues_list = [i for i in entry.issues.split(",") if i.strip()]
    return schemas.DiaryEntryOut(
        id=entry.id,
        created_at=entry.created_at,
        rating=entry.rating,
        notes=entry.notes,
        issues=issues_list,
    )

# ---------- Auth endpoints ----------

@app.post("/auth/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # create empty profile row
    profile = models.SkinProfile(user_id=user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return user


@app.post("/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------- Profile endpoints ----------

@app.get("/profile", response_model=schemas.SkinProfileOut)
def get_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.SkinProfile)
        .filter(models.SkinProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        # should not happen; but handle gracefully
        profile = models.SkinProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return serialize_profile(profile)


@app.put("/profile", response_model=schemas.SkinProfileOut)
def update_profile(
    payload: schemas.SkinProfileCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.SkinProfile)
        .filter(models.SkinProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.SkinProfile(user_id=current_user.id)

    profile.skin_type = payload.skin_type
    profile.concerns = ",".join(payload.concerns or [])
    profile.sensitivity_notes = payload.sensitivity_notes
    profile.climate = payload.climate
    profile.budget_range = payload.budget_range

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return serialize_profile(profile)


# ---------- Diary endpoints ----------

@app.post("/diary", response_model=schemas.DiaryEntryOut)
def create_diary_entry(
    payload: schemas.DiaryEntryCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = models.DiaryEntry(
        user_id=current_user.id,
        rating=payload.rating,
        notes=payload.notes,
        issues=",".join(payload.issues or []),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return serialize_diary_entry(entry)


@app.get("/diary", response_model=List[schemas.DiaryEntryOut])
def list_diary_entries(
    limit: int = 10,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(models.DiaryEntry)
        .filter(models.DiaryEntry.user_id == current_user.id)
        .order_by(models.DiaryEntry.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_diary_entry(e) for e in entries]


# ---------- Helper: build user_context for ADK ----------

def build_user_context(user: models.User, profile: models.SkinProfile, diary_entries: List[models.DiaryEntry]) -> str:
    concerns = (profile.concerns or "").split(",") if profile.concerns else []
    issues_texts = []
    for e in diary_entries:
        issues = (e.issues or "").split(",") if e.issues else []
        issues_texts.append(
            f"- {e.created_at.isoformat()} | rating={e.rating}, issues={issues}, notes={e.notes}"
        )

    ctx = [
        f"User name: {user.full_name or user.email}",
        f"Skin type: {profile.skin_type}",
        f"Concerns: {concerns}",
        f"Sensitivity notes: {profile.sensitivity_notes}",
        f"Climate: {profile.climate}",
        f"Budget: {profile.budget_range}",
        "",
        "Recent diary entries:",
        *issues_texts,
    ]
    return "\n".join(ctx)


# ---------- Chat endpoint (ADK) ----------

@app.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_skincoach(
    payload: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(models.SkinProfile)
        .filter(models.SkinProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        profile = models.SkinProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    diary_entries = (
        db.query(models.DiaryEntry)
        .filter(models.DiaryEntry.user_id == current_user.id)
        .order_by(models.DiaryEntry.created_at.desc())
        .limit(7)
        .all()
    )

    user_context = build_user_context(current_user, profile, diary_entries)

    session_id = payload.session_id or str(uuid.uuid4())
    response_text = await run_skincoach(
        message=payload.message,
        user_context=user_context,
        user_id=str(current_user.id),
        session_id=session_id,
    )

    return schemas.ChatResponse(response=response_text)
