import asyncio
import json
import re
from urllib.parse import urljoin, urlsplit

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

BASE_URL = "https://www.anzscolookup.com.au"
OCCUPATION_PATH = re.compile(r"/occupations/([0-9]{6})/?")


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    occupations = []
    for article in soup.find_all("article"):
        for anchor in article.find_all("a", href=True):
            link = urljoin(BASE_URL, anchor["href"])
            target = urlsplit(link)
            code = OCCUPATION_PATH.fullmatch(target.path)
            title = anchor.get_text(strip=True)
            if target.netloc == urlsplit(BASE_URL).netloc and code and title:
                break
        else:
            continue

        industry = "Unknown"
        for div in article.find_all("div", class_="text-sm text-slate-600"):
            text = div.get_text(strip=True)
            if text and "ANZSCO" not in text:
                industry = text
                break

        containers = article.find_all("div", class_="flex flex-wrap gap-1.5")
        lists = [span.get_text(strip=True) for span in containers[-1].find_all("span")] if len(containers) >= 2 else []
        occupations.append({
            "title": title, "code": code.group(1), "industry": industry,
            "lists": ", ".join(lists), "link": link,
        })

    next_link = next((a for a in soup.select('a[href*="?page="]')
                      if a.get_text(strip=True) == "Next"), None)
    return occupations, urljoin(BASE_URL, next_link["href"]) if next_link else None


async def main():
    occupations = {}
    visited = set()
    url = f"{BASE_URL}/occupations/"
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        while url:
            if url in visited or urlsplit(url).netloc != urlsplit(BASE_URL).netloc:
                raise RuntimeError(f"Unexpected occupation pagination URL: {url}")
            visited.add(url)
            response = await page.goto(url, timeout=60000)
            if response is None or not response.ok:
                raise RuntimeError(f"Failed to load occupation page: {url}")
            records, url = parse_page(await page.content())
            if not records:
                raise RuntimeError("The occupation page contains no occupations.")
            occupations.update((record["code"], record) for record in records)

    with open("occupations.json", "w", encoding="utf-8") as stream:
        json.dump(list(occupations.values()), stream, indent=4)
        stream.write("\n")
    print(f"Saved {len(occupations)} occupations to occupations.json.")
    return list(occupations.values())


if __name__ == "__main__":
    asyncio.run(main())
