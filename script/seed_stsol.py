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
    
    filepath = 'docs/australia/stsol.json'
    table_name = 'anzsco_stsol'
    
    print(f"Creating table anzsco_stsol...")
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS anzsco_stsol (
            id bigint generated always as identity primary key,
            anzsco_code text not null,
            name text not null,
            assessing_authority text,
            skill_level text,
            invitation_tier text,
            created_at timestamptz default now()
        );
        CREATE INDEX IF NOT EXISTS idx_anzsco_stsol_anzsco_code ON anzsco_stsol(anzsco_code);
        TRUNCATE TABLE anzsco_stsol RESTART IDENTITY;
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
            INSERT INTO anzsco_stsol 
            (anzsco_code, name, assessing_authority, skill_level, invitation_tier)
            VALUES %s
            """,
            records
        )
        print(f"Inserted {len(records)} records into anzsco_stsol")
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"Finished seeding {name.upper()}!")

if __name__ == '__main__':
    main()
