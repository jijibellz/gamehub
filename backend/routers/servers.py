# routes/server_routes.py
from fastapi import APIRouter
from controllers import server

router = APIRouter()
router.include_router(server.router)
