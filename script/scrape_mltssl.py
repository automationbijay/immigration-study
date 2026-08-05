import asyncio
from scrape_list import main

if __name__ == "__main__":
    print("Starting MLTSSL scraper...")
    asyncio.run(main("https://www.anzscosearch.com/mltssl/", "docs/australia/mltssl.json"))
