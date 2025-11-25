from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]

    class Config:
        from_attributes = True


# Profile
class SkinProfileBase(BaseModel):
    skin_type: Optional[str] = None
    concerns: Optional[List[str]] = None
    sensitivity_notes: Optional[str] = None
    climate: Optional[str] = None
    budget_range: Optional[str] = None


class SkinProfileCreate(SkinProfileBase):
    pass


class SkinProfileOut(SkinProfileBase):
    id: int

    class Config:
        from_attributes = True


# Diary
class DiaryEntryCreate(BaseModel):
    rating: Optional[int] = None
    notes: Optional[str] = None
    issues: Optional[List[str]] = None


class DiaryEntryOut(BaseModel):
    id: int
    created_at: datetime
    rating: Optional[int]
    notes: Optional[str]
    issues: Optional[List[str]]

    class Config:
        from_attributes = True


# Chat
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # can be UUID per browser tab


class ChatResponse(BaseModel):
    response: str
