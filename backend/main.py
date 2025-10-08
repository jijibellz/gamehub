# main.py
import os
import time
import threading
import config  # sets neomodel_config.DATABASE_URL BEFORE any db use

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import users, friends, games, servers, chat, direct_messages
from neomodel import db, config as neoconfig
from neo4j.exceptions import ServiceUnavailable, AuthError

app = FastAPI(title="🎮 GameHub Backend")

# =========================
# CORS setup
# =========================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://gamehubjiji-044p.onrender.com", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Uploads setup
# =========================
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# =========================
# Serve React frontend
# =========================
frontend_build_dir = os.path.join(os.path.dirname(__file__), "frontend", "build")
if os.path.exists(frontend_build_dir):
    # Static files (JS, CSS, images)
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build_dir, "static")), name="static")
else:
    print("[⚠️] React build folder not found. Run `npm run build` in the frontend folder.")

# =========================
# Include API routers
# =========================
app.include_router(users.router)
app.include_router(friends.router, prefix="/api")
app.include_router(direct_messages.router, prefix="/api")
app.include_router(games.router, prefix="/games", tags=["Games"])
app.include_router(servers.router)
app.include_router(chat.router)

# =========================
# Neo4j heartbeat thread
# =========================
def keep_neo4j_alive():
    while True:
        try:
            db.cypher_query("RETURN 1")
            print("🩵 Neo4j heartbeat OK")
        except Exception as e:
            print("⚠️ Lost connection to Neo4j Aura, attempting reconnect:", e)
            try:
                neoconfig.DATABASE_URL = os.getenv("NEO4J_URI") or config.neomodel_config.DATABASE_URL
                db.set_connection(neoconfig.DATABASE_URL)
                print("✅ Reconnected to Neo4j Aura!")
            except Exception as err:
                print("💀 Reconnect failed:", err)
        time.sleep(120)  # every 2 minutes

# =========================
# Startup event
# =========================
@app.on_event("startup")
def on_startup():
    print("\n🕹️ GameHub backend starting up…")

    try:
        db.cypher_query("RETURN 1")
        print("[✅] Connected to Neo4j database.")
    except (ServiceUnavailable, AuthError, ValueError, Exception) as e:
        print("[⚠️] Neo4j connection not available yet — continuing startup.")
        print(f"    Reason: {e}")

    if os.path.exists(UPLOADS_DIR):
        print(f"[📁] Uploads directory ready at: {os.path.abspath(UPLOADS_DIR)}")
    else:
        print("[⚠️] Uploads directory missing!")

    threading.Thread(target=keep_neo4j_alive, daemon=True).start()

# =========================
# Root API endpoint
# =========================
@app.get("/")
def root():
    # Serve React index if build exists
    index_file = os.path.join(frontend_build_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "GameHub backend running 🎮"}

# =========================
# Catch-all route for React Router
# =========================
@app.get("/{full_path:path}")
def serve_react_app(full_path: str):
    index_file = os.path.join(frontend_build_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "React app not built yet"}
