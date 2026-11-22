import sys
import json
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating...")
        page.goto("https://myimmitracker.com/en/au/trackers/expression-of-interest-sc189", wait_until="networkidle")
        
        try:
            page.wait_for_function('document.querySelectorAll(".ag-row").length > 0', timeout=20000)
        except Exception as e:
            print("No ag-row found.", e)
            browser.close()
            return

        print("Extracting headers...")
        headers = ["Case ID"]
        for el in page.locator('.ag-header-cell-text').all():
            headers.append(el.inner_text().strip())
            
        print("Extracting rows via scroll...")
        extracted_data = {}
        consecutive_no_new_rows = 0
        
        # We need to use page.evaluate to get rows because python locator.all() might be slow during scroll
        # Actually, python locator is fine if we wait for stability.
        
        while consecutive_no_new_rows < 3:
            rows = page.locator('.ag-row:not(.ag-row-empty)').all()
            new_rows_this_iteration = 0
            
            for row in rows:
                user_el = row.locator('a[href*="/cases/case-"]')
                if user_el.count() == 0:
                    continue
                    
                href = user_el.first.get_attribute("href")
                if not href: continue
                case_id = href.split('/')[-1]
                
                if case_id not in extracted_data:
                    cells = row.locator('.ag-cell').all()
                    cell_texts = [cell.text_content().strip() for cell in cells]
                    if len(cell_texts) > 0 and not cell_texts[0]:
                        cell_texts[0] = user_el.first.text_content().strip()
                        
                    new_rows_this_iteration += 1
                    cell_texts.insert(0, case_id)
                    extracted_data[case_id] = dict(zip(headers, cell_texts))
            
            if new_rows_this_iteration == 0:
                consecutive_no_new_rows += 1
            else:
                consecutive_no_new_rows = 0
                print(f"Extracted {len(extracted_data)} total rows so far...")
                
            page.evaluate('''() => {
                const viewport = document.querySelector('.ag-body-viewport');
                if (viewport) {
                    viewport.scrollBy(0, 800);
                }
            }''')
            page.wait_for_timeout(500)
            
            # For testing, we stop at 100
            if len(extracted_data) > 100:
                print("Reached 100 rows, breaking early for test.")
                break
                
        print(f"Final extracted: {len(extracted_data)} rows.")
        browser.close()

if __name__ == "__main__":
    main()
