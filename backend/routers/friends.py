from fastapi import APIRouter, Query
from controllers.friendrequest import (
    send_friend_request_logic,
    accept_friend_request_logic,
    reject_friend_request_logic,
    get_pending_requests_logic,
    get_friends_logic,
    get_all_users_logic
)

router = APIRouter(prefix="/friends", tags=["Friends"])

# ✅ Send Request
@router.post("/request/{receiver_username}")
def send_friend_request(receiver_username: str, sender_username: str = Query(...)):
    return send_friend_request_logic(sender_username, receiver_username)

# ✅ Accept Request
@router.post("/accept/{sender_username}")
def accept_friend_request(sender_username: str, receiver_username: str = Query(...)):
    return accept_friend_request_logic(receiver_username, sender_username)

# ✅ Reject Request
@router.post("/reject/{sender_username}")
def reject_friend_request(sender_username: str, receiver_username: str = Query(...)):
    return reject_friend_request_logic(receiver_username, sender_username)

# ✅ Get Pending Requests
@router.get("/requests")
def get_pending_requests(username: str = Query(...)):
    try:
        return get_pending_requests_logic(username)
    except Exception as e:
        print(f"❌ Error in get_pending_requests: {str(e)}")
        raise

# ✅ Get Friends List
@router.get("/")
def get_friends(username: str = Query(...)):
    try:
        return get_friends_logic(username)
    except Exception as e:
        print(f"❌ Error in get_friends: {str(e)}")
        raise

# ✅ Get All Users (for friend requests)
@router.get("/users")
def get_all_users(username: str = Query(...)):
    try:
        return get_all_users_logic(username)
    except Exception as e:
        print(f"❌ Error in get_all_users: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
