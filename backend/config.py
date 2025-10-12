from neomodel import config as neomodel_config
import os

# Try NEO4J_URI first (full connection string), then fall back to individual components
neo4j_uri = os.getenv("NEO4J_URI")

if neo4j_uri:
    # Use full URI if provided (e.g., neo4j+s://user:pass@host:7687)
    neomodel_config.DATABASE_URL = neo4j_uri
    print("[ℹ️] Using NEO4J_URI connection string")
else:
    # Fall back to individual components
    host = os.getenv("NEO4J_HOST")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")
    
    if not host or not password:
        raise ValueError("❌ Missing NEO4J_HOST or NEO4J_PASSWORD environment variables")
    
    # neomodel expects bolt+s:// or neo4j+s:// for Aura
    neomodel_config.DATABASE_URL = f"neo4j+s://{user}:{password}@{host}"
    print(f"[ℹ️] Connecting to Neo4j at: neo4j+s://{user}:****@{host}")

print(f"[ℹ️] Neo4j connection configured")
