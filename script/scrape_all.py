import asyncio
from scrape_list import main as scrape_list

async def scrape_all_anzsco_lists():
    print("Starting master scrape of all ANZSCO occupation lists...")
    
    # 1. Medium and Long-term Strategic Skills List (MLTSSL)
    await scrape_list("https://www.anzscosearch.com/mltssl/", "docs/australia/mltssl.json")
    
    # 2. Regional Occupation List (ROL)
    await scrape_list("https://www.anzscosearch.com/rol/", "docs/australia/rol.json")
    
    # 3. Short-term Skilled Occupation List (STSOL)
    await scrape_list("https://www.anzscosearch.com/stsol/", "docs/australia/stsol.json")
    
    print("\nAll 3 scrapers finished successfully! Files saved to docs/australia/")

if __name__ == "__main__":
    asyncio.run(scrape_all_anzsco_lists())
