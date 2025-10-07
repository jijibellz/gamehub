from fastapi import HTTPException
from models import User, DirectMessage
from datetime import datetime

# Send Direct Message
def send_direct_message_logic(sender_username: str, receiver_username: str, content: str):
    try:
        sender = User.nodes.get_or_none(username=sender_username)
        receiver = User.nodes.get_or_none(username=receiver_username)
        
        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if they are friends
        friends_usernames = [f.username for f in sender.friends]
        if receiver.username not in friends_usernames:
            raise HTTPException(status_code=403, detail="You can only message friends")
        
        # Create and save the direct message
        dm = DirectMessage(content=content).save()
        sender.sent_dms.connect(dm)
        receiver.received_dms.connect(dm)
        
        return {
            "id": dm.element_id,
            "sender": sender_username,
            "receiver": receiver_username,
            "content": content,
            "timestamp": dm.timestamp.isoformat(),
            "sender_profile_picture": getattr(sender, 'profile_picture', None),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending direct message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

# Get Direct Messages between two users
def get_direct_messages_logic(user1: str, user2: str):
    try:
        user1_obj = User.nodes.get_or_none(username=user1)
        user2_obj = User.nodes.get_or_none(username=user2)
        
        if not user1_obj or not user2_obj:
            return []
        
        messages = []
        
        # Get messages sent by user1 to user2
        for dm in user1_obj.sent_dms:
            if user2_obj in dm.receiver:
                messages.append({
                    "id": dm.element_id,
                    "sender": user1,
                    "content": dm.content,
                    "timestamp": dm.timestamp.isoformat(),
                    "sender_profile_picture": getattr(user1_obj, 'profile_picture', None),
                })
        
        # Get messages sent by user2 to user1
        for dm in user2_obj.sent_dms:
            if user1_obj in dm.receiver:
                messages.append({
                    "id": dm.element_id,
                    "sender": user2,
                    "content": dm.content,
                    "timestamp": dm.timestamp.isoformat(),
                    "sender_profile_picture": getattr(user2_obj, 'profile_picture', None),
                })
        
        # Sort by timestamp
        messages.sort(key=lambda x: x['timestamp'])
        return messages
    except Exception as e:
        print(f"❌ Error fetching messages: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
