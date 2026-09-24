import json
import codecs
with codecs.open('issues.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)
    for i in data:
        print(f"Issue #{i['number']}: {i['title']}")
        print(f"{i['body']}")
        print("-" * 80)
