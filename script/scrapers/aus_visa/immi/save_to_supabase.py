# r! psycopg2-binary

from contextlib import closing
from typing import TypedDict

import psycopg2
from psycopg2 import sql
from psycopg2.extras import Json, execute_values


class postgresql(TypedDict):
    host: str
    port: int
    user: str
    password: str
    dbname: str
    sslmode: str


def main(table_name: str, scraped_data: list, db: postgresql, truncate_first: bool = True):
    if not scraped_data:
        return {"status": "success", "inserted": 0}

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
        if "anzsco_code" not in valid_columns:
            raise ValueError(f"Table {table_name!r} has no anzsco_code column in public.")

        records = []
        for row in scraped_data:
            try:
                code = int(row.get("anzsco_code"))
            except (ValueError, TypeError):
                continue
            if not 100000 <= code <= 999999:
                continue
            record = {key: value for key, value in row.items() if key in valid_columns}
            record["anzsco_code"] = code
            records.append(record)

        if not records or (truncate_first and len(records) != len(scraped_data)):
            raise ValueError("The refresh requires valid six-digit occupation codes in every row.")

        columns = sorted(set().union(*(record.keys() for record in records)))
        values = [
            tuple(Json(value) if isinstance(value, dict) else value
                  for value in (record.get(column) for column in columns))
            for record in records
        ]
        table = sql.Identifier("public", table_name)
        if truncate_first:
            cur.execute(sql.SQL("TRUNCATE TABLE {}").format(table))
        query = sql.SQL("INSERT INTO {} ({}) VALUES %s").format(
            table, sql.SQL(", ").join(map(sql.Identifier, columns))
        )
        execute_values(cur, query, values, page_size=1000)

    return {"status": "success", "inserted": len(records)}
