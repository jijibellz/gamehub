# routes/chat_routes.py
from fastapi import APIRouter
from controllers import chat  # your CRUD + websocket logic lives there

router = APIRouter(prefix="/chat", tags=["Chat"])
router.include_router(chat.router)
