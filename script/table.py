from playwright.sync_api import sync_playwright
import pandas as pd
from bs4 import BeautifulSoup
import os

def main():
    print("Starting browser...")
    with sync_playwright() as p:
        # Launching in headless mode to run in background, set to False to see the browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating to https://www.anzscosearch.com/skilled-occupation-list/...")
        # Wait until the DOM is loaded to prevent timeout, we'll explicitly wait for the table later
        page.goto("https://www.anzscosearch.com/skilled-occupation-list/", wait_until="domcontentloaded", timeout=60000)
        
        print("Waiting for tables to load...")
        try:
            # Wait for at least one table to appear on the page
            page.wait_for_selector("table", timeout=15000)
        except Exception as e:
            print("Timeout waiting for table or no table found. Proceeding to parse anyway...")
            
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        tables = soup.find_all('table')
        print(f"Found {len(tables)} table(s) on the page.")
        
        # Create an output directory for the scraped data
        output_dir = "output"
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            page.select_option("select[name='myTable_length']", "100")
            page.wait_for_timeout(1000)
        except Exception as e:
            pass

        all_dfs = []
        page_num = 1
        
        while True:
            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', id='myTable')
            if not table:
                table = soup.find('table')
                
            try:
                # pandas read_html extracts table data directly into a DataFrame
                import io
                df = pd.read_html(io.StringIO(str(table)))[0]
                all_dfs.append(df)
                print(f"Scraped page {page_num} with {len(df)} rows.")
            except Exception as e:
                print(f"Could not parse table on page {page_num}: {e}")
                
            next_btn = page.locator("button.next").first
            if not next_btn.is_visible():
                break
                
            class_name = next_btn.get_attribute("class") or ""
            if "ui-state-disabled" in class_name or "disabled" in class_name:
                break
                
            next_btn.click()
            page.wait_for_timeout(1000)
            page_num += 1

        if all_dfs:
            final_df = pd.concat(all_dfs, ignore_index=True)
            output_path = os.path.join(output_dir, "skilled_occupation_list.csv")
            final_df.to_csv(output_path, index=False)
            print(f"Successfully saved {len(final_df)} rows to {output_path}")

        browser.close()
        print("Scraping completed.")

if __name__ == "__main__":
    main()
