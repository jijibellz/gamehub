"""
Socket.IO server for real-time chat functionality
Integrates with FastAPI using python-socketio
"""
import socketio
from typing import Dict, Set

# Create Socket.IO server with ASGI support
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        "https://gamehubjiji-044p.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    logger=True,
    engineio_logger=True
)

# Track which users are in which channels
# Format: {socket_id: {"serverName": str, "channelName": str}}
active_connections: Dict[str, dict] = {}

# Track channel rooms
# Format: {f"{serverName}:{channelName}": Set[socket_id]}
channel_rooms: Dict[str, Set[str]] = {}


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"🔌 Client connected: {sid}")
    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"🔌 Client disconnected: {sid}")
    
    # Remove from active connections and rooms
    if sid in active_connections:
        conn_info = active_connections[sid]
        room_key = f"{conn_info['serverName']}:{conn_info['channelName']}"
        
        if room_key in channel_rooms:
            channel_rooms[room_key].discard(sid)
            if not channel_rooms[room_key]:
                del channel_rooms[room_key]
        
        del active_connections[sid]


@sio.event
async def join_channel(sid, data):
    """
    Handle user joining a channel
    Expected data: {"serverName": str, "channelName": str}
    """
    try:
        server_name = data.get("serverName")
        channel_name = data.get("channelName")
        
        if not server_name or not channel_name:
            print(f"❌ Invalid join_channel data from {sid}: {data}")
            return
        
        room_key = f"{server_name}:{channel_name}"
        
        # Leave previous room if any
        if sid in active_connections:
            old_room = f"{active_connections[sid]['serverName']}:{active_connections[sid]['channelName']}"
            await sio.leave_room(sid, old_room)
            if old_room in channel_rooms:
                channel_rooms[old_room].discard(sid)
        
        # Join new room
        await sio.enter_room(sid, room_key)
        active_connections[sid] = {
            "serverName": server_name,
            "channelName": channel_name
        }
        
        if room_key not in channel_rooms:
            channel_rooms[room_key] = set()
        channel_rooms[room_key].add(sid)
        
        print(f"✅ {sid} joined {room_key} (total: {len(channel_rooms[room_key])} users)")
        
    except Exception as e:
        print(f"❌ Error in join_channel: {e}")


@sio.event
async def leave_channel(sid, data):
    """
    Handle user leaving a channel
    Expected data: {"serverName": str, "channelName": str}
    """
    try:
        server_name = data.get("serverName")
        channel_name = data.get("channelName")
        
        if not server_name or not channel_name:
            return
        
        room_key = f"{server_name}:{channel_name}"
        
        await sio.leave_room(sid, room_key)
        
        if room_key in channel_rooms:
            channel_rooms[room_key].discard(sid)
            if not channel_rooms[room_key]:
                del channel_rooms[room_key]
        
        if sid in active_connections:
            del active_connections[sid]
        
        print(f"👋 {sid} left {room_key}")
        
    except Exception as e:
        print(f"❌ Error in leave_channel: {e}")


@sio.event
async def new_message(sid, data):
    """
    Broadcast a new message to all users in the channel
    Expected data: {
        "serverName": str,
        "channelName": str,
        "message": {
            "id": str,
            "user": str,
            "profile_picture": str,
            "type": str,
            "content": str,
            "timestamp": str
        }
    }
    """
    try:
        server_name = data.get("serverName")
        channel_name = data.get("channelName")
        message = data.get("message")
        
        if not server_name or not channel_name or not message:
            print(f"❌ Invalid new_message data from {sid}: {data}")
            return
        
        room_key = f"{server_name}:{channel_name}"
        
        # Broadcast to all users in the room (including sender)
        await sio.emit("message-received", message, room=room_key)
        
        print(f"📨 Message broadcast to {room_key}: {message.get('user')} - {message.get('type')}")
        
    except Exception as e:
        print(f"❌ Error in new_message: {e}")


# Create ASGI app that combines Socket.IO with FastAPI
def create_socketio_app(fastapi_app):
    """
    Wraps FastAPI app with Socket.IO
    """
    return socketio.ASGIApp(
        sio,
        other_asgi_app=fastapi_app,
        socketio_path='/socket.io'
    )
