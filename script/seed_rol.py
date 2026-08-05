import os
import json
import psycopg2
from psycopg2.extras import execute_values

def get_db_url():
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                val = line.strip().split('=', 1)[1]
                return val.strip('"').strip("'")
    return None

def main():
    db_url = get_db_url()
    if not db_url:
        print("DATABASE_URL not found in .env")
        return
        
    print("Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    filepath = 'docs/australia/rol.json'
    table_name = 'anzsco_rol'
    
    print(f"Creating table anzsco_rol...")
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS anzsco_rol (
            id bigint generated always as identity primary key,
            anzsco_code text not null,
            name text not null,
            assessing_authority text,
            skill_level text,
            invitation_tier text,
            created_at timestamptz default now()
        );
        CREATE INDEX IF NOT EXISTS idx_anzsco_rol_anzsco_code ON anzsco_rol(anzsco_code);
        TRUNCATE TABLE anzsco_rol RESTART IDENTITY;
    """)
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    records = []
    for item in data:
        records.append((
            item.get('ANZSCO'),
            item.get('Name'),
            item.get('Assessing Authority'),
            item.get('Skill Level'),
            item.get('Invitation Tier')
        ))
        
    if records:
        execute_values(
            cur,
            f"""
            INSERT INTO anzsco_rol 
            (anzsco_code, name, assessing_authority, skill_level, invitation_tier)
            VALUES %s
            """,
            records
        )
        print(f"Inserted {len(records)} records into anzsco_rol")
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"Finished seeding {name.upper()}!")

if __name__ == '__main__':
    main()
