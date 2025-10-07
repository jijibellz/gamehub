from fastapi import APIRouter, Query, Body
from controllers.direct_message import (
    send_direct_message_logic,
    get_direct_messages_logic
)

router = APIRouter(prefix="/direct-messages", tags=["Direct Messages"])

# Send a direct message
@router.post("/send")
def send_direct_message(
    sender_username: str = Query(...),
    receiver_username: str = Query(...),
    data: dict = Body(...)
):
    content = data.get("content", "")
    return send_direct_message_logic(sender_username, receiver_username, content)

# Get messages between two users
@router.get("/")
def get_direct_messages(
    user1: str = Query(...),
    user2: str = Query(...)
):
    return get_direct_messages_logic(user1, user2)
