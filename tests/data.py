"""Fail publication if unreviewed legacy data leaks into the localized edition."""
import json,re,runpy
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'assets/advice.json').read_text())
legacy=json.loads((root/'assets/archive/advice.machine.ru.json').read_text())
current=json.loads((root/'assets/advice.ru.json').read_text())
assert current['edition']=='russia-moscow'
assert len(source['entries'])==len(legacy['entries'])==608
source_ids={e['id'] for e in source['entries']}
published={e['id'] for e in current['entries']}
archived={e['id'] for e in current['archive']}
assert len(published)==len(current['entries']) and len(archived)==len(current['archive'])
assert not published & archived
assert source_ids == ((published & source_ids) | archived), 'Every original record needs an explicit disposition'
assert len(published)>=50
assert sum(e['region']=='moscow' for e in current['entries'])>=10
sections={s['id'] for s in current['sections']}
assert sections=={e['section'] for e in current['entries']}
allowed=['mchs.gov.ru','msph.ru','cbr.ru','nalog.gov.ru','nalog.ru','sfr.gov.ru','rospotrebnadzor.ru','rostrud.gov.ru','mos.ru','mgfoms.ru','roszdravnadzor.gov.ru','mos-gaz.ru','dszn.ru','sechenov.ru','who.int','cdc.gov','cisa.gov','content.govdelivery.com']
for entry in current['entries']:
 assert entry['status']=='published'
 assert entry['region'] in ['general','russia','moscow']
 assert entry['basis'] in ['official','guidance','editorial']
 assert entry['section'] in sections
 assert entry['title'].strip() and entry['summary'].strip() and entry['steps'].strip()
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',entry['reviewedAt'])
 assert not any(k in entry for k in ['evidence','benefit','sources','cost']), 'Do not inherit untranslated legacy fields'
 text=' '.join(entry.get(k,'') for k in ['title','summary','steps','notes'])
 assert not re.search(r'[\u3400-\u9fff]|В Китае|юан|12356|12355|96110|NHTSA|ICP',text),entry['id']
 if entry['basis']!='editorial':assert entry['references'],entry['id']
 if entry['region']!='general':assert entry['basis']=='official'
 for ref in entry['references']:
  parsed=urlparse(ref['url'])
  assert parsed.scheme=='https' and any(parsed.hostname==h or parsed.hostname.endswith('.'+h) for h in allowed)
  assert ref['title'] and ref['checkedAt']==entry['reviewedAt']
for entry in current['archive']:
 assert set(entry)=={'id','section','title','path','status','reason'},'Archive index must not contain old instructions'
 assert entry['status']=='archived'
# A repeatable build must not silently lose edited data.
before=(root/'assets/advice.ru.json').read_bytes()
runpy.run_path(str(root/'content/build_localized.py'))
assert before==(root/'assets/advice.ru.json').read_bytes()
print(f'PASS: {len(published)} localized cards; all 608 source IDs accounted for; provenance and region metadata valid; machine translation isolated; build reproducible.')
