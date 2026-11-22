import asyncio
import json
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

async def main():
    print("Launching browser to get the full list of occupations from anzscolookup.com.au/occupations...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')
        
        await page.goto("https://www.anzscolookup.com.au/occupations", timeout=60000)
        
        occupations = []
        page_num = 1
        
        while True:
            print(f"Loading page {page_num}...")
            await page.goto(f"https://www.anzscolookup.com.au/occupations/?page={page_num}", timeout=60000)
            await page.wait_for_timeout(2000)
            
            html = await page.content()
            soup = BeautifulSoup(html, 'html.parser')
            articles = soup.find_all('article')
            
            if not articles:
                print("No more articles found. Finished pagination.")
                break
                
            for article in articles:
                a_tag = article.find('a', href=True)
                if not a_tag:
                    continue
                    
                link = "https://www.anzscolookup.com.au" + a_tag['href']
                title = a_tag.text.strip()
                
                divs = article.find_all('div', class_='text-sm text-slate-600')
                industry = "Unknown"
                for div in divs:
                    text = div.text.strip()
                    if "ANZSCO" not in text and text != "":
                        industry = text
                        break
                        
                code = "Unknown"
                code_div = article.find(string=lambda t: t and 'ANZSCO' in t)
                if code_div:
                    code = code_div.parent.text.replace("ANZSCO", "").strip()
                    
                lists = []
                list_container = article.find_all('div', class_='flex flex-wrap gap-1.5')
                if len(list_container) >= 2:
                    spans = list_container[-1].find_all('span')
                    lists = [span.text.strip() for span in spans]
                    
                occupations.append({
                    "title": title,
                    "code": code,
                    "industry": industry,
                    "lists": ", ".join(lists),
                    "link": link
                })
            
            print(f"Extracted {len(articles)} occupations from page {page_num}")
            page_num += 1
            
        await browser.close()
        
    # Save the updated occupations
    with open("occupations.json", "w", encoding="utf-8") as f:
        json.dump(occupations, f, indent=4)
        
    print(f"Successfully saved {len(occupations)} occupations to occupations.json!")

if __name__ == "__main__":
    asyncio.run(main())
