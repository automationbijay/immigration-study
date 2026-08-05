import os
import json
import psycopg2
from psycopg2.extras import execute_values

def get_db_url():
    # Simple parse of .env
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
    
    print("Creating anzsco_occupations table...")
    cur.execute('''
        CREATE TABLE IF NOT EXISTS anzsco_occupations (
            id bigint generated always as identity primary key,
            anzsco_code text not null,
            name text not null,
            assessing_authority text,
            skill_level text,
            invitation_tier text,
            list_type text not null,
            created_at timestamptz default now()
        );
        
        -- Create an index on anzsco_code for fast lookups
        CREATE INDEX IF NOT EXISTS idx_anzsco_code ON anzsco_occupations(anzsco_code);
    ''')
    
    # We will truncate the table to avoid duplicates on re-runs
    cur.execute('TRUNCATE TABLE anzsco_occupations RESTART IDENTITY;')
    
    lists = [
        ('docs/australia/mltssl.json', 'MLTSSL'),
        ('docs/australia/rol.json', 'ROL'),
        ('docs/australia/stsol.json', 'STSOL')
    ]
    
    total_inserted = 0
    
    for filepath, list_type in lists:
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        records = []
        for item in data:
            records.append((
                item.get('ANZSCO'),
                item.get('Name'),
                item.get('Assessing Authority'),
                item.get('Skill Level'),
                item.get('Invitation Tier'),
                list_type
            ))
            
        if records:
            execute_values(
                cur,
                '''
                INSERT INTO anzsco_occupations 
                (anzsco_code, name, assessing_authority, skill_level, invitation_tier, list_type)
                VALUES %s
                ''',
                records
            )
            total_inserted += len(records)
            print(f"Inserted {len(records)} records from {list_type}")
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully seeded {total_inserted} occupations into Supabase!")

if __name__ == '__main__':
    main()
