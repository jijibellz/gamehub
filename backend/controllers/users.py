# controllers/user_controller.py
from fastapi import APIRouter, HTTPException
from models import User, Server
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])

# Helper to convert User nodes to dict
def user_to_dict(u: User):
    return {
        "username": u.username,
        "email": u.email,
        "servers": [s.name for s in u.servers.all()],  # just show server names
    }

# Create user
@router.post("/")
def create_user(username: str, email: str = None, password_hash: str = None):
    if User.nodes.get_or_none(username=username):
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(username=username, email=email, password_hash=password_hash).save()
    return user_to_dict(user)

# Read all users
@router.get("/", response_model=List[dict])
def list_users():
    users = User.nodes.all()
    return [user_to_dict(u) for u in users]

# Read single user
@router.get("/{username}")
def get_user(username: str):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_dict(user)

# Update user
@router.put("/{username}")
def update_user(username: str, email: str = None, password_hash: str = None):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if email:
        user.email = email
    if password_hash:
        user.password_hash = password_hash
    user.save()
    return user_to_dict(user)

# Delete user
@router.delete("/{username}")
def delete_user(username: str):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.delete()
    return {"detail": f"User {username} deleted"}
