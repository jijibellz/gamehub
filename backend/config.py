import config
import os
from urllib.parse import quote_plus
from neomodel import config as neomodel_config
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("NEO4J_HOST")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD")

if not host or not password:
    raise ValueError("NEO4J_HOST or NEO4J_PASSWORD missing")

encoded_pw = quote_plus(password)

# ❌ Remove :7687 — Aura with neo4j+s:// works over 443
neo4j_url = f"neo4j+s://{user}:{encoded_pw}@{host}"

neomodel_config.DATABASE_URL = neo4j_url
print("[ℹ️] Connecting to Neo4j at:", neo4j_url)
