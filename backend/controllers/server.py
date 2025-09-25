# controllers/server_controller.py
from fastapi import APIRouter, HTTPException
from models import Server, User
from typing import List

router = APIRouter(prefix="/servers", tags=["Servers"])

def server_to_dict(s: Server):
    return {
        "name": s.name,
        "description": s.description,
        "members": [m.username for m in s.members],
        "channels": [c.name for c in s.channels],
    }

# Create server
@router.post("/")
def create_server(name: str, description: str = ""):
    if Server.nodes.get_or_none(name=name):
        raise HTTPException(status_code=400, detail="Server already exists")
    server = Server(name=name, description=description).save()
    return server_to_dict(server)

# List servers
@router.get("/", response_model=List[dict])
def list_servers():
    servers = Server.nodes.all()
    return [server_to_dict(s) for s in servers]

# Get server by name
@router.get("/{name}")
def get_server(name: str):
    server = Server.nodes.get_or_none(name=name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server_to_dict(server)

# Update server
@router.put("/{name}")
def update_server(name: str, description: str = None):
    server = Server.nodes.get_or_none(name=name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if description:
        server.description = description
        server.save()
    return server_to_dict(server)

# Delete server
@router.delete("/{name}")
def delete_server(name: str):
    server = Server.nodes.get_or_none(name=name)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server.delete()
    return {"detail": f"Server {name} deleted"}
