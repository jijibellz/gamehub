# routes/user_routes.py
from fastapi import APIRouter
from controllers import users  # you’d create this like server_controller

router = APIRouter(prefix="/api/users", tags=["Users"])
router.include_router(users.router)
