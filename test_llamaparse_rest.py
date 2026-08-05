import os
import requests

API_KEY = "llx-WrFAtU3il9s9posD2MrphdkQEY9UJMYDkOzfg72KJWaTgFz3"
BASE_URL = "https://api.cloud.llamaindex.ai/api/parsing"

# 1. Upload
with open("two-column-resume-template-blue.pdf", "rb") as f:
    files = {"file": f}
    headers = {"Authorization": f"Bearer {API_KEY}"}
    data = {"tier": "fast"}
    print("Uploading...")
    res = requests.post(f"{BASE_URL}/upload", headers=headers, files=files, data=data)
    print(res.status_code, res.text)
    
    if res.status_code == 200:
        job_id = res.json()["id"]
        print(f"Job ID: {job_id}")
        
        # 2. Poll
        import time
        while True:
            time.sleep(2)
            poll_res = requests.get(f"{BASE_URL}/job/{job_id}", headers=headers)
            print(poll_res.status_code, poll_res.text)
            status = poll_res.json().get("status")
            if status == "SUCCESS":
                break
            elif status == "ERROR":
                print("Error!")
                break
                
        # 3. Get Markdown
        md_res = requests.get(f"{BASE_URL}/job/{job_id}/result/markdown", headers=headers)
        print(md_res.status_code)
        if md_res.status_code == 200:
            print("Markdown fetched!")
