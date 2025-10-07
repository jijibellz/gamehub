# Server Membership System

## 🎯 Overview

Users must now **join a server** before they can send messages or interact with channels. This prevents unauthorized access and creates a proper membership system.

---

## ✨ Features

### Backend (FastAPI)

1. **Membership Endpoints:**
   - `POST /servers/{server_name}/join?username={username}` - Join a server
   - `POST /servers/{server_name}/leave?username={username}` - Leave a server
   - `GET /servers/{server_name}/is_member/{username}` - Check membership status

2. **Access Control:**
   - Text messages require membership (403 error if not a member)
   - Voice messages require membership (403 error if not a member)
   - Membership checked before allowing any communication

3. **Database Relationships:**
   - Uses existing Neo4j `MEMBER_OF` relationship
   - User ↔ Server bidirectional relationship

### Frontend (React)

1. **Join Server UI:**
   - Welcome screen when entering a server as non-member
   - Large "Join Server" button
   - Blocks access to channels until joined

2. **Member Status Display:**
   - "✓ Member" badge in server sidebar
   - "Leave" button for members
   - Real-time membership checking

3. **Error Handling:**
   - Friendly alerts when trying to send without membership
   - Automatic membership check on page load
   - Graceful handling of 403 errors

---

## 🚀 How It Works

### User Flow:

1. **User enters a server:**
   - System checks if user is a member
   - Shows "Checking membership..." loading state

2. **If NOT a member:**
   - Displays welcome screen
   - Shows "Join Server" button
   - Hides channels and chat interface

3. **User clicks "Join Server":**
   - POST request to `/servers/{server}/join`
   - User added to server members
   - UI updates to show member status
   - Channels and chat become accessible

4. **User sends a message:**
   - Backend checks membership
   - If member: message sent successfully
   - If not member: 403 error with friendly message

5. **User can leave:**
   - Click "Leave" button in sidebar
   - Membership removed
   - Returns to welcome screen

---

## 🔧 Technical Implementation

### Backend Changes (`backend/controllers/server.py`)

```python
# New membership endpoints
@router.post("/{server_name}/join")
def join_server(server_name: str, username: str):
    # Add user to server.members
    user.servers.connect(server)
    return {"is_member": True}

@router.post("/{server_name}/leave")
def leave_server(server_name: str, username: str):
    # Remove user from server.members
    user.servers.disconnect(server)
    return {"is_member": False}

@router.get("/{server_name}/is_member/{username}")
def check_membership(server_name: str, username: str):
    # Check if user in server.members
    return {"is_member": bool}

# Updated message endpoints
@router.post("/{server_name}/channels/{channel_name}/messages")
def create_message(...):
    # ✅ NEW: Check membership
    if sender not in server.members:
        raise HTTPException(403, "You must join this server")
    # ... rest of logic

# Updated voice upload
@router.post("/{server_name}/channels/{channel_name}/voice")
async def upload_voice_message(...):
    # ✅ NEW: Check membership
    if sender not in server.members:
        raise HTTPException(403, "You must join this server")
    # ... rest of logic
```

### Frontend Changes

**Routes (`frontend/src/api/routes.js`):**
```javascript
JOIN_SERVER: (serverName) => `${API_BASE_URL}/servers/${serverName}/join`,
LEAVE_SERVER: (serverName) => `${API_BASE_URL}/servers/${serverName}/leave`,
CHECK_MEMBERSHIP: (serverName, username) => 
  `${API_BASE_URL}/servers/${serverName}/is_member/${username}`,
```

**ChannelPage (`frontend/src/pages/ChannelPage.jsx`):**
```javascript
// State
const [isMember, setIsMember] = useState(false);
const [checkingMembership, setCheckingMembership] = useState(true);

// Check membership on load
useEffect(() => {
  const res = await axios.get(ROUTES.CHECK_MEMBERSHIP(serverName, username));
  setIsMember(res.data.is_member);
}, [serverName, currentUser]);

// Join/Leave handlers
const handleJoinServer = async () => {
  await axios.post(ROUTES.JOIN_SERVER(serverName), null, {
    params: { username: currentUser.username }
  });
  setIsMember(true);
};

// Conditional rendering
{!isMember ? (
  <WelcomeScreen with JoinButton />
) : (
  <ServerChat />
)}
```

**ServerChat (`frontend/src/components/ServerChat.jsx`):**
```javascript
// Error handling for 403
catch (err) {
  if (err.response?.status === 403) {
    alert("You must join this server to send messages!");
  }
}
```

---

## 📋 API Reference

### Join Server
```http
POST /servers/{server_name}/join?username={username}

Response:
{
  "detail": "Successfully joined ServerName",
  "is_member": true
}
```

### Leave Server
```http
POST /servers/{server_name}/leave?username={username}

Response:
{
  "detail": "Left ServerName",
  "is_member": false
}
```

### Check Membership
```http
GET /servers/{server_name}/is_member/{username}

Response:
{
  "is_member": true,
  "username": "john",
  "server": "ServerName"
}
```

### Send Message (with membership check)
```http
POST /servers/{server_name}/channels/{channel_name}/messages

Body:
{
  "sender_username": "john",
  "content": "Hello!",
  "type": "text"
}

Success (200):
{
  "content": "Hello!",
  "type": "text",
  "timestamp": "2025-10-07T...",
  "sender": "john"
}

Error (403):
{
  "detail": "You must join this server to send messages"
}
```

---

## 🎨 UI/UX

### Welcome Screen (Non-Member)
```
┌─────────────────────────────────────┐
│                                     │
│     Welcome to ServerName!          │
│                                     │
│  You need to join this server to   │
│  view channels and send messages.  │
│                                     │
│        [ Join Server ]              │
│                                     │
└─────────────────────────────────────┘
```

### Member View
```
┌─────────────────────────────────────┐
│ ServerName                          │
│ ✓ Member              [Leave]       │
│                                     │
│ Channels                      [+]   │
│ # general                           │
│ # voice                             │
│ # video                             │
└─────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] **Restart FastAPI server** (required for backend changes)
- [ ] Non-member sees welcome screen
- [ ] Join button works and updates UI
- [ ] Member can send text messages
- [ ] Member can send voice messages
- [ ] Non-member gets 403 error with alert
- [ ] Leave button works
- [ ] After leaving, returns to welcome screen
- [ ] Membership persists across page refreshes
- [ ] Multiple users can join same server
- [ ] Member badge displays correctly

---

## 🔒 Security Benefits

1. **Access Control:** Only members can communicate
2. **Explicit Consent:** Users must actively join
3. **Audit Trail:** Membership tracked in database
4. **Scalability:** Easy to add roles/permissions later

---

## 🚀 Future Enhancements

- [ ] Server roles (admin, moderator, member)
- [ ] Invite-only servers
- [ ] Kick/ban functionality
- [ ] Member list display
- [ ] Join requests/approval system
- [ ] Server discovery page (public vs private)
- [ ] Member count display
- [ ] Welcome message for new members

---

## 🐛 Troubleshooting

### "Failed to join server"
- Check if user is logged in
- Verify server exists
- Check FastAPI logs for errors
- Ensure backend is restarted

### Still can send messages without joining
- **Restart FastAPI server** (most common issue)
- Check if membership check is in place
- Verify Neo4j relationships

### Membership check stuck on "Checking..."
- Check network tab for API errors
- Verify user is logged in
- Check if server exists

---

**Remember to restart the FastAPI server for all backend changes to take effect!**

```bash
cd /home/jiji/Desktop/gamehub/backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
