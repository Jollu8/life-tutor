"""Prevent deployment of a site with missing or incomplete advice data."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=json.loads((root/'assets/advice.json').read_text())
translated=json.loads((root/'assets/advice.ru.json').read_text())
assert len(source['entries'])==len(translated['entries'])==608
assert len(translated['sections'])==33
assert len({e['id'] for e in translated['entries']})==608
assert [e['id'] for e in source['entries']]==[e['id'] for e in translated['entries']]
sections={s['id'] for s in translated['sections']}
for before,after in zip(source['entries'],translated['entries']):
 assert after['title'].strip() and after['section'] in sections
 assert after['evidence'][0]==before['evidence'][0]
 assert after['path']==before['path']
 for field in ['sources','benefit','notes']:
  urls=lambda s:set(re.findall(r'https?://[^\s<>]+',s))
  assert urls(before.get(field,''))==urls(after.get(field,'')),(after['id'],field)
 for key,value in after.items():
  if key!='path':assert not re.search('[\u3400-\u9fff]',value),(after['id'],key)
print('PASS: 608 Russian entries, 33 topics, unique IDs, unchanged source URLs and evidence grades.')
