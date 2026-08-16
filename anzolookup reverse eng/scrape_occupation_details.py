import asyncio
import json
import csv
from playwright.async_api import async_playwright

STATES = ["ACT", "NT", "NSW", "QLD", "SA", "TAS", "VIC", "WA"]
VISAS = ["189", "190", "491", "485", "482", "186", "494", "407"]
LIST_COLS = ["All applicable lists", "Skilled visas", "Employer-sponsored", "Regional employer-sponsored", "Training", "Skilled assessing authorities"]
QUICK_COLS = ["SKILLED VISAS", "EMPLOYER-SPONSORED", "STATE NOMINATION"]

async def process_url(context, occupation, semaphore):
    async with semaphore:
        page = await context.new_page()
        try:
            await page.goto(occupation["link"], timeout=60000)
            await page.wait_for_selector('h1', timeout=15000)
            
            # Initialize all columns to empty strings
            occupation["Assessing Authority"] = ""
            for v in VISAS:
                occupation[f"Visa_{v}"] = ""
            for l in LIST_COLS:
                occupation[f"List_{l}"] = ""
            for q in QUICK_COLS:
                occupation[f"Quick_{q}"] = ""
            for state in STATES:
                occupation[f"{state}_190"] = ""
                occupation[f"{state}_491"] = ""
                occupation[f"{state}_Streams"] = ""
            
            # 1. Assessing Authority
            auth_locator = page.locator('p:has-text("Assessing authority:")')
            if await auth_locator.count() > 0:
                occupation["Assessing Authority"] = (await auth_locator.first.inner_text()).replace("Assessing authority:", "").strip()
                
            # 2. Quick Eligibility
            quick_section = page.locator('section').filter(has=page.locator('h2:has-text("Quick eligibility")'))
            if await quick_section.count() > 0:
                cards = quick_section.first.locator('div.rounded-2xl')
                for i in range(await cards.count()):
                    card = cards.nth(i)
                    lines = [line.strip() for line in (await card.inner_text()).split('\n') if line.strip()]
                    if len(lines) >= 2:
                        key = lines[0].upper()
                        val = ", ".join(lines[1:])
                        if key in QUICK_COLS:
                            occupation[f"Quick_{key}"] = val

            # 3. Visa Availability
            visa_section = page.locator('section').filter(has=page.locator('h2:has-text("Visa availability")'))
            if await visa_section.count() > 0:
                cards = visa_section.first.locator('div.rounded-2xl')
                for i in range(await cards.count()):
                    card = cards.nth(i)
                    lines = [line.strip() for line in (await card.inner_text()).split('\n') if line.strip()]
                    if len(lines) >= 3:
                        visa_subclass = lines[0]
                        status = lines[1].replace("✓ Eligible", "Eligible").replace("❌ Ineligible", "Ineligible")
                        list_info = lines[2]
                        if visa_subclass in VISAS:
                            occupation[f"Visa_{visa_subclass}"] = f"{status} | {list_info}"

            # 4. State Nomination Basic
            state_nom_section = page.locator('section').filter(has=page.locator('h2:has-text("State nomination availability")'))
            if await state_nom_section.count() > 0:
                rows = state_nom_section.first.locator('div.grid')
                for i in range(await rows.count()):
                    row = rows.nth(i)
                    lines = [line.strip() for line in (await row.inner_text()).split('\n') if line.strip()]
                    if len(lines) >= 4:
                        state_abbr = lines[0].upper()
                        if state_abbr in STATES:
                            v190 = lines[2].replace("✓ Eligible", "Eligible").replace("❌ Ineligible", "Ineligible")
                            v491 = lines[3].replace("✓ Eligible", "Eligible").replace("❌ Ineligible", "Ineligible")
                            occupation[f"{state_abbr}_190"] = v190
                            occupation[f"{state_abbr}_491"] = v491

            # 5. State-specific stream details
            streams_summary = page.locator('summary:has-text("State-specific stream details")')
            if await streams_summary.count() > 0:
                details_tag = page.locator('details').filter(has=streams_summary)
                state_blocks = details_tag.locator('div.rounded-2xl.bg-white')
                for i in range(await state_blocks.count()):
                    block = state_blocks.nth(i)
                    h3_loc = block.locator('h3')
                    if await h3_loc.count() > 0:
                        state_heading = await h3_loc.first.inner_text()
                        state_abbr = state_heading.split('-')[0].strip().upper()
                        if state_abbr in STATES:
                            block_text = await block.inner_text()
                            clean_text = " | ".join([line.strip() for line in block_text.split('\n') if line.strip()])
                            occupation[f"{state_abbr}_Streams"] = clean_text

            # 6. List details
            list_section = page.locator('section').filter(has=page.locator('h2:has-text("List details")'))
            if await list_section.count() > 0:
                cards = list_section.first.locator('div.rounded-2xl')
                for i in range(await cards.count()):
                    card = cards.nth(i)
                    lines = [line.strip() for line in (await card.inner_text()).split('\n') if line.strip()]
                    if len(lines) >= 2:
                        key = lines[0]
                        val = ", ".join(lines[1:])
                        if key in LIST_COLS:
                            occupation[f"List_{key}"] = val
            
        except Exception as e:
            print(f"Error scraping {occupation['link']}: {e}")
        finally:
            await page.close()
            
        print(f"Scraped fully flat details for {occupation['code']} - {occupation['title']}")

async def main():
    print("Starting flat detailed extraction...")
    try:
        with open("occupations.json", "r", encoding="utf-8") as f:
            occupations = json.load(f)
    except FileNotFoundError:
        print("occupations.json not found!")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        semaphore = asyncio.Semaphore(10)
        
        tasks = []
        for occ in occupations:
            tasks.append(process_url(context, occ, semaphore))
            
        await asyncio.gather(*tasks)
        await browser.close()
        
        # Build fieldnames
        fieldnames = ["title", "code", "industry", "link", "Assessing Authority"]
        for q in QUICK_COLS:
            fieldnames.append(f"Quick_{q}")
        for v in VISAS:
            fieldnames.append(f"Visa_{v}")
        for l in LIST_COLS:
            fieldnames.append(f"List_{l}")
        for state in STATES:
            fieldnames.extend([f"{state}_190", f"{state}_491", f"{state}_Streams"])
            
        # Clean up occupations
        clean_occupations = []
        for occ in occupations:
            clean_occ = {k: occ.get(k, "") for k in fieldnames}
            clean_occupations.append(clean_occ)
            
        with open("occupations_details_ultra_clean.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for occ in clean_occupations:
                writer.writerow(occ)
                
        with open("occupations_details_ultra_clean.json", "w", encoding="utf-8") as f:
            json.dump(clean_occupations, f, indent=4)
            
        print("Extraction complete. Saved to occupations_details_ultra_clean.csv")

if __name__ == "__main__":
    asyncio.run(main())
