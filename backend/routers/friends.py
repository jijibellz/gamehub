from fastapi import APIRouter, Query
from controllers.friendrequest import (
    send_friend_request_logic,
    accept_friend_request_logic,
    reject_friend_request_logic,
    get_pending_requests_logic,
    get_friends_logic
)

router = APIRouter(prefix="/friends", tags=["Friends"])

# ✅ Send Request
@router.post("/request/{receiver_id}")
async def send_friend_request(sender_id: str = Query(...), receiver_id: str = None):
    return await send_friend_request_logic(sender_id, receiver_id)

# ✅ Accept Request
@router.post("/accept/{sender_id}")
async def accept_friend_request(receiver_id: str = Query(...), sender_id: str = None):
    return await accept_friend_request_logic(receiver_id, sender_id)

# ✅ Reject Request
@router.post("/reject/{sender_id}")
async def reject_friend_request(receiver_id: str = Query(...), sender_id: str = None):
    return await reject_friend_request_logic(receiver_id, sender_id)

# ✅ Get Pending Requests
@router.get("/requests")
async def get_pending_requests(user_id: str = Query(...)):
    return await get_pending_requests_logic(user_id)

# ✅ Get Friends List
@router.get("/")
async def get_friends(user_id: str = Query(...)):
    return await get_friends_logic(user_id)
