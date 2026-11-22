import os
import sys
import json
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

def main():
    # Load environment variables from .env file in root
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
    
    email = os.getenv("IMMITRACKER_EMAIL")
    password = os.getenv("IMMITRACKER_PASSWORD")

    if not email or not password:
        print("Error: IMMITRACKER_EMAIL or IMMITRACKER_PASSWORD not set in .env")
        sys.exit(1)

    print(f"Starting process for {email}")

    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        # Load the saved state if it exists to bypass login
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        state_file = os.path.join(root_dir, "temp", "auth_state.json")
        
        if os.path.exists(state_file):
            print(f"Loading saved session state from {state_file}...")
            context = browser.new_context(storage_state=state_file)
            page = context.new_page()
        else:
            print("No saved state found. Proceeding with normal login...")
            context = browser.new_context()
            page = context.new_page()
            
            print("Navigating to login page...")
            page.goto("https://myimmitracker.com/en/login")
            
            try:
                print("Filling in credentials...")
                page.fill('input[type="email"], input[name="email"]', email)
                page.fill('input[type="password"], input[name="password"]', password)
                
                print("Clicking submit button...")
                page.click('button[type="submit"], input[type="submit"], button:has-text("Sign in")')
                
                page.wait_for_url(lambda url: "login" not in url, timeout=10000)
                print("Login successful.")
                
                # Save the new state since we logged in successfully
                os.makedirs(os.path.dirname(state_file), exist_ok=True)
                context.storage_state(path=state_file)
                print("New session state saved.")
            except Exception as e:
                print("Captcha or login timeout encountered. Proceeding to scrape without logging in...")

        target_url = "https://myimmitracker.com/en/au/trackers/expression-of-interest-sc189"
        print(f"Navigating to target url: {target_url}")
        page.goto(target_url)

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
            
        print("Extracting rows...")
        data = []
        rows = page.locator('.ag-row:not(.ag-row-empty)').all()
        for row in rows:
            cells = row.locator('.ag-cell').all()
            cell_texts = [cell.text_content().strip() for cell in cells]
            
            case_id = ""
            user_el = row.locator('a[href*="/cases/case-"]')
            if user_el.count() > 0:
                href = user_el.first.get_attribute("href")
                if href:
                    case_id = href.split('/')[-1]
                if len(cell_texts) > 0 and not cell_texts[0]:
                    cell_texts[0] = user_el.first.text_content().strip()
                    
            cell_texts.insert(0, case_id)
            
            if len(headers) > len(cell_texts):
                cell_texts.extend([""] * (len(headers) - len(cell_texts)))
            elif len(cell_texts) > len(headers):
                headers.extend([f"Col_{i}" for i in range(len(headers), len(cell_texts))])
                    
            if any(cell_texts[1:]):
                data.append(dict(zip(headers, cell_texts)))

        output_file = "temp/table_output.json"
        os.makedirs("temp", exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        print(f"Data extracted successfully! ({len(data)} rows saved to {output_file})")
        
        page.wait_for_timeout(3000)
        browser.close()

if __name__ == "__main__":
    main()
