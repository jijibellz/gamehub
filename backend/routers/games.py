from fastapi import APIRouter, HTTPException
from models import Game
from utils import fetch_gamepix_games, upsert_gamepix

router = APIRouter()

# Helper to turn Game nodes into dicts
def game_to_dict(g: Game):
    return {
        "external_id": g.external_id,
        "title": g.title,
        "description": g.description,
        "cover_url": g.cover_url,
        "play_url": g.play_url,
        "source": g.source,
    }

@router.post("/seed_gamepix")
async def seed_gamepix(limit: int = 1000, offset: int = 0):
    try:
        data = await fetch_gamepix_games(offset=offset, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch from GamePix: {e}")

    if not data:
        raise HTTPException(status_code=500, detail="Empty response from GamePix API")

    upsert_gamepix(data)

    games_list = data["data"] if "data" in data else []

    return {"seeded": True, "count": len(games_list)}



@router.get("/")
def list_games(limit: int = 50, offset: int = 0):
    try:
        # fetch all games safely, slice by offset/limit
        games = list(Game.nodes.all())
        sliced = games[offset:offset + limit]
        return [game_to_dict(g) for g in sliced]
    except Exception as e:
        print("[ERROR] list_games crashed:", e)
        raise HTTPException(status_code=500, detail=f"Could not fetch games: {e}")

@router.get("/{external_id}")
def get_game(external_id: str):
    try:
        g = Game.nodes.get_or_none(external_id=external_id)
        if not g:
            raise HTTPException(status_code=404, detail="Game not found")
        return game_to_dict(g)
    except Exception as e:
        print(f"[ERROR] get_game crashed for {external_id}:", e)
        raise HTTPException(status_code=500, detail=f"Could not fetch game: {e}")
