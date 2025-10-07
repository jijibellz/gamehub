from neomodel import config as neomodel_config
import os

host = os.getenv("NEO4J_HOST")  # e.g., c0698f7d.databases.neo4j.io
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD")

if not host or not password:
    raise ValueError("NEO4J_HOST or NEO4J_PASSWORD missing")

# ❌ Don't encode manually
# ❌ Don't add extra neo4j+s:// inside credentials

# Correct format for Aura:
neomodel_config.DATABASE_URL = f"neo4j+s://{user}:{password}@{host}"
print("[ℹ️] Connecting to Neo4j at:", neomodel_config.DATABASE_URL)
