"""Export Home Affairs SkillSelect occupation cutoffs from 2022 onward to CSV.

Dependency: beautifulsoup4
"""

import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup


BASE_URL = "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds"
CURRENT_URL = f"{BASE_URL}/invitation-rounds"
PREVIOUS_URL = f"{BASE_URL}/previous-rounds"
FIRST_ROUND_DATE = "2022-01-01"
SUBCLASSES = ("189", "491")
SUBCLASS_PATTERN = re.compile(r"\b(?:189|491)\b")
DATE_PATTERN = re.compile(r"\bInvitations issued on (\d{1,2} [A-Za-z]+ \d{4})\b", re.I)
CSV_COLUMNS = ("date", "occupation", "subclass 189", "subclass 491")


def cell_text(element):
    return " ".join(element.get_text(" ", strip=True).replace("\u200b", "").split())


def points(text):
    value = text.strip("* ").lower()
    if value in {"", "n/a", "not invited", "-", "–", "—"}:
        return None
    return int(value)


def table_rows(table):
    return [
        row.find_all(["th", "td"], recursive=False)
        for row in table.find_all("tr")
    ]


def occupation_scores(rows, invited_subclasses):
    header = [cell_text(cell).lower() for cell in rows[0]]
    # Some archives group two score columns under each subclass.
    expanded_header = [
        label for cell, label in zip(rows[0], header)
        for _ in range(int(cell.get("colspan", 1)))
    ]
    if header[0].startswith("occupation"):
        data_rows = rows[1:]
    elif not header[0] and len(rows) > 1 and any(
        cell_text(cell).lower().startswith("offshore") for cell in rows[1]
    ):
        data_rows = rows[2:]
    else:
        return

    columns = [
        (index, match[0])
        for index, label in enumerate(expanded_header)
        if (match := SUBCLASS_PATTERN.search(label))
    ]
    if not columns and "minimum points score" in header:
        if len(invited_subclasses) != 1:
            raise ValueError("Could not identify the subclass for the occupation scores")
        columns = [(header.index("minimum points score"), invited_subclasses[0])]
    if not columns:
        return

    for row in data_rows:
        occupation = cell_text(row[0])
        scores = {}
        for index, subclass in columns:
            score = points(cell_text(row[index]))
            if score is not None:
                scores[subclass] = min(score, scores.get(subclass, score))
        yield occupation, scores


def page_blocks(html):
    page = BeautifulSoup(html, "html.parser")
    yield page
    schema = page.select_one('input[id$="PageSchemaHiddenField_Input"][value]')
    if schema and schema["value"]:
        # SharePoint stores the current page content and archive accordions as HTML in JSON.
        data = json.loads(schema["value"])
        yield from (
            BeautifulSoup(item[field], "html.parser")
            for section, field in (("content", "block"), ("criteria", "description"))
            for item in data.get(section, [])
        )


def dated_tables(block):
    date = None
    for element in block.find_all(["h2", "h3", "h4", "table"]):
        if element.name != "table":
            if match := DATE_PATTERN.search(cell_text(element)):
                date = datetime.strptime(match[1], "%d %B %Y").date().isoformat()
            continue
        if date is not None and date >= FIRST_ROUND_DATE:
            rows = [row for row in table_rows(element) if row]
            if rows:
                yield date, rows


def page_scores(html):
    for block in page_blocks(html):
        previous_date = None
        invited_subclasses = []
        for date, rows in dated_tables(block):
            if date != previous_date:
                invited_subclasses = []
                previous_date = date
            header = [cell_text(cell).lower() for cell in rows[0]]
            if header[0] == "visa subclass" and "total eois invited" in header:
                invited_subclasses = [
                    subclass
                    for row in rows[1:]
                    for subclass in SUBCLASS_PATTERN.findall(cell_text(row[0]))
                    if cell_text(row[1]).replace(",", "") != "0"
                ]
            for occupation, scores in occupation_scores(rows, invited_subclasses):
                yield date, occupation, scores


def fetch_page(url):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=30) as response:
        return response.read()


def scrape_rounds():
    results = {}
    for url in (CURRENT_URL, PREVIOUS_URL):
        rows = list(page_scores(fetch_page(url)))
        if not rows:
            raise ValueError(f"No occupation scores found at {url}")
        for date, occupation, scores in rows:
            combined = results.setdefault((date, occupation), {})
            for subclass, score in scores.items():
                if score is not None:
                    combined.setdefault(subclass, score)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("-o", "--output", type=Path, default=Path("skillselect_invitation_rounds.csv"))
    args = parser.parse_args()
    try:
        results = scrape_rounds()
        with args.output.open("w", encoding="utf-8", newline="") as output:
            writer = csv.writer(output)
            writer.writerow(CSV_COLUMNS)
            by_occupation = sorted(results, key=lambda row: row[1].casefold())
            for date, occupation in sorted(by_occupation, key=lambda row: row[0], reverse=True):
                scores = results[date, occupation]
                writer.writerow([date, occupation, *(scores.get(s) for s in SUBCLASSES)])
    except (URLError, OSError, ValueError, KeyError, IndexError) as error:
        parser.exit(1, f"Could not export invitation rounds: {error}\n")
    print(f"Wrote {len(results):,} occupation cutoffs to {args.output}")


if __name__ == "__main__":
    main()
