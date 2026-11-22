import asyncio
import json
import os
from playwright.async_api import async_playwright

async def scrape_gdaymayte(url: str):
    print(f"Starting scrape for {url}")
    async with async_playwright() as p:
        print("Launching headless Chromium browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="domcontentloaded")

        print("Waiting 5 seconds for dynamic content to load...")
        await page.wait_for_timeout(5000)

        print("Extracting listings...")
        # Get all anchor tags and their inner text to capture subpage URLs
        links = await page.evaluate("""() => {
            return Array.from(document.querySelectorAll('a')).map(a => ({
                href: a.href,
                text: a.innerText.trim()
            }));
        }""")

        # Also grab the raw text to fallback if needed
        page_text = await page.evaluate("() => document.body.innerText")

        result = [
            {
                "url": url,
                "links": links,
                "extracted_text": page_text
            }
        ]

        print("Closing browser...")
        await browser.close()

        print("Scraping completed successfully.")
        return result

def main():
    url = "https://www.gdaymayte.com.au/visas/189"
    data = asyncio.run(scrape_gdaymayte(url))

    # Save output to temp folder as per Windmill rules
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    output_path = os.path.join(temp_dir, "gdaymayte_output.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Data saved successfully to {output_path}")

if __name__ == "__main__":
    main()
