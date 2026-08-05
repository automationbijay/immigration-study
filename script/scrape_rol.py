import asyncio
from scrape_list import main

if __name__ == "__main__":
    print("Starting ROL scraper...")
    asyncio.run(main("https://www.anzscosearch.com/rol/", "docs/australia/rol.json"))
