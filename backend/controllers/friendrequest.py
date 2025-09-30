from fastapi import HTTPException
from models import User
from datetime import datetime

# Send Request
def send_friend_request_logic(sender_id: str, receiver_id: str):
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="You can't add yourself")

    try:
        sender = User.nodes.get(id=sender_id)
        receiver = User.nodes.get(id=receiver_id)
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")

    # Check existing friendship
    if receiver in sender.friends:
        raise HTTPException(status_code=400, detail="Already friends")

    # Check existing pending request
    if receiver in sender.sent_requests or sender in receiver.sent_requests:
        raise HTTPException(status_code=400, detail="Request already exists")

    sender.sent_requests.connect(receiver, {'status': 'pending', 'createdAt': datetime.utcnow()})
    return {"message": "Friend request sent"}


# Accept Request
def accept_friend_request_logic(receiver_id: str, sender_id: str):
    try:
        sender = User.nodes.get(id=sender_id)
        receiver = User.nodes.get(id=receiver_id)
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure there's a pending request
    rel = sender.sent_requests.relationship(receiver)
    if not rel or rel.status != "pending":
        raise HTTPException(status_code=404, detail="No pending request found")

    # Delete request and create friendship
    sender.sent_requests.disconnect(receiver)
    sender.friends.connect(receiver, {'since': datetime.utcnow()})
    receiver.friends.connect(sender, {'since': datetime.utcnow()})

    return {"message": "Friend request accepted"}


# Reject Request
def reject_friend_request_logic(receiver_id: str, sender_id: str):
    try:
        sender = User.nodes.get(id=sender_id)
        receiver = User.nodes.get(id=receiver_id)
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")

    rel = sender.sent_requests.relationship(receiver)
    if not rel or rel.status != "pending":
        raise HTTPException(status_code=404, detail="No pending request found")

    sender.sent_requests.disconnect(receiver)
    return {"message": "Friend request rejected"}


# Get Pending Requests
def get_pending_requests_logic(user_id: str):
    try:
        user = User.nodes.get(id=user_id)
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")

    pending_requests = []
    for sender in user.received_requests:
        rel = sender.sent_requests.relationship(user)
        if rel and rel.status == "pending":
            pending_requests.append({
                "sender": {"id": sender.id, "username": sender.username},
                "createdAt": rel.createdAt
            })

    return pending_requests


# Get Friends List
def get_friends_logic(user_id: str):
    try:
        user = User.nodes.get(id=user_id)
    except User.DoesNotExist:
        raise HTTPException(status_code=404, detail="User not found")

    return [{"id": f.id, "username": f.username} for f in user.friends]
