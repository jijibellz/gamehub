# main.py
import os
import time
import threading
import config  # sets neomodel_config.DATABASE_URL BEFORE any db use

from fastapi import FastAPI
from routers import users, friends, games, servers, chat, direct_messages
from neomodel import db, config as neoconfig
from neo4j.exceptions import ServiceUnavailable, AuthError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="🎮 GameHub Backend")

# ✅ CORS setup
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://gamehubjiji-044p.onrender.com", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gamehubjiji-044p.onrender.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Create uploads directory if missing
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)

# ✅ Serve uploaded files (voice, images, etc.)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# ✅ Include routers
app.include_router(users.router)
app.include_router(friends.router, prefix="/api")
app.include_router(direct_messages.router, prefix="/api")
app.include_router(games.router, prefix="/games", tags=["Games"])
app.include_router(servers.router)
app.include_router(chat.router)

# 💓 Keep Neo4j Aura alive
def keep_neo4j_alive():
    """Background thread to prevent Aura from closing idle connections."""
    while True:
        try:
            db.cypher_query("RETURN 1")
            print("🩵 Neo4j heartbeat OK")
        except Exception as e:
            print(f"⚠️ Lost connection to Neo4j Aura: {type(e).__name__}")
            try:
                # Force close old connection
                db.close_connection()
                time.sleep(2)
                
                # Reconnect using the configured URL
                connection_url = os.getenv("NEO4J_URI") or neoconfig.DATABASE_URL
                db.set_connection(connection_url)
                
                # Test the new connection
                db.cypher_query("RETURN 1")
                print("✅ Reconnected to Neo4j Aura!")
            except Exception as err:
                print(f"💀 Reconnect failed: {type(err).__name__} - {err}")
        time.sleep(90)  # every 90 seconds


# ✅ Neo4j startup check (safe on Render)
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

    # 💓 Start heartbeat thread
    threading.Thread(target=keep_neo4j_alive, daemon=True).start()


# ✅ Root endpoint
@app.get("/")
def root():
    return {"message": "GameHub backend running 🎮"}
