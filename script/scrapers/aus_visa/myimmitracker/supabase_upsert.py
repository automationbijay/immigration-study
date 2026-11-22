# r! psycopg2-binary

import os
import re
import psycopg2
from psycopg2.extras import execute_values, Json
from typing import TypedDict

class postgresql(TypedDict):
    host: str
    port: int
    user: str
    password: str
    dbname: str
    sslmode: str

def clean_column_name(col: str) -> str:
    col = col.lower().strip()
    col = re.sub(r'[^a-z0-9]', '_', col)
    col = re.sub(r'_+', '_', col).strip('_')
    if col.isdigit(): col = 'col_' + col
    if col in ["id", "created_at", "updated_at", "source_url", "windmill_run_id", "case_id", "additional_data"]:
        col = col + "_value"
    if col == "analyze": return "analyze_value"
    if col == "watch": return "watch_value"
    return col

def main(table_name: str, scraped_data: list, db: postgresql):
    if not scraped_data:
        print("No data to upsert.")
        return {"status": "success", "upserted": 0}

    print(f"Connecting to database to fetch schema for {table_name}...")
    try:
        conn = psycopg2.connect(
            host=db.get("host"),
            port=db.get("port", 5432),
            user=db.get("user"),
            password=db.get("password"),
            dbname=db.get("dbname"),
            sslmode=db.get("sslmode", "prefer")
        )
        cur = conn.cursor()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        valid_columns = {row[0] for row in cur.fetchall()}
    except Exception as e:
        raise RuntimeError(f"Failed to fetch schema: {e}")

    if not valid_columns:
        raise ValueError(f"Table '{table_name}' does not exist or has no columns in the database.")

    print(f"Found {len(valid_columns)} valid columns. Processing {len(scraped_data)} rows...")
    
    formatted_records = []

    for row in scraped_data:
        row_copy = dict(row)
        case_id = row_copy.pop("Case ID", None) or row_copy.pop("case_id", None)
        
        if not case_id:
            continue

        record = {"case_id": str(case_id)}
        for k, v in row_copy.items():
            if not k.strip(): continue
            col = clean_column_name(k)
            if col in valid_columns:
                record[col] = str(v) if v is not None else None


        formatted_records.append(record)

    if not formatted_records:
        print("No valid records with case_id found.")
        return {"status": "success", "upserted": 0}

    # Ensure consistent column ordering for all rows
    columns = list(formatted_records[0].keys())
    values = []
    
    for r in formatted_records:
        row_values = []
        for col in columns:
            val = r.get(col)
            if isinstance(val, dict):
                row_values.append(Json(val))
            else:
                row_values.append(val)
        values.append(tuple(row_values))

    update_set = ", ".join([f"{col} = EXCLUDED.{col}" for col in columns if col != "case_id"])
    
    insert_query = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES %s
        ON CONFLICT (case_id)
        DO UPDATE SET {update_set};
    """

    BATCH_SIZE = 1000
    total_upserted = 0
    
    for i in range(0, len(values), BATCH_SIZE):
        batch = values[i:i + BATCH_SIZE]
        print(f"Upserting batch {i//BATCH_SIZE + 1} ({len(batch)} records)...")
        try:
            execute_values(cur, insert_query, batch)
            conn.commit()
            total_upserted += len(batch)
        except Exception as e:
            conn.rollback()
            print(f"Error upserting batch: {e}")
            raise
            
    cur.close()
    conn.close()

    print(f"Successfully upserted {total_upserted} total records into {table_name}.")
    return {"status": "success", "upserted": total_upserted}
