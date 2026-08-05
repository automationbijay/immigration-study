import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Setup Supabase client
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Please set SUPABASE_URL and SUPABASE_KEY in your .env file")
    exit(1)

supabase: Client = create_client(url, key)

def main():
    csv_file = "output/skilled_occupation_list.csv"
    if not os.path.exists(csv_file):
        print(f"CSV file not found: {csv_file}")
        return

    df = pd.read_csv(csv_file)
    
    # Replace NaN with None for valid JSON serialization
    df = df.where(pd.notnull(df), None)

    records = []
    for _, row in df.iterrows():
        record = {
            "anzsco_code": str(row["ANZSCO"]),
            "name": str(row["Name"]),
            "list_type": row["List"] if row["List"] is not None else None,
            "assessing_authority": row["Assessing Authority"] if row["Assessing Authority"] is not None else None,
            "skill_level": int(row["Skill Level"]) if row["Skill Level"] is not None else None
        }
        records.append(record)

    print(f"Uploading {len(records)} records to Supabase...")
    
    chunk_size = 100
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        try:
            response = supabase.table("skilled_occupations").upsert(
                chunk, 
                on_conflict="anzsco_code"
            ).execute()
            print(f"Uploaded {len(chunk)} records (Batch {i//chunk_size + 1})")
        except Exception as e:
            print(f"Error uploading batch {i//chunk_size + 1}: {e}")

    print("Upload completed.")

if __name__ == "__main__":
    main()
