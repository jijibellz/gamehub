# Troubleshooting Guide - GameHub

## 🔴 CORS Errors with 500 Status Code

**Symptom:**
```
Cross-Origin Request Blocked: CORS header 'Access-Control-Allow-Origin' missing
Status code: 500
```

**Root Cause:** The backend is crashing (500 error), so CORS headers aren't added.

### Common Causes:

#### 1. **Neo4j Database Not Connected** ⚠️ MOST COMMON

**Check:**
```bash
cd /home/jiji/Desktop/gamehub/backend
cat .env
```

**Required `.env` variables:**
```env
NEO4J_HOST=your-neo4j-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password-here
```

**Fix:**
1. Make sure you have a Neo4j Aura instance (free tier at https://neo4j.com/cloud/aura/)
2. Update `.env` with your credentials
3. Restart FastAPI server

#### 2. **Backend Not Restarted After Code Changes**

**Fix:**
```bash
# Stop the current FastAPI server (Ctrl+C)
# Then restart:
cd /home/jiji/Desktop/gamehub/backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

#### 3. **Server/Channel Doesn't Exist in Database**

**Symptom:** Trying to access "Juwalan" server or "Candy crush championship" channel

**Fix:** Create them first via the UI or API:

**Option A - Via Frontend:**
1. Go to Server Feed page
2. Click "Create Server"
3. Name: "Juwalan", Description: anything
4. Check "text", "voice", "video" channel types
5. Click Create

**Option B - Via API (curl):**
```bash
# Create server
curl -X POST http://127.0.0.1:8000/servers/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Juwalan", "description": "Gaming server"}'

# Create channel
curl -X POST http://127.0.0.1:8000/servers/Juwalan/channels \
  -H "Content-Type: application/json" \
  -d '{"name": "Candy crush championship", "type": "voice"}'
```

#### 4. **User Not Registered**

**Fix:** Register/login via the frontend auth form first.

---

## 🔍 Debugging Steps

### Step 1: Check FastAPI Terminal Output

Look for:
```
❌ Error fetching server 'Juwalan': ...
❌ Error fetching messages for Juwalan/Candy crush championship: ...
```

This will tell you the exact error.

### Step 2: Test Database Connection

```bash
cd /home/jiji/Desktop/gamehub/backend
source venv/bin/activate
python3 -c "from neomodel import db; db.cypher_query('RETURN 1'); print('✅ Neo4j connected!')"
```

If this fails, your Neo4j credentials are wrong or the database is down.

### Step 3: Check What Servers Exist

```bash
curl http://127.0.0.1:8000/servers/
```

Should return a JSON array of servers. If empty `[]`, you need to create servers first.

### Step 4: Check Backend Logs

When you start FastAPI, you should see:
```
[ℹ️] Connecting to Neo4j at: neo4j+s://neo4j:***@xxxxx.databases.neo4j.io:7687
[✅] Connected to Neo4j database.
[📁] Uploads directory ready at: /path/to/uploads
```

If you see `[❌] Neo4j connection failed`, fix your `.env` file.

---

## 🚀 Quick Reset

If everything is broken, try this:

```bash
# 1. Stop all servers (Ctrl+C in each terminal)

# 2. Restart FastAPI
cd /home/jiji/Desktop/gamehub/backend
source venv/bin/activate
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 3. Restart Socket.IO (in new terminal)
cd /home/jiji/Desktop/gamehub/backend
node server.js

# 4. Restart Frontend (in new terminal)
cd /home/jiji/Desktop/gamehub/frontend
npm run dev

# 5. Create a test server via frontend
# - Go to http://localhost:5173
# - Register/Login
# - Create Server → name: "TestServer"
# - Enter server → channels should be created automatically
```

---

## 📋 Checklist Before Testing Voice Messages

- [ ] Neo4j database is running and connected
- [ ] `.env` file has correct Neo4j credentials
- [ ] FastAPI server is running on port 8000
- [ ] Socket.IO server is running on port 5000
- [ ] Frontend is running on port 5173
- [ ] You are logged in with a registered user
- [ ] Server exists in database
- [ ] Channel exists in server
- [ ] Browser has microphone permissions granted

---

## 🆘 Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Check FastAPI terminal** for backend errors
3. **Check Network tab** in browser DevTools to see actual response
4. **Verify all 3 servers are running** (FastAPI, Socket.IO, Vite)

If you see specific error messages, they should now be much more descriptive thanks to the error handling we added!
