import sys
import asyncio
import json
from playwright.async_api import async_playwright

async def main(url, output_path):
    print(f"Launching browser to scrape {url}...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)
        
        print("Waiting for data table...")
        await page.wait_for_selector("table.dataTable")
        await page.wait_for_timeout(3000)
        
        print("Extracting all data natively via DataTables API...")
        data = await page.evaluate('''() => {
            if (window.jQuery && window.jQuery.fn.DataTable) {
                const table = window.jQuery("table.dataTable").DataTable();
                const nodes = table.rows().nodes();
                const results = [];
                
                const ths = Array.from(document.querySelectorAll("table.dataTable thead th"));
                const headerNames = ths.map(th => th.innerText.trim().replace(/\\n/g, ' '));
                
                for(let i=0; i<nodes.length; i++) {
                    const row = nodes[i];
                    const tds = Array.from(row.querySelectorAll("td"));
                    const item = {};
                    tds.forEach((td, index) => {
                        const header = headerNames[index] ? headerNames[index] : "Column_" + index;
                        item[header] = td.innerText.trim().replace(/\\n/g, ' ');
                    });
                    results.push(item);
                }
                return results;
            }
            return null;
        }''')
                
        if data is None:
            print("DataTables API not found. Could not scrape.")
        else:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Successfully scraped {len(data)} occupations and saved to {output_path}")
            
        await browser.close()

if __name__ == "__main__":
    url = sys.argv[1]
    output_path = sys.argv[2]
    asyncio.run(main(url, output_path))
