from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ---------- Game ----------
class GameBase(BaseModel):
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    play_url: Optional[str] = None
    source: str

class GameCreate(GameBase):
    external_id: str

class GameResponse(GameBase):
    external_id: str
    created_at: datetime

    class Config:
        orm_mode = True


# ---------- User ----------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str

    class Config:
        orm_mode = True


# ---------- Chat / Messages ----------
class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    username: str
    channel_id: str

class MessageResponse(MessageBase):
    username: str
    timestamp: datetime
