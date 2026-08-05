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
    
    # Drop the old single table if it exists to keep DB clean
    print("Cleaning up old single table...")
    cur.execute('DROP TABLE IF EXISTS anzsco_occupations CASCADE;')
    
    lists = [
        ('docs/australia/mltssl.json', 'mltssl'),
        ('docs/australia/rol.json', 'rol'),
        ('docs/australia/stsol.json', 'stsol')
    ]
    
    total_inserted = 0
    
    for filepath, list_type in lists:
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
            
        table_name = f"anzsco_{list_type}"
        
        print(f"Creating table {table_name}...")
        cur.execute(f'''
            CREATE TABLE IF NOT EXISTS {table_name} (
                id bigint generated always as identity primary key,
                anzsco_code text not null,
                name text not null,
                assessing_authority text,
                skill_level text,
                invitation_tier text,
                created_at timestamptz default now()
            );
            
            -- Create an index on anzsco_code for fast lookups
            CREATE INDEX IF NOT EXISTS idx_{table_name}_anzsco_code ON {table_name}(anzsco_code);
            
            -- Truncate to avoid duplicates on re-runs
            TRUNCATE TABLE {table_name} RESTART IDENTITY;
        ''')
            
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
                f'''
                INSERT INTO {table_name} 
                (anzsco_code, name, assessing_authority, skill_level, invitation_tier)
                VALUES %s
                ''',
                records
            )
            total_inserted += len(records)
            print(f"Inserted {len(records)} records into {table_name}")
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully created 3 separate tables and seeded {total_inserted} total occupations into Supabase!")

if __name__ == '__main__':
    main()
