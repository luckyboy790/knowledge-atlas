#!/usr/bin/env python3
"""Regenerate offline-safe data scripts from the auditable JSON sources."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
RUNTIME = DATA / 'runtime'
RUNTIME.mkdir(exist_ok=True)
files = [
    'topics.json', 'dependencies.json', 'questions.json', 'id-aliases.json',
    'cn-curriculum-standards.json', 'subject-bridge-dependencies.json',
    *[f'math-university-{part}.json' for part in ('topics', 'dependencies', 'questions')],
    *[f'math-probability-{part}.json' for part in ('topics', 'dependencies', 'questions', 'sources', 'coverage')],
    *[f'{subject}-{part}.json' for subject in ('physics', 'chemistry')
      for part in ('topics', 'dependencies', 'questions', 'sources', 'highschool-coverage')],
    *[f'{subject}-{part}.json' for subject in ('cs408', 'med', 'tcm', 'herbal', 'uphysics', 'uchemistry', 'biology', 'geography')
      for part in ('topics', 'dependencies', 'questions', 'sources', 'coverage')],
]
manifest = {}
for filename in files:
    path = DATA / filename
    if not path.exists():
        raise SystemExit(f'Missing source: {filename}')
    raw = path.read_text(encoding='utf-8')
    json.loads(raw)
    source = ('/* Generated from data/' + filename + '; run scripts/build_runtime.py. */\n'
              + 'window.ToyData.register(' + json.dumps(filename) + ', '
              + json.dumps(raw, ensure_ascii=False).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
              + ');\n')
    digest = hashlib.sha256(source.encode('utf-8')).hexdigest()[:12]
    output = f'{path.stem}.{digest}.js'
    (RUNTIME / output).write_text(source, encoding='utf-8')
    manifest[filename] = output

book_index = json.loads((DATA / 'k12' / 'index.json').read_text())
for books in [*book_index['books'].values(), book_index['exercises'].values()]:
    for key, filename in books:
        assert (DATA / 'k12' / filename).is_file()
        manifest[key] = '../k12/' + filename

(ROOT / 'assets' / 'data-manifest.js').write_text(
    '/* Generated runtime-data file map. */\nwindow.ToyDataFiles = '
    + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
for old in RUNTIME.glob('*.js'):
    if old.name not in manifest.values():
        old.unlink()
print(json.dumps({'runtime_files': len(manifest), 'source_bytes': sum((DATA/f).stat().st_size for f in files)}, ensure_ascii=False))
