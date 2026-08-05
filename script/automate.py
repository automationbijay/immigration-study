import time
from playwright.sync_api import sync_playwright
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Get the absolute path to index.html
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = f"file://{current_dir}/index.html"
    
    print(f"Opening {file_path}")
    page.goto(file_path)

    # Give the page a moment to load background and fonts
    time.sleep(1)

    # Initial state should be 5 points (state nomination default)
    initial_score = page.locator("#total-score").inner_text()
    print(f"Initial score: {initial_score}")

    # Set Age to 25-32 (30 pts)
    page.locator("#age").select_option("30")
    
    # Set English to Superior (20 pts)
    page.locator("#english").select_option("20")

    # Set Australian Employment to 3-4 years (10 pts)
    page.locator("#aus-exp").select_option("10")
    
    # Wait for the animation to finish
    time.sleep(1)
    
    final_score = page.locator("#total-score").inner_text()
    print(f"Final score: {final_score}")
    
    # Save a screenshot
    screenshot_path = os.path.join(current_dir, "temp", "screenshot.png")
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    # Verify score
    # Expected: 5 (default) + 30 + 20 + 10 = 65
    assert final_score == "65", f"Expected score 65, got {final_score}"
    print("Test passed: Score successfully calculated!")

    context.close()
    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
