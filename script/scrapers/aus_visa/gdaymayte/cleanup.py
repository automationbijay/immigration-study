import json
import csv
import re
import os

def clean_data():
    input_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "temp", "gdaymayte_output.json")
    output_path = os.path.join(os.path.dirname(input_path), "gdaymayte_cleaned.csv")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    links = data[0].get('links', [])
    records = []
    
    for link in links:
        text = link.get('text', '')
        href = link.get('href', '')
        
        # Identify listing cards by checking if they contain 'ANZSCO'
        if 'ANZSCO' in text:
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            if len(lines) < 2:
                continue
                
            occupation = lines[0]
            anzsco = lines[1].replace('ANZSCO ', '').strip()
            
            points = ""
            date = ""
            rounds_invited = "0"
            skipped = "No"
            
            if len(lines) > 2:
                points_date_str = lines[2]
                if '·' in points_date_str:
                    parts = points_date_str.split('·')
                    points = parts[0].replace('pts', '').strip()
                    date = parts[1].strip()
                elif 'Not invited' in points_date_str:
                    points = "N/A"
                    date = "Not invited since 2022"
                else:
                    date = points_date_str
            
            for i in range(3, len(lines)):
                if 'Invited in' in lines[i]:
                    rounds_invited = lines[i].replace('Invited in', '').replace('rounds', '').replace('round', '').strip()
                if lines[i] == 'SKIPPED':
                    skipped = "Yes"
                    
            records.append({
                'Occupation': occupation,
                'ANZSCO Code': anzsco,
                'Points': points,
                'Last Invited Date': date,
                'Rounds Invited': rounds_invited,
                'Skipped Recently': skipped,
                'Subpage URL': href
            })
            
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Occupation', 'ANZSCO Code', 'Points', 'Last Invited Date', 'Rounds Invited', 'Skipped Recently', 'Subpage URL']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in records:
            writer.writerow(row)
            
    print(f"Data cleaned. Extracted {len(records)} records with URLs.")
    print(f"CSV saved to {output_path}")

if __name__ == "__main__":
    clean_data()
