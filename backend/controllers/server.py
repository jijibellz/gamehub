from fastapi import APIRouter, HTTPException, UploadFile, File
from models import Server, User, Channel, Message
from typing import List
from fastapi import Body
from pydantic import BaseModel
import os
from fastapi import Form

router = APIRouter(prefix="/servers", tags=["Servers"])

# -------------------- Pydantic models --------------------
class ServerCreate(BaseModel):
    name: str
    description: str = ""

class ChannelCreate(BaseModel):
    name: str
    type: str = "text"

# -------------------- Helper --------------------
def server_to_dict(s: Server):
    return {
        "name": s.name,
        "description": s.description,
        "members": [m.username for m in s.members],
        "channels": [
            {"name": c.name, "type": getattr(c, "type", "text")}
            for c in s.channels
        ],
    }

# -------------------- Server Routes --------------------
@router.post("/")
def create_server(server_data: ServerCreate):
    if Server.nodes.get_or_none(name=server_data.name):
        raise HTTPException(status_code=400, detail="Server already exists")
    server = Server(name=server_data.name, description=server_data.description).save()
    return server_to_dict(server)

@router.get("/", response_model=List[dict])
def list_servers():
    servers = Server.nodes.all()
    return [server_to_dict(s) for s in servers]

@router.get("/{name}")
def get_server(name: str):
    try:
        server = Server.nodes.get_or_none(name=name)
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        return server_to_dict(server)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching server '{name}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{name}")
def update_server(name: str, description: str = None):
    server = Server.nodes.get_or_none(name=name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if description:
        server.description = description
        server.save()
    return server_to_dict(server)

@router.delete("/{name}")
def delete_server(name: str):
    server = Server.nodes.get_or_none(name=name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server.delete()
    return {"detail": f"Server {name} deleted"}

# -------------------- Membership Routes --------------------
@router.post("/{server_name}/join")
def join_server(server_name: str, username: str):
    """User joins a server to become a member"""
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    if user in server.members:
        return {"detail": "Already a member", "is_member": True}
    
    # Add user as member
    user.servers.connect(server)
    
    return {"detail": f"Successfully joined {server_name}", "is_member": True}

@router.post("/{server_name}/leave")
def leave_server(server_name: str, username: str):
    """User leaves a server"""
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    user = User.nodes.get_or_none(username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove membership
    if user in server.members:
        user.servers.disconnect(server)
        return {"detail": f"Left {server_name}", "is_member": False}
    
    return {"detail": "Not a member", "is_member": False}

@router.get("/{server_name}/is_member/{username}")
def check_membership(server_name: str, username: str):
    """Check if user is a member of the server"""
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    user = User.nodes.get_or_none(username=username)
    if not user:
        return {"is_member": False}
    
    is_member = user in server.members
    return {"is_member": is_member, "username": username, "server": server_name}

# -------------------- Channel Routes --------------------
@router.post("/{server_name}/channels")
def create_channel(server_name: str, channel: ChannelCreate = Body(...)):
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if channel.type not in ["text", "voice", "video"]:
        raise HTTPException(status_code=400, detail="Invalid channel type")

    new_channel = Channel(name=channel.name, type=channel.type).save()
    server.channels.connect(new_channel)

    return {"name": new_channel.name, "type": new_channel.type}

@router.get("/{server_name}/channels")
def list_channels(server_name: str):
    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return [{"name": c.name, "type": getattr(c, "type", "text")} for c in server.channels]

# -------------------- Message Routes (server + channel) --------------------
@router.post("/{server_name}/channels/{channel_name}/messages")
def create_message(
    server_name: str,
    channel_name: str,
    data: dict = Body(...),
):
    sender_username = data.get("sender_username")
    content = data.get("content")
    type = data.get("type", "text")

    server = Server.nodes.get_or_none(name=server_name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    channel = next((c for c in server.channels if c.name == channel_name), None)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    sender = User.nodes.get_or_none(username=sender_username)
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    
    # ✅ Check if user is a member of the server
    if sender not in server.members:
        raise HTTPException(status_code=403, detail="You must join this server to send messages")

    message = Message(content=content, type=type).save()
    channel.messages.connect(message)
    sender.messages.connect(message)

    return {
        "content": message.content,
        "type": message.type,
        "timestamp": message.timestamp,
        "sender": sender.username,
        "profile_picture": sender.profile_picture,
        "channel": channel.name,
        "server": server.name,
    }

@router.get("/{server_name}/channels/{channel_name}/messages")
def list_messages(server_name: str, channel_name: str):
    try:
        server = Server.nodes.get_or_none(name=server_name)
        if not server:
            raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
        channel = next((c for c in server.channels if c.name == channel_name), None)
        if not channel:
            raise HTTPException(status_code=404, detail=f"Channel '{channel_name}' not found in server '{server_name}'")
        messages = []
        for m in channel.messages:
            sender_user = [u for u in m.sender][0] if m.sender else None
            messages.append({
                "content": m.content,
                "type": m.type,
                "timestamp": m.timestamp,
                "sender": sender_user.username if sender_user else None,
                "profile_picture": sender_user.profile_picture if sender_user else None
            })
        return messages
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching messages for {server_name}/{channel_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# -------------------- Voice Message Upload --------------------
@router.post("/{server_name}/channels/{channel_name}/voice")
async def upload_voice_message(
    server_name: str,
    channel_name: str,
    sender_username: str = Form(...),  # ✅ must use Form
    audio: UploadFile = File(...)
):
    try:
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)

        # verify relationships BEFORE saving file
        server = Server.nodes.get_or_none(name=server_name)
        if not server:
            raise HTTPException(status_code=404, detail=f"Server '{server_name}' not found")
        
        channel = next((c for c in server.channels if c.name == channel_name), None)
        if not channel:
            raise HTTPException(status_code=404, detail=f"Channel '{channel_name}' not found in server '{server_name}'")
        
        sender = User.nodes.get_or_none(username=sender_username)
        if not sender:
            raise HTTPException(status_code=404, detail=f"User '{sender_username}' not found")
        
        # ✅ Check if user is a member of the server
        if sender not in server.members:
            raise HTTPException(status_code=403, detail="You must join this server to send voice messages")

        # save file
        file_path = os.path.join(uploads_dir, audio.filename)
        with open(file_path, "wb") as f:
            f.write(await audio.read())

        # create message node linked to file
        file_url = f"/uploads/{audio.filename}"
        message = Message(content=file_url, type="voice").save()
        channel.messages.connect(message)
        sender.messages.connect(message)

        return {
            "message": "Voice message uploaded",
            "file_url": file_url,
            "sender": sender.username,
            "profile_picture": sender.profile_picture,
            "channel": channel_name,
            "server": server_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in voice upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
