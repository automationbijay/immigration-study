# r! psycopg2-binary

import os
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

def main(table_name: str, scraped_data: list, db: postgresql, truncate_first: bool = True):
    if not scraped_data:
        print("No data to insert.")
        return {"status": "success", "inserted": 0}

    print(f"Connecting to database to insert into {table_name}...")
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
        
        # Verify schema
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        valid_columns = {row[0] for row in cur.fetchall()}
        if not valid_columns:
            raise ValueError(f"Table '{table_name}' does not exist or has no columns in the database.")

        if truncate_first:
            print(f"Truncating table {table_name} for fresh insertion...")
            cur.execute(f"TRUNCATE TABLE {table_name};")
    except Exception as e:
        raise RuntimeError(f"Failed to fetch schema or truncate: {e}")

    print(f"Found {len(valid_columns)} valid columns. Processing {len(scraped_data)} rows...")
    
    formatted_records = []
    for row in scraped_data:
        record = {}
        # Data cleaning: ensure anzsco_code is an integer
        try:
            record['anzsco_code'] = int(row.get('anzsco_code', 0))
        except (ValueError, TypeError):
            print(f"Skipping row with invalid anzsco_code: {row.get('anzsco_code')}")
            continue
            
        for k, v in row.items():
            if k == 'anzsco_code':
                continue # Already handled
            if k in valid_columns:
                record[k] = v

        formatted_records.append(record)

    if not formatted_records:
        print("No valid records found.")
        return {"status": "success", "inserted": 0}

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

    insert_query = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES %s
    """

    BATCH_SIZE = 1000
    total_inserted = 0
    
    for i in range(0, len(values), BATCH_SIZE):
        batch = values[i:i + BATCH_SIZE]
        print(f"Inserting batch {i//BATCH_SIZE + 1} ({len(batch)} records)...")
        try:
            execute_values(cur, insert_query, batch)
            conn.commit()
            total_inserted += len(batch)
        except Exception as e:
            conn.rollback()
            print(f"Error inserting batch: {e}")
            raise
            
    cur.close()
    conn.close()

    print(f"Successfully inserted {total_inserted} total records into {table_name}.")
    return {"status": "success", "inserted": total_inserted}
