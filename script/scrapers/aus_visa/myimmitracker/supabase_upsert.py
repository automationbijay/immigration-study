# r! psycopg2-binary

from collections import defaultdict
from contextlib import closing
import re
from typing import TypedDict

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values


class postgresql(TypedDict):
    host: str
    port: int
    user: str
    password: str
    dbname: str
    sslmode: str


def clean_column_name(col: str) -> str:
    col = re.sub(r"[^a-z0-9]+", "_", col.lower().strip()).strip("_")
    if col.isdigit():
        return "col_" + col
    if col in {"id", "created_at", "updated_at", "source_url", "windmill_run_id",
               "case_id", "additional_data", "analyze", "watch"}:
        return col + "_value"
    return col


def main(table_name: str, scraped_data: list, db: postgresql):
    if not scraped_data:
        return {"status": "success", "upserted": 0}

    with closing(psycopg2.connect(
        host=db.get("host"),
        port=db.get("port", 5432),
        user=db.get("user"),
        password=db.get("password"),
        dbname=db.get("dbname"),
        sslmode=db.get("sslmode", "prefer"),
    )) as conn, conn, conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = %s",
            (table_name,),
        )
        valid_columns = {row[0] for row in cur.fetchall()}
        if "case_id" not in valid_columns:
            raise ValueError(f"Table {table_name!r} has no case_id column in public.")

        records = {}
        for row in scraped_data:
            case_id = row.get("Case ID") or row.get("case_id")
            if not case_id:
                continue
            case_id = str(case_id)
            record = records.setdefault(case_id, {"case_id": case_id})
            for key, value in row.items():
                if key in ("Case ID", "case_id"):
                    continue
                column = clean_column_name(key)
                if column in valid_columns:
                    record[column] = str(value) if value is not None else None

        # Batch rows with the same fields so missing scraped fields preserve saved values.
        batches = defaultdict(list)
        for record in records.values():
            columns = tuple(sorted(record))
            batches[columns].append(tuple(record[column] for column in columns))

        table = sql.Identifier("public", table_name)
        for columns, values in batches.items():
            update_columns = [sql.Identifier(col) for col in columns if col != "case_id"]
            conflict_action = sql.SQL("DO NOTHING")
            if update_columns:
                updates = [sql.SQL("{} = EXCLUDED.{}").format(col, col) for col in update_columns]
                conflict_action = sql.SQL("DO UPDATE SET {}").format(sql.SQL(", ").join(updates))
            query = sql.SQL("INSERT INTO {} ({}) VALUES %s ON CONFLICT (case_id) {}").format(
                table, sql.SQL(", ").join(map(sql.Identifier, columns)), conflict_action
            )
            execute_values(cur, query, values, page_size=1000)

    return {"status": "success", "upserted": len(records)}
