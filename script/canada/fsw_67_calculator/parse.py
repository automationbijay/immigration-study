from bs4 import BeautifulSoup
import json
import re

def parse_html():
    with open("page_content.html", "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, "html.parser")
    
    # Try to find elements with points, usually 'select', 'input' radio.
    # The structure might use 'select' tags
    data = []
    
    # 1. Let's look for selects
    selects = soup.find_all('select')
    for select in selects:
        select_data = {
            'name': select.get('name', 'unknown'),
            'id': select.get('id', 'unknown'),
            'options': []
        }
        for option in select.find_all('option'):
            text = option.get_text(strip=True)
            value = option.get('value', '')
            select_data['options'].append({'text': text, 'value': value})
        data.append(select_data)
        
    # 2. Look for radio inputs
    radios = soup.find_all('input', type='radio')
    radio_group = {}
    for radio in radios:
        name = radio.get('name', 'unknown')
        if name not in radio_group:
            radio_group[name] = []
        
        value = radio.get('value', '')
        # Try to find label
        label = soup.find('label', {'for': radio.get('id', '')})
        text = label.get_text(strip=True) if label else radio.next_sibling
        if isinstance(text, str):
            text = text.strip()
        else:
            text = ""
        
        radio_group[name].append({'text': text, 'value': value})
        
    for name, options in radio_group.items():
        data.append({'name': name, 'type': 'radio', 'options': options})
        
    with open("parsed_structure.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)
        
    print("Parsed data saved.")

if __name__ == "__main__":
    parse_html()
