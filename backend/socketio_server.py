"""
Socket.IO server for real-time chat + video calls
Integrates with FastAPI using python-socketio
"""
import socketio
from typing import Dict, Set

# Create Socket.IO server with ASGI support
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        "https://gamehubjiji-044p.onrender.com",
        "https://gamehubjijiplease.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    logger=True,
    engineio_logger=False,
)

# ======== ROOM TRACKERS ========
active_connections: Dict[str, dict] = {}  # socket_id → server/channel info
channel_rooms: Dict[str, Set[str]] = {}   # "server:channel" → socket IDs
video_call_rooms: Dict[str, Set[str]] = {}  # roomId → socket IDs


# ======== VIDEO CALL EVENTS ========
@sio.event
async def join_room(sid, data):
    """User joins a video call room."""
    try:
        room_id = data.get("roomId")
        user_id = data.get("userId")

        if not room_id or not user_id:
            print(f"❌ Invalid join_room data from {sid}: {data}")
            return

        # Leave previous rooms (if any)
        for room, members in list(video_call_rooms.items()):
            if sid in members:
                await sio.leave_room(sid, room)
                members.discard(sid)
                if not members:
                    del video_call_rooms[room]

        # Join new room
        await sio.enter_room(sid, room_id)
        video_call_rooms.setdefault(room_id, set()).add(sid)
        print(f"📹 {user_id} ({sid}) joined video room {room_id}")

        # Notify others
        await sio.emit(
            "user-joined",
            {"userId": user_id, "socketId": sid},
            room=room_id,
            skip_sid=sid,
        )

    except Exception as e:
        print(f"❌ Error in join_room: {e}")


@sio.event
async def offer(sid, data):
    """Forward WebRTC offer."""
    try:
        to_socket = data.get("to")
        offer = data.get("offer")

        if not to_socket or not offer:
            print(f"❌ Invalid offer data from {sid}: {data}")
            return

        print(f"📤 Forwarding offer from {sid} to {to_socket}")
        await sio.emit("offer", {"from": sid, "offer": offer}, to=to_socket)

    except Exception as e:
        print(f"❌ Error in offer: {e}")


@sio.event
async def answer(sid, data):
    """Forward WebRTC answer."""
    try:
        to_socket = data.get("to")
        answer = data.get("answer")

        if not to_socket or not answer:
            print(f"❌ Invalid answer data from {sid}: {data}")
            return

        print(f"📤 Forwarding answer from {sid} to {to_socket}")
        await sio.emit("answer", {"from": sid, "answer": answer}, to=to_socket)

    except Exception as e:
        print(f"❌ Error in answer: {e}")


@sio.event
async def ice_candidate(sid, data):
    """Forward ICE candidates."""
    try:
        to_socket = data.get("to")
        candidate = data.get("candidate")

        if not to_socket or not candidate:
            print(f"❌ Invalid ice-candidate data from {sid}: {data}")
            return

        print(f"🧊 Forwarding ICE candidate from {sid} to {to_socket}")
        await sio.emit("ice-candidate", {"from": sid, "candidate": candidate}, to=to_socket)

    except Exception as e:
        print(f"❌ Error in ice_candidate: {e}")


@sio.event
async def leave_room(sid, data):
    """User leaves a video call room."""
    try:
        room_id = data.get("roomId")
        if not room_id:
            return

        await sio.leave_room(sid, room_id)

        if room_id in video_call_rooms:
            video_call_rooms[room_id].discard(sid)
            if not video_call_rooms[room_id]:
                del video_call_rooms[room_id]

        print(f"👋 {sid} left video room {room_id}")
        await sio.emit("user-left", {"socketId": sid}, room=room_id)

    except Exception as e:
        print(f"❌ Error in leave_room: {e}")


# ======== CHAT EVENTS ========
@sio.event
async def join_channel(sid, data):
    """User joins a text chat channel."""
    try:
        server_name = data.get("serverName")
        channel_name = data.get("channelName")
        if not server_name or not channel_name:
            return

        room_key = f"{server_name}:{channel_name}"
        await sio.enter_room(sid, room_key)

        active_connections[sid] = {"serverName": server_name, "channelName": channel_name}
        channel_rooms.setdefault(room_key, set()).add(sid)

        print(f"✅ {sid} joined {room_key} ({len(channel_rooms[room_key])} users)")

    except Exception as e:
        print(f"❌ Error in join_channel: {e}")


@sio.event
async def leave_channel(sid, data):
    """User leaves a text chat channel."""
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

        active_connections.pop(sid, None)
        print(f"👋 {sid} left {room_key}")

    except Exception as e:
        print(f"❌ Error in leave_channel: {e}")


@sio.event
async def new_message(sid, data):
    """Broadcast chat messages."""
    try:
        server_name = data.get("serverName")
        channel_name = data.get("channelName")
        message = data.get("message")

        if not (server_name and channel_name and message):
            print(f"❌ Invalid new_message data from {sid}: {data}")
            return

        room_key = f"{server_name}:{channel_name}"
        await sio.emit("message-received", message, room=room_key)
        print(f"📨 Message broadcast to {room_key}: {message.get('user')}")

    except Exception as e:
        print(f"❌ Error in new_message: {e}")


# ======== CONNECTION EVENTS ========
@sio.event
async def connect(sid, environ):
    print(f"🔌 Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"🔌 Client disconnected: {sid}")

    # Remove from chat channels
    if sid in active_connections:
        info = active_connections.pop(sid)
        room_key = f"{info['serverName']}:{info['channelName']}"
        if room_key in channel_rooms:
            channel_rooms[room_key].discard(sid)
            if not channel_rooms[room_key]:
                del channel_rooms[room_key]

    # Remove from video rooms
    for room_id, members in list(video_call_rooms.items()):
        if sid in members:
            members.discard(sid)
            await sio.emit("user-left", {"socketId": sid}, room=room_id)
            if not members:
                del video_call_rooms[room_id]


# ======== COMBINE WITH FASTAPI ========
def create_socketio_app(fastapi_app):
    """Combine FastAPI with Socket.IO."""
    return socketio.ASGIApp(
        sio, other_asgi_app=fastapi_app, socketio_path="/socket.io"
    )
