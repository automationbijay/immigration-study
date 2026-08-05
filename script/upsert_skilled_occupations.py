import pandas as pd
import requests
import os
import math
import sys
from dotenv import load_dotenv

load_dotenv()

# Supabase details
supabase_url = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_key:
    print("SUPABASE_KEY environment variable is required.")
    sys.exit(1)

table_name = "skilled_occupations"
csv_path = "output/skilled_occupation_list.csv"

# Read CSV
df = pd.read_csv(csv_path)

# Map CSV headers to database columns
# ANZSCO,Name,List,Assessing Authority,Skill Level
# anzsco_code,name,list_type,assessing_authority,skill_level

records = []
for index, row in df.iterrows():
    # Convert ANZSCO to string, ensure it has 6 digits if it's a number
    try:
        anzsco_code = str(int(row['ANZSCO']))
    except ValueError:
        anzsco_code = str(row['ANZSCO'])
    
    skill_level = row['Skill Level']
    if math.isnan(skill_level):
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

print(f"Preparing to upsert {len(records)} records...")

# Batch upsert via Supabase REST API
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # This is important for upsert
}

# The endpoint for the table, specify on_conflict for upsert
url = f"{supabase_url}/rest/v1/{table_name}?on_conflict=anzsco_code"

# We can post up to 1000 records at a time maybe, but let's do all at once, or batches
batch_size = 500
success_count = 0

for i in range(0, len(records), batch_size):
    batch = records[i:i+batch_size]
    response = requests.post(url, json=batch, headers=headers)
    if response.status_code in (200, 201):
        success_count += len(batch)
        print(f"Batch {i//batch_size + 1} upserted successfully.")
    else:
        print(f"Error in batch {i//batch_size + 1}: {response.status_code}")
        print(response.text)

print(f"Upserted {success_count} / {len(records)} records.")
