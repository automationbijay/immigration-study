import urllib.request
import json
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
url = "https://api.github.com/repos/automationbijay/immigration-study/issues?state=open"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode('utf-8'))
        for i in data:
            print(f"Issue #{i['number']}: {i['title']}")
            print(f"{i['body']}")
            print("-" * 80)
except Exception as e:
    print(e)
