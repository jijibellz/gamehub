# Video Call Testing Guide

## ⚠️ Important: You Need TWO Different Users

Video calls require **two separate browser sessions** with **different users**. You cannot test with yourself in the same browser!

---

## 🧪 Proper Testing Setup

### Option 1: Two Browser Windows (Recommended)

1. **Window 1 - Regular Browser:**
   - Open `http://localhost:5173`
   - Register/Login as **User A** (e.g., "alice")
   - Join server → channel → Video tab → Join Video Call

2. **Window 2 - Incognito/Private Window:**
   - Open `http://localhost:5173` in **Incognito/Private mode**
   - Register/Login as **User B** (e.g., "bob")
   - Join **same server** → **same channel** → Video tab → Join Video Call

### Option 2: Two Different Browsers

1. **Chrome:**
   - Login as User A
   - Join channel → Video call

2. **Firefox/Edge:**
   - Login as User B
   - Join **same channel** → Video call

### Option 3: Two Devices

1. **Your Computer:**
   - Login as User A
   - Join channel → Video call

2. **Your Phone/Tablet:**
   - Open `http://YOUR_IP:5173` (find your local IP with `ifconfig` or `ipconfig`)
   - Login as User B
   - Join **same channel** → Video call

---

## 📋 Pre-Flight Checklist

Before testing, verify:

- [ ] **Socket.IO server running** on port 5000
  ```bash
  cd /home/jiji/Desktop/gamehub/backend
  node server.js
  # Should see: "Signaling server running on port 5000"
  ```

- [ ] **FastAPI server running** on port 8000
  ```bash
  cd /home/jiji/Desktop/gamehub/backend
  source venv/bin/activate
  uvicorn main:app --reload --host 127.0.0.1 --port 8000
  ```

- [ ] **Frontend running** on port 5173
  ```bash
  cd /home/jiji/Desktop/gamehub/frontend
  npm run dev
  ```

- [ ] **Two different users registered** in the database

- [ ] **Same server and channel** for both users

---

## 🔍 What to Look For in Console

### When User A Joins:
```
Cannot join video call: currentUser is undefined  ❌ BAD
✅ User joined video room                         ✅ GOOD
```

### When User B Joins (User A should see):
```
🆕 New user joined: bob socketId: xyz123
📤 Sending offer to xyz123
📥 Received answer from xyz123
🧊 Received ICE candidate from xyz123
🧊 ICE state with xyz123: checking
🧊 ICE state with xyz123: connected  ✅ SUCCESS!
🔗 Connection state with xyz123: connected
📹 Received remote track from xyz123
```

### When User B Joins (User B should see):
```
📥 Received offer from abc456
📤 Sending answer to abc456
🧊 Received ICE candidate from abc456
🧊 ICE state with abc456: checking
🧊 ICE state with abc456: connected  ✅ SUCCESS!
🔗 Connection state with abc456: connected
📹 Received remote track from abc456
```

---

## ❌ Common Errors & Fixes

### "ICE failed" / "Connection failed"

**Possible Causes:**
1. **Same user in both tabs** → Use different users!
2. **Not in same channel** → Both must join exact same channel
3. **Firewall blocking** → Try on different network
4. **TURN server down** → Normal, STUN should work on local network

**Quick Test - Same Computer:**
If both users are on the same computer (different browser windows), STUN servers alone should work. TURN is only needed for different networks.

### "No peer connection found"

**Cause:** Signaling order issue

**Fix:** 
1. Make sure Socket.IO server is running
2. Both users should join the video call within ~30 seconds of each other
3. Check Socket.IO server console for connection logs

### "User left" immediately after joining

**Cause:** Self-connection attempt

**Fix:** Already handled in code - should see "⚠️ Ignoring self-connection"

---

## 🎯 Expected Behavior

### Successful Connection:

1. **User A joins:**
   - Sees own video (muted)
   - Waiting for others...

2. **User B joins:**
   - **User A sees:** User B's video appears (with audio)
   - **User B sees:** User A's video appears (with audio)

3. **Both users can:**
   - See each other's video
   - Hear each other's audio
   - Click "Leave Call" to disconnect

---

## 🐛 Debugging Steps

### 1. Check Socket.IO Server Console

Should see:
```
User connected: abc123
Socket abc123 joined channel: MyChannel
User connected: xyz456
Socket xyz456 joined channel: MyChannel
```

### 2. Check Browser Console (Both Windows)

Look for the emoji logs:
- 🆕 New user joined
- 📤 Sending offer/answer
- 📥 Received offer/answer
- 🧊 ICE candidates
- 📹 Remote track received

### 3. Check about:webrtc (Chrome)

1. Open `chrome://webrtc-internals/` in Chrome
2. Join video call
3. Look for:
   - Active peer connections
   - ICE candidate pairs
   - Connection state: "connected"

---

## 💡 Tips

- **Local Network Testing:** STUN servers should be enough
- **Different Networks:** TURN server needed (may fail if server is down)
- **Permissions:** Grant camera/mic when prompted
- **Refresh:** If stuck, refresh both browsers and rejoin
- **Check Logs:** Console logs will tell you exactly what's happening

---

## ✅ Success Criteria

- [ ] Both users see each other's video
- [ ] Both users hear each other's audio
- [ ] Console shows "connected" state
- [ ] No errors in console
- [ ] "Leave Call" button works

If you see all of these, your video call is working perfectly! 🎉
