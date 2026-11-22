"""Export Home Affairs SkillSelect invitation totals from 2022 onward to CSV.

Dependency: beautifulsoup4
"""

import argparse
import csv
from pathlib import Path

from scrape_invitation_rounds import (
    CURRENT_URL,
    PREVIOUS_URL,
    SUBCLASS_PATTERN,
    SUBCLASSES,
    cell_text,
    dated_tables,
    fetch_page,
    page_blocks,
)


CSV_COLUMNS = ("round date", "subclass 189 invitations", "subclass 491 invitations")


def page_totals(html):
    for block in page_blocks(html):
        for date, rows in dated_tables(block):
            header = [cell_text(cell).lower() for cell in rows[0]]
            if header[0] != "visa subclass":
                continue
            # Archived rounds use "Number" for the same direct invitation count.
            total_column = next(
                (i for i, name in enumerate(header) if name in {"total eois invited", "number"}),
                None,
            )
            if total_column is None:
                continue
            for row in rows[1:]:
                visa = cell_text(row[0])
                subclass = SUBCLASS_PATTERN.search(visa)
                if subclass and "nominated" not in visa.lower():
                    total = int(cell_text(row[total_column]).replace(",", ""))
                    yield date, subclass[0], total


def scrape_totals():
    totals = {}
    for url in (CURRENT_URL, PREVIOUS_URL):
        rows = list(page_totals(fetch_page(url)))
        if not rows:
            raise ValueError(f"No round invitation totals found at {url}")
        for date, subclass, total in rows:
            totals.setdefault(date, {}).setdefault(subclass, total)
    return totals


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-o", "--output", type=Path, default=Path("skillselect_invitation_totals.csv"))
    args = parser.parse_args()
    try:
        totals = scrape_totals()
        with args.output.open("w", encoding="utf-8", newline="") as output:
            writer = csv.writer(output)
            writer.writerow(CSV_COLUMNS)
            for date in sorted(totals, reverse=True):
                # The round summary omits subclasses with no invitations in some rounds.
                writer.writerow([date, *(totals[date].get(subclass, 0) for subclass in SUBCLASSES)])
    except (OSError, ValueError, KeyError, IndexError) as error:
        parser.exit(1, f"Could not export invitation totals: {error}\n")
    print(f"Wrote invitation totals for {len(totals):,} rounds to {args.output}")


if __name__ == "__main__":
    main()
