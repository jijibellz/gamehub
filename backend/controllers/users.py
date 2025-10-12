# controllers/user_controller.py
import os
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uuid

from models import User

router = APIRouter(tags=["Users"])

# ===============================
# Security setup
# ===============================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# ===============================
# Pydantic models
# ===============================
class UserCreate(BaseModel):
    username: str
    email: EmailStr | None = None
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None

# ===============================
# Helpers
# ===============================
def user_to_dict(u: User):
    return {
        "username": u.username,
        "email": u.email,
        "profile_picture": u.profile_picture,
        "bio": u.bio,
        "created_at": u.created_at.isoformat() if hasattr(u, 'created_at') and u.created_at else None,
        "servers": [s.name for s in u.servers.all()],
    }

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = User.nodes.get_or_none(username=username)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===============================
# Routes
# ===============================

# Register user
@router.post("/register")
def register_user(user: UserCreate):
    if User.nodes.get_or_none(username=user.username):
        raise HTTPException(status_code=400, detail="User already exists")
    hashed_pw = get_password_hash(user.password)
    new_user = User(username=user.username, email=user.email, password_hash=hashed_pw).save()
    return user_to_dict(new_user)

# Login
@router.post("/login")
def login(user: UserLogin):
    db_user = User.nodes.get_or_none(username=user.username)
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"sub": db_user.username}, access_token_expires)
    
    # Return user data along with token
    user_data = {
        "username": db_user.username,
        "email": db_user.email,
        "profile_picture": getattr(db_user, 'profile_picture', None),
        "bio": getattr(db_user, 'bio', None),
    }
    
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": user_data
    }

# Get all users (protected)
@router.get("/", response_model=List[dict])
def list_users(current_user: User = Depends(get_current_user)):
    users = User.nodes.all()
    return [user_to_dict(u) for u in users]

# Get single user (protected)
@router.get("/{username}")
def get_user(username: str, current_user: User = Depends(get_current_user)):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_dict(user)

# Update user (protected)
@router.put("/{username}")
def update_user(username: str, user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.email:
        user.email = user_update.email
    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)
    user.save()
    return user_to_dict(user)

# Delete user (protected)
@router.delete("/{username}")
def delete_user(username: str, current_user: User = Depends(get_current_user)):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.delete()
    return {"detail": f"User {username} deleted"}

# Current logged-in user profile
@router.get("/me/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)

# Update current user's profile
@router.put("/me/profile")
def update_profile(profile_update: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update current user's profile (username, email, bio)"""
    try:
        # Update username if provided and different
        if profile_update.username and profile_update.username != current_user.username:
            # Check if new username is already taken
            existing_user = User.nodes.get_or_none(username=profile_update.username)
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = profile_update.username
        
        # Update email if provided
        if profile_update.email and profile_update.email != current_user.email:
            # Check if new email is already taken
            existing_user = User.nodes.get_or_none(email=profile_update.email)
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already taken")
            current_user.email = profile_update.email
        
        # Update bio if provided
        if profile_update.bio is not None:
            current_user.bio = profile_update.bio
        
        current_user.save()
        return {"detail": "Profile updated successfully", "user": user_to_dict(current_user)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

# Upload profile picture
@router.post("/me/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a profile picture for the current user"""
    print(f"📸 Profile picture upload request from: {current_user.username}")
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.")
        
        # Create profile_pictures directory
        uploads_dir = "uploads/profile_pictures"
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{current_user.username}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = os.path.join(uploads_dir, unique_filename)
        
        # Delete old profile picture if exists
        if current_user.profile_picture:
            old_file_path = current_user.profile_picture.replace("/uploads/", "uploads/")
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except:
                    pass
        
        # Save new file
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Update user's profile picture URL
        profile_picture_url = f"/uploads/profile_pictures/{unique_filename}"
        current_user.profile_picture = profile_picture_url
        current_user.save()
        
        return {
            "detail": "Profile picture uploaded successfully",
            "profile_picture": profile_picture_url
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading profile picture: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload profile picture: {str(e)}")

# Delete profile picture
@router.delete("/me/profile-picture")
def delete_profile_picture(current_user: User = Depends(get_current_user)):
    """Delete the current user's profile picture"""
    try:
        if not current_user.profile_picture:
            raise HTTPException(status_code=404, detail="No profile picture to delete")
        
        # Delete file from filesystem
        file_path = current_user.profile_picture.replace("/uploads/", "uploads/")
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Remove from database
        current_user.profile_picture = None
        current_user.save()
        
        return {"detail": "Profile picture deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete profile picture: {str(e)}")

# Change password
@router.post("/me/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Change the current user's password"""
    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update to new password
    current_user.password_hash = get_password_hash(new_password)
    current_user.save()
    
    return {"detail": "Password changed successfully"}
