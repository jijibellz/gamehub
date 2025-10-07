from neomodel import config as neomodel_config
import os

host = os.getenv("NEO4J_HOST")  # c0698f7d.databases.neo4j.io
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD")

# ⚠️ neomodel expects bolt+s://host:7687
neomodel_config.DATABASE_URL = f"bolt+s://{user}:{password}@{host}:7687"
print("[ℹ️] Connecting to Neo4j at:", neomodel_config.DATABASE_URL)
