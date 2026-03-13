"""
One-time migration: add pm25, platform_orders, active_riders_count
to the environment_data table.

Run from the ml_microservice directory:
    python migrate_add_env_columns.py
"""
import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:12345@localhost:5432/gigshield")
engine = create_engine(DATABASE_URL)

MIGRATIONS = [
    "ALTER TABLE environment_data ADD COLUMN IF NOT EXISTS pm25 FLOAT",
    "ALTER TABLE environment_data ADD COLUMN IF NOT EXISTS platform_orders INTEGER DEFAULT 0",
    "ALTER TABLE environment_data ADD COLUMN IF NOT EXISTS active_riders_count INTEGER DEFAULT 0",
]

with engine.begin() as conn:
    for sql in MIGRATIONS:
        conn.execute(text(sql))
        print(f"OK: {sql}")

print("\nMigration complete.")
