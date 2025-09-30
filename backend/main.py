# main.py
import config  # <— sets neomodel_config.DATABASE_URL BEFORE any db use


from fastapi import FastAPI
from routers import users, friends, games, servers, chat
from neomodel import db
from neo4j.exceptions import ServiceUnavailable, AuthError

app = FastAPI()
app.include_router(users.router)
app.include_router(friends.router, prefix="/friends", tags=["Friends"])
app.include_router(games.router, prefix="/games", tags=["Games"])
app.include_router(servers.router)
app.include_router(chat.router)

@app.on_event("startup")
def on_startup():
    print("🕹️ Backend starting up…")
    try:
        db.cypher_query("RETURN 1")
        print("[✅] Connected to Neo4j!")
    except (ServiceUnavailable, AuthError, ValueError) as e:
        print("[❌] Neo4j connection failed:", e)

@app.get("/")
def root():
    return {"message": "GameHub backend running 🎮"}
