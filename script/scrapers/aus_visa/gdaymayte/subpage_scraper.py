import asyncio
import csv
import json
import os
import re
from playwright.async_api import async_playwright

async def scrape_subpage(url: str, page):
    print(f"Scraping {url}...")
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        await page.wait_for_timeout(2000)

        # Extract text stats directly from DOM
        stats = await page.evaluate("""() => {
            let poolMatch = document.body.innerText.match(/([\\d,]+)\\s+in the pool\\./);
            let pool_size = poolMatch ? poolMatch[1] : 'Unknown';

            let list_type = 'Unknown';
            let visas = 'Unknown';
            let assessing_authority = 'Unknown';
            let eligMatch = document.body.innerText.match(/is on the (.*?), eligible for the (.*?)\\s*visa programs\\.\\s*Skills assessment via (.*?)\\./);
            if (eligMatch) {
                list_type = eligMatch[1].trim();
                visas = eligMatch[2].trim();
                assessing_authority = eligMatch[3].trim();
            }

            let standout_stat = 'Unknown';
            let standoutEl = Array.from(document.querySelectorAll('.eyebrow')).find(el => el.textContent.trim() === 'Stand-out stat');
            if (standoutEl && standoutEl.nextElementSibling) {
                standout_stat = standoutEl.nextElementSibling.textContent.trim().replace(/\\s+/g, ' ');
            }

            let has_491 = document.body.innerText.includes('This occupation has 491 (FS) invitation history too') ? 'Yes' : 'No';

            return {pool_size, list_type, visas, assessing_authority, standout_stat, has_491};
        }""")

        pool_size = stats['pool_size']
        list_type = stats['list_type']
        visas = stats['visas']
        assessing_authority = stats['assessing_authority']
        standout_stat = stats['standout_stat']
        has_491_history = stats['has_491']

        # Extract the Cutoff History Table
        cutoff_history = await page.evaluate("""() => {
            let tables = Array.from(document.querySelectorAll('table'));
            if (tables.length === 0) return [];
            let rows = Array.from(tables[0].querySelectorAll('tr'));
            if (rows.length === 0) return [];
            let headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.innerText.trim());
            let data = [];
            for (let i = 1; i < rows.length; i++) {
                let cells = Array.from(rows[i].querySelectorAll('td')).map(td => td.innerText.trim());
                let rowData = {};
                headers.forEach((h, idx) => {
                    rowData[h] = cells[idx] || '';
                });
                data.push(rowData);
            }
            return data;
        }""")

        # Extract EOI chart data and Invitations189 from the Next.js payload
        html = await page.content()
        eoi_chart_data = "[]"
        eoi_chart_data_491fs = "[]"
        invitations189 = "[]"

        # Match the JSON block for the chart data
        chart_match = re.search(r'\\"?pools\\"?:(\{.*?\})\\?,\\"?defaultPoints\\"?[,:]', html)
        if chart_match:
            try:
                # The payload has escaped quotes, clean them up
                raw_json = chart_match.group(1).replace('\\"', '"')
                pools_data = json.loads(raw_json)
                if '189' in pools_data and 'bands' in pools_data['189']:
                    eoi_chart_data = json.dumps(pools_data['189']['bands'])
                if '491fs' in pools_data and 'bands' in pools_data['491fs']:
                    eoi_chart_data_491fs = json.dumps(pools_data['491fs']['bands'])
            except:
                pass

        # Match the JSON block for the 189 invitations cutoff history over time
        inv_match = re.search(r'\\"?invitations189\\"?:(\[.*?\])\\?,\\"?lastInvitation189\\"?[,:]', html)
        if inv_match:
            try:
                raw_json_inv = inv_match.group(1).replace('\\"', '"')
                inv_data = json.loads(raw_json_inv)
                invitations189 = json.dumps(inv_data)
            except:
                pass

        return {
            "url": url,
            "list_type": list_type,
            "visas": visas,
            "assessing_authority": assessing_authority,
            "pool_size": pool_size,
            "standout_stat": standout_stat,
            "has_491_history": has_491_history,
            "cutoff_history": json.dumps(cutoff_history),
            "eoi_chart_data_189": eoi_chart_data,
            "eoi_chart_data_491fs": eoi_chart_data_491fs,
            "invitations189_chart_data": invitations189
        }
    except Exception as e:
        print(f"Failed to scrape {url}: {e}")
        return {
            "url": url,
            "list_type": "Error",
            "visas": "Error",
            "assessing_authority": "Error",
            "pool_size": "Error",
            "standout_stat": "Error",
            "has_491_history": "Error",
            "cutoff_history": "[]",
            "eoi_chart_data_189": "[]",
            "eoi_chart_data_491fs": "[]",
            "invitations189_chart_data": "[]"
        }

async def run_scraper(limit=None):
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    input_csv = os.path.join(base_dir, "temp", "gdaymayte_cleaned.csv")
    output_csv = os.path.join(base_dir, "temp", "subpage_details.csv")

    urls = []
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Subpage URL'):
                urls.append((row['Occupation'], row['ANZSCO Code'], row['Subpage URL']))

    if limit:
        urls = urls[:limit]

    print(f"Found {len(urls)} URLs to scrape. Starting process...")

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for name, anzsco, url in urls:
            data = await scrape_subpage(url, page)
            data["Occupation"] = name
            data["ANZSCO Code"] = anzsco
            results.append(data)

        await browser.close()

    # Save to CSV
    with open(output_csv, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ["Occupation", "ANZSCO Code", "url", "list_type", "visas", "assessing_authority", "pool_size", "standout_stat", "has_491_history", "cutoff_history", "eoi_chart_data_189", "eoi_chart_data_491fs", "invitations189_chart_data"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow(row)

    print(f"Successfully saved detailed data to {output_csv}")

if __name__ == "__main__":
    # Run for all occupations
    asyncio.run(run_scraper())
