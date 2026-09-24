import os
import sys
from dotenv import load_dotenv

# Try importing psycopg2 or sqlalchemy or pg8000
load_dotenv()

database_url = os.environ.get("DATABASE_URL")
if not database_url:
    print("DATABASE_URL environment variable is required.")
    sys.exit(1)

# Ensure postgresql scheme
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

try:
    from sqlalchemy import create_engine, text
    engine = create_engine(database_url)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_schema, table_name, table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name;
        """))
        rows = result.fetchall()
        print(f"Total tables found: {len(rows)}")
        current_schema = None
        for schema, table, ttype in rows:
            if schema != current_schema:
                current_schema = schema
                print(f"\n[{current_schema}]")
            print(f"  - {table} ({ttype})")
except Exception as e:
    print(f"Error querying database with SQLAlchemy: {e}")
    sys.exit(1)
