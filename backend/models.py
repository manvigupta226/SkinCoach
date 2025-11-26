from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    profile = relationship("SkinProfile", back_populates="user", uselist=False)
    diary_entries = relationship("DiaryEntry", back_populates="user")
    routines = relationship("SkinRoutine", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")




class SkinProfile(Base):
    __tablename__ = "skin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    skin_type = Column(String, nullable=True)          # oily, dry, combo, sensitive
    concerns = Column(String, nullable=True)           # comma-separated
    sensitivity_notes = Column(String, nullable=True)  # fragrance, alcohol, etc.
    climate = Column(String, nullable=True)            # e.g. "Bangalore, humid"
    budget_range = Column(String, nullable=True)       # e.g. "₹500-1500"

    user = relationship("User", back_populates="profile")


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    rating = Column(Integer, nullable=True)            # 1-5
    notes = Column(Text, nullable=True)
    issues = Column(String, nullable=True)             # e.g. "dryness, redness"

    user = relationship("User", back_populates="diary_entries")

class SkinRoutine(Base):
    __tablename__ = "skin_routines"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Each is a list of {"step": "...", "product_name": "..."}
    am_routine = Column(JSON, nullable=False)
    pm_routine = Column(JSON, nullable=False)

    note = Column(Text, nullable=True)

    user = relationship("User", back_populates="routines")    

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    session_id = Column(String, nullable=True)  # e.g. "chat-<user_id>"
    role = Column(String, nullable=False)       # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")    
