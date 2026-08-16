import asyncio
import json
from playwright.async_api import async_playwright

async def extract_occupations():
    print("Starting extraction...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        all_occupations = []
        seen_codes = set()
        current_page = 1
        
        while True:
            url = f"https://www.anzscolookup.com.au/occupations?page={current_page}" if current_page > 1 else "https://www.anzscolookup.com.au/occupations"
            print(f"Navigating to {url}...")
            await page.goto(url)
            
            try:
                await page.wait_for_selector('article', timeout=10000)
            except Exception as e:
                print(f"No articles found or timeout on page {current_page}. Stopping.")
                break
            
            articles = await page.query_selector_all('article')
            if not articles:
                break
                
            new_items_on_page = 0
            for article in articles:
                title_elem = await article.query_selector('a.font-semibold')
                if not title_elem:
                    continue
                title = await title_elem.inner_text()
                link = await title_elem.get_attribute('href')
                
                code_elem = await article.query_selector('div.text-sm.font-medium.text-slate-600')
                code = await code_elem.inner_text() if code_elem else ""
                code = code.replace("ANZSCO", "").strip()
                
                industry_elem = await article.query_selector('div.text-sm.text-slate-600')
                industry = await industry_elem.inner_text() if industry_elem else ""
                
                if code in seen_codes:
                    continue
                seen_codes.add(code)
                new_items_on_page += 1
                
                all_occupations.append({
                    "title": title.strip(),
                    "code": code,
                    "industry": industry.strip(),
                    "link": f"https://www.anzscolookup.com.au{link}"
                })
            
            if new_items_on_page == 0:
                print("No new items found on this page. Stopping.")
                break
                
            print(f"Scraped page {current_page}, total unique items so far: {len(all_occupations)}")
            current_page += 1

        with open("occupations.json", "w", encoding="utf-8") as f:
            json.dump(all_occupations, f, indent=4)
            
        print(f"Data extraction complete. {len(all_occupations)} unique occupations saved to occupations.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(extract_occupations())
