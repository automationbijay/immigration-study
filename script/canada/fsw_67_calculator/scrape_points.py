import json
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re

def scrape_calculator():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to calculator page...")
        page.goto("https://www.siaimmigration.com/fsw-67point-calculator")
        page.wait_for_load_state("networkidle")
        
        html = page.content()
        browser.close()
        
    soup = BeautifulSoup(html, "html.parser")
    data = []
    
    # 1. Selects
    selects = soup.find_all('select')
    for select in selects:
        select_data = {
            'question': select.get('name', 'unknown'),
            'options': []
        }
        for option in select.find_all('option'):
            text = option.get_text(strip=True)
            value = option.get('value', '')
            if text and "Select" not in text:
                select_data['options'].append({'text': text, 'points': value})
        if select_data['options']:
            data.append(select_data)
            
    # 2. Radios
    radios = soup.find_all('input', type='radio')
    radio_groups = {}
    
    for radio in radios:
        name = radio.get('name', 'unknown')
        if name not in radio_groups:
            radio_groups[name] = []
            
        value = radio.get('value', '')
        
        # Try to find label text
        text = ""
        
        # Check label element
        label_elem = soup.find('label', {'for': radio.get('id', '')}) if radio.get('id') else None
        if label_elem:
            text = label_elem.get_text(strip=True)
        else:
            # Check parent td or sibling
            parent_td = radio.find_parent('td')
            if parent_td:
                # usually text is before or after the radio in the same td, or in the previous td
                prev_td = parent_td.find_previous_sibling('td')
                if prev_td and prev_td.get_text(strip=True):
                    text = prev_td.get_text(strip=True)
                else:
                    text = parent_td.get_text(strip=True)
            else:
                next_sib = radio.next_sibling
                if isinstance(next_sib, str):
                    text = next_sib.strip()

        radio_groups[name].append({
            'text': text,
            'points': value
        })
        
    for name, options in radio_groups.items():
        data.append({
            'question': name,
            'options': options
        })

    # Clean up output
    for item in data:
        for opt in item['options']:
            opt['text'] = re.sub(r'\s+', ' ', str(opt.get('text', ''))).strip()

    output_path = "fsw_67_points.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
        
    print(f"Data successfully scraped and saved to {output_path}")

if __name__ == "__main__":
    scrape_calculator()
