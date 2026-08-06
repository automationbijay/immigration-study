import json

def embed_json():
    with open("crs_points.json", "r", encoding="utf-8") as f:
        data = f.read()
        
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()
        
    # Replace the fetch logic by finding the block
    start_str = "        async function loadFormData() {"
    end_str = "        }\n"
    
    start_idx = html.find(start_str)
    end_idx = html.find(end_str, start_idx) + len(end_str)
    
    if start_idx != -1:
        replacement = f"        const formData = {data};\n"
        html = html[:start_idx] + replacement + html[end_idx:]
        
    html = html.replace("loadFormData();", "renderForm(formData);")
    
    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)
        
if __name__ == "__main__":
    embed_json()
