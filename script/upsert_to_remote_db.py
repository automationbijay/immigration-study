import pandas as pd
import os
import math
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# Remote Database URL
database_url = os.environ.get("DATABASE_URL")

if not database_url:
    print("DATABASE_URL environment variable is required.")
    sys.exit(1)

# Ensure database URL is compatible with sqlalchemy
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(database_url)

table_name = "skilled_occupations"
csv_path = "output/skilled_occupation_list.csv"

# Read CSV
df = pd.read_csv(csv_path)

records = []
for index, row in df.iterrows():
    try:
        anzsco_code = str(int(row['ANZSCO']))
    except ValueError:
        anzsco_code = str(row['ANZSCO'])
    
    skill_level = row['Skill Level']
    if pd.isna(skill_level):
        skill_level = None
    else:
        skill_level = int(skill_level)
        
    records.append({
        "anzsco_code": anzsco_code,
        "name": str(row['Name']),
        "list_type": str(row['List']) if not pd.isna(row['List']) else None,
        "assessing_authority": str(row['Assessing Authority']) if not pd.isna(row['Assessing Authority']) else None,
        "skill_level": skill_level
    })

print(f"Preparing to upsert {len(records)} records to remote DB...")

# Upsert using sqlalchemy and raw SQL
with engine.connect() as conn:
    for record in records:
        stmt = text(f"""
            INSERT INTO public.{table_name} (anzsco_code, name, list_type, assessing_authority, skill_level)
            VALUES (:anzsco_code, :name, :list_type, :assessing_authority, :skill_level)
            ON CONFLICT (anzsco_code) DO UPDATE SET
                name = EXCLUDED.name,
                list_type = EXCLUDED.list_type,
                assessing_authority = EXCLUDED.assessing_authority,
                skill_level = EXCLUDED.skill_level;
        """)
        conn.execute(stmt, record)
    conn.commit()

print("Successfully upserted all records to the remote database.")
