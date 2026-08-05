import asyncio
from scrape_list import main

if __name__ == "__main__":
    print("Starting STSOL scraper...")
    asyncio.run(main("https://www.anzscosearch.com/stsol/", "docs/australia/stsol.json"))
