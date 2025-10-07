# main.py
import os
import time
import threading
import config  # sets neomodel_config.DATABASE_URL BEFORE any db use

from fastapi import FastAPI
from routers import users, friends, games, servers, chat, direct_messages
from neomodel import db
from neo4j.exceptions import ServiceUnavailable, AuthError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="🎮 GameHub Backend")

# ✅ CORS setup
origins = [
    "http://localhost:5173",   # Vite frontend
    "http://127.0.0.1:5173",
    "http://localhost:5174",   # Alternative port
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
        except ServiceUnavailable as e:
            print("⚠️ Lost connection to Neo4j Aura, reconnecting:", e)
            try:
                db.set_connection(config.neomodel_config.DATABASE_URL)
                print("✅ Reconnected to Neo4j Aura!")
            except Exception as err:
                print("💀 Reconnect failed:", err)
        time.sleep(120)  # every 2 minutes


# ✅ Neo4j startup check
@app.on_event("startup")
def on_startup():
    print("\n🕹️ GameHub backend starting up…")
    try:
        db.cypher_query("RETURN 1")
        print("[✅] Connected to Neo4j database.")
    except (ServiceUnavailable, AuthError, ValueError) as e:
        print("[❌] Neo4j connection failed:", e)

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
