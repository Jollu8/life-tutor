"""Translate the public source with local Argos models (Chinese → English → Russian).
Requires ctranslate2 and sentencepiece; models live outside this repository.
Resumable sentence cache is stored in /tmp/life-bloom-translations.json.
"""
import json,re,time,os
from pathlib import Path
import ctranslate2,sentencepiece
ROOT=Path(__file__).resolve().parent.parent
source=json.loads((ROOT/'assets/advice.json').read_text())
model_root=Path(os.environ.get('ARGOS_PACKAGES_DIR','/tmp/life-bloom-models'))
models=[]
for name in ['translate-zh_en-1_9','translate-en_ru-1_9']:
 p=model_root/name
 models.append((ctranslate2.Translator(str(p/'model'),device='cpu',compute_type='int8',inter_threads=2,intra_threads=4),sentencepiece.SentencePieceProcessor(model_file=str(p/'sentencepiece.model'))))
cachepath=Path('/tmp/life-bloom-translations.json')
cache=json.loads(cachepath.read_text()) if cachepath.exists() else {}
# Keep URLs and bibliography written in Latin characters intact.
def pieces(s):
 return [x for x in re.split(r'(https?://[^\s<>]+|\n+|(?<=[。！？；]))',s) if x]
def chinese(s): return bool(re.search('[\u3400-\u9fff]',s))
texts=[]
for e in source['sections']+source['entries']:
 for k,v in e.items():
  if k not in ['path','id','section']:
   for p in pieces(v):
    if chinese(p) and not p.startswith('http') and p not in cache and p not in texts:texts.append(p)
print(f'Translating {len(texts)} segments; cached {len(cache)}',flush=True)
start=time.time()
for i in range(0,len(texts),32):
 batch=texts[i:i+32];output=batch
 for model,sp in models:
  tokens=[sp.encode(t,out_type=str) for t in output]
  result=model.translate_batch(tokens,beam_size=2,max_batch_size=32,max_decoding_length=768)
  output=[sp.decode(r.hypotheses[0]) for r in result]
 cache.update(zip(batch,output));cachepath.write_text(json.dumps(cache,ensure_ascii=False))
 if i%160==0:print(f'{i+len(batch)}/{len(texts)} segments, {time.time()-start:.0f}s',flush=True)
for e in source['sections']+source['entries']:
 for k,v in list(e.items()):
  if k not in ['path','id','section']:e[k]=' '.join(cache.get(p,p) for p in pieces(v))
source['translation']={'method':'Argos Translate 1.9 zh-en-ru, local machine translation','source':'HowToLiveBetter offline export 2026-09-25, commit 8276cae'}
(ROOT/'assets/advice.ru.json').write_text(json.dumps(source,ensure_ascii=False))
print('DONE',flush=True)
