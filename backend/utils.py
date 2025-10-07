import aiohttp
from models import Game

GAMEPIX_API = "https://games.gamepix.com/games"

async def fetch_gamepix_games(offset: int = 0, limit: int = 1000):
    params = {
        "sid": "",  # might need a valid sid, API doc sometimes uses empty
        "limit": limit,
        "offset": offset
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(GAMEPIX_API, params=params) as resp:
            resp.raise_for_status()  # will raise HTTP errors automatically
            data = await resp.json()
            print("[DEBUG] GamePix raw JSON type:", type(data))
            print("[DEBUG] GamePix raw JSON preview:", str(data)[:500])
            return data

def upsert_gamepix(data):
    # Extract games list correctly
    if isinstance(data, dict) and "data" in data:
        games_list = data["data"]
    elif isinstance(data, list):
        games_list = data
    else:
        print("[ERROR] Unexpected data type from GamePix:", type(data))
        games_list = []

    print(f"[DEBUG] Found {len(games_list)} games in response from GamePix")

    for g in games_list:
        ext_id = str(g.get("id"))
        title = g.get("title") or "Untitled Game"
        desc = g.get("description") or ""
        cover = g.get("thumbnailUrl") or g.get("cover") or g.get("cover_url") or g.get("icon")
        play_url = g.get("url") or g.get("play") or g.get("embed_url")

        try:
            existing = Game.nodes.get_or_none(external_id=ext_id)
            if existing:
                existing.title = title or existing.title
                existing.description = desc or existing.description
                existing.cover_url = cover or existing.cover_url
                existing.play_url = play_url or existing.play_url
                existing.save()
                print(f"[UPDATE] Game updated: {title} ({ext_id})")
            else:
                Game(
                    external_id=ext_id,
                    title=title,
                    description=desc,
                    cover_url=cover,
                    play_url=play_url,
                    source="GamePix"
                ).save()
                print(f"[NEW] Game created: {title} ({ext_id})")

            if play_url:
                print(f" → Play URL available: {play_url}")
            else:
                print(" → No play URL found for this game")

        except Exception as e:
            print(f"[WARNING] Could not upsert game {ext_id}: {e}")
            continue
