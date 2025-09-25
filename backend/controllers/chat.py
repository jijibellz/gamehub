# controllers/chat_controller.py
from fastapi import APIRouter, HTTPException
from models import Channel, Message, User, Server
from typing import List

router = APIRouter(prefix="/chat", tags=["Chat"])

def message_to_dict(m: Message):
    return {
        "content": m.content,
        "timestamp": m.timestamp.isoformat(),
        "sender": [u.username for u in m.sender][0] if m.sender else None,
        "channel": [c.name for c in m.channel][0] if m.channel else None,
    }

def channel_to_dict(c: Channel):
    return {
        "name": c.name,
        "server": [s.name for s in c.server][0] if c.server else None,
        "messages": [message_to_dict(m) for m in c.messages],
    }

# Create channel
@router.post("/channel")
def create_channel(name: str, server_name: str):
    if Channel.nodes.get_or_none(name=name):
        raise HTTPException(status_code=400, detail="Channel already exists")
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    channel = Channel(name=name).save()
    server.channels.connect(channel)
    return channel_to_dict(channel)

# List channels
@router.get("/channels", response_model=List[dict])
def list_channels():
    channels = Channel.nodes.all()
    return [channel_to_dict(c) for c in channels]

# Create message
@router.post("/message")
def create_message(content: str, sender_username: str, channel_name: str):
    sender = User.nodes.get_or_none(username=sender_username)
    channel = Channel.nodes.get_or_none(name=channel_name)
    if not sender or not channel:
        raise HTTPException(status_code=404, detail="Sender or channel not found")
    message = Message(content=content).save()
    message.sender.connect(sender)
    message.channel.connect(channel)
    return message_to_dict(message)

# List messages in channel
@router.get("/messages/{channel_name}")
def list_messages(channel_name: str):
    channel = Channel.nodes.get_or_none(name=channel_name)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return [message_to_dict(m) for m in channel.messages]

# Delete message
@router.delete("/message/{message_id}")
def delete_message(message_id: str):
    message = Message.nodes.get_or_none(id=message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    message.delete()
    return {"detail": "Message deleted"}
