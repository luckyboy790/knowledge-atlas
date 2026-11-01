#!/usr/bin/env python3
"""Reproduce the two university-science curricula with Python's standard library.

By default, generate in a temporary directory and compare all 10 JSON files
without changing the release data. --write explicitly replaces those files;
then rebuild runtime data and rerun content and application checks.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--write', action='store_true', help='replace the 10 university-science JSON files')
args = parser.parse_args()
results = []
with tempfile.TemporaryDirectory(prefix='knowledge-graph-university-rebuild-') as temporary:
    temporary = Path(temporary)
    for subject in ('uphysics', 'uchemistry'):
        source = ROOT / 'scripts' / 'curriculum-university' / subject
        work = temporary / subject
        shutil.copytree(source, work, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        subprocess.run(
            [sys.executable, str(work / ('build_' + subject + '.py'))],
            cwd=work, text=True, capture_output=True, check=True,
        )
        for part in ('topics', 'questions', 'dependencies', 'sources', 'coverage'):
            filename = subject + '-' + part + '.json'
            generated = work / filename
            destination = ROOT / 'data' / filename
            json.loads(generated.read_text(encoding='utf-8'))
            identical = generated.read_bytes() == destination.read_bytes()
            if args.write:
                shutil.copy2(generated, destination)
            results.append({
                'file': filename,
                'identical_before_write': identical,
                'sha256': hashlib.sha256(generated.read_bytes()).hexdigest(),
            })

passed = args.write or all(row['identical_before_write'] for row in results)
print(json.dumps({'result': 'PASS' if passed else 'FAIL',
                  'mode': 'write' if args.write else 'compare',
                  'files': results}, ensure_ascii=False, indent=2))
raise SystemExit(0 if passed else 1)
