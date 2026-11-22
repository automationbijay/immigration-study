import os
import sys
import json
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

def extract_table(url: str = "https://myimmitracker.com/en/au/trackers/consolidated-visa-tracker-sc189", auth_state_json: str = None):
    # Load environment variables from .env file in root
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
    
    email = os.getenv("IMMITRACKER_EMAIL")
    password = os.getenv("IMMITRACKER_PASSWORD")

    print("Ensuring Playwright browsers are installed...")
    os.system("playwright install chromium")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        if auth_state_json:
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
                f.write(auth_state_json)
                temp_state_file = f.name
            print("Loading session state from provided JSON...")
            context = browser.new_context(storage_state=temp_state_file)
            page = context.new_page()
            # Clean up temp file
            os.unlink(temp_state_file)
        else:
            context = browser.new_context()
            page = context.new_page()
            
            if email and password:
                print("Navigating to login page...")
                page.goto("https://myimmitracker.com/en/login")
                
                try:
                    print("Filling in credentials...")
                    page.fill('input[type="email"], input[name="email"]', email)
                    page.fill('input[type="password"], input[name="password"]', password)
                    
                    print("Clicking submit button...")
                    page.click('button[type="submit"], input[type="submit"], button:has-text("Sign in")')
                    
                    page.wait_for_url(lambda u: "login" not in u, timeout=10000)
                    print("Login successful.")
                except Exception as e:
                    print("Captcha or login timeout encountered. Proceeding to scrape without logging in...")
            else:
                print("No credentials found in .env. Proceeding without login...")

        print(f"Navigating to target url: {url}")
        page.goto(url)

        try:
            page.wait_for_function('document.querySelectorAll(".ag-row").length > 0', timeout=20000)
        except Exception as e:
            print("No ag-row found.", e)
            browser.close()
            return []

        print("Extracting headers...")
        headers = ["Case ID"]
        for el in page.locator('.ag-header-cell-text').all():
            headers.append(el.inner_text().strip())
            
        print("Extracting rows via scroll...")
        extracted_data = {}
        consecutive_no_new_rows = 0
        
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
                    if not cells: continue
                    
                    cell_texts = [cell.text_content().strip() for cell in cells]
                    if len(cell_texts) > 0 and not cell_texts[0]:
                        cell_texts[0] = user_el.first.text_content().strip()
                        
                    new_rows_this_iteration += 1
                    cell_texts.insert(0, case_id)
                    
                    if len(headers) > len(cell_texts):
                        cell_texts.extend([""] * (len(headers) - len(cell_texts)))
                    elif len(cell_texts) > len(headers):
                        headers.extend([f"Col_{i}" for i in range(len(headers), len(cell_texts))])
                            
                    if any(cell_texts[1:]):
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
            page.wait_for_timeout(800)
            
        data = list(extracted_data.values())
        print(f"Final extracted: {len(data)} rows.")

        browser.close()
        return data

def main(auth_state_json: str = None):
    data = extract_table(auth_state_json=auth_state_json)
    
    # Windmill scripts should ideally print raw JSON arrays for the API output.
    # We output the JSON dump directly to stdout for Windmill to capture.
    print(json.dumps(data, indent=2))
    return data

if __name__ == "__main__":
    main()
