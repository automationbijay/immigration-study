import json
from playwright.sync_api import sync_playwright

def scrape_calculator():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://www.siaimmigration.com/fsw-67point-calculator")
        page.wait_for_load_state("networkidle")
        
        content = page.content()
        with open("page_content.html", "w", encoding="utf-8") as f:
            f.write(content)
            
        print("HTML content saved.")
        browser.close()

if __name__ == "__main__":
    scrape_calculator()
