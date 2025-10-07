from fastapi import HTTPException
from models import User
from datetime import datetime

# Send Request
def send_friend_request_logic(sender_username: str, receiver_username: str):
    try:
        if sender_username == receiver_username:
            raise HTTPException(status_code=400, detail="You can't add yourself")

        sender = User.nodes.get_or_none(username=sender_username)
        receiver = User.nodes.get_or_none(username=receiver_username)
        
        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="User not found")

        # Check existing friendship
        friends_usernames = [f.username for f in sender.friends]
        if receiver.username in friends_usernames:
            raise HTTPException(status_code=400, detail="Already friends")

        # Check existing pending request
        sent_usernames = [u.username for u in sender.sent_requests]
        received_usernames = [u.username for u in receiver.sent_requests]
        if receiver.username in sent_usernames or sender.username in received_usernames:
            raise HTTPException(status_code=400, detail="Request already exists")

        # Connect without properties (simplified)
        sender.sent_requests.connect(receiver)
        return {"message": "Friend request sent"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in send_friend_request_logic: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send friend request: {str(e)}")


# Accept Request
def accept_friend_request_logic(receiver_username: str, sender_username: str):
    sender = User.nodes.get_or_none(username=sender_username)
    receiver = User.nodes.get_or_none(username=receiver_username)
    
    if not sender or not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure there's a pending request
    sent_usernames = [u.username for u in sender.sent_requests]
    if receiver.username not in sent_usernames:
        raise HTTPException(status_code=404, detail="No pending request found")

    # Delete request and create friendship
    sender.sent_requests.disconnect(receiver)
    sender.friends.connect(receiver)
    receiver.friends.connect(sender)

    return {"message": "Friend request accepted"}


# Reject Request
def reject_friend_request_logic(receiver_username: str, sender_username: str):
    sender = User.nodes.get_or_none(username=sender_username)
    receiver = User.nodes.get_or_none(username=receiver_username)
    
    if not sender or not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    sent_usernames = [u.username for u in sender.sent_requests]
    if receiver.username not in sent_usernames:
        raise HTTPException(status_code=404, detail="No pending request found")

    sender.sent_requests.disconnect(receiver)
    return {"message": "Friend request rejected"}


# Get Pending Requests
def get_pending_requests_logic(username: str):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pending_requests = []
    for sender in user.received_requests:
        pending_requests.append({
            "username": sender.username,
            "profile_picture": getattr(sender, 'profile_picture', None),
        })

    return pending_requests


# Get Friends List
def get_friends_logic(username: str):
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return [{"username": f.username, "profile_picture": getattr(f, 'profile_picture', None), "bio": getattr(f, 'bio', None)} for f in user.friends]

# Get All Users (for sending friend requests)
def get_all_users_logic(current_username: str):
    current_user = User.nodes.get_or_none(username=current_username)
    if not current_user:
        return []
    
    all_users = User.nodes.all()
    friends = [f.username for f in current_user.friends]
    sent_requests = [u.username for u in current_user.sent_requests]
    received_requests = [u.username for u in current_user.received_requests]
    
    users_list = []
    for user in all_users:
        if user.username == current_username:
            continue
        
        status = "none"
        if user.username in friends:
            status = "friends"
        elif user.username in sent_requests:
            status = "pending_sent"
        elif user.username in received_requests:
            status = "pending_received"
        
        users_list.append({
            "username": user.username,
            "profile_picture": getattr(user, 'profile_picture', None),
            "bio": getattr(user, 'bio', None),
            "status": status
        })
    
    return users_list
