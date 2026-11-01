#!/usr/bin/env python3
"""Rebuild the three original medical curricula in a temporary directory.

By default, compare all 15 generated JSON files with the release without
modifying it. --write replaces those 15 files; rebuild runtime data afterwards.
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
parser.add_argument('--write', action='store_true', help='replace the 15 medical JSON files')
args = parser.parse_args()
results = []
with tempfile.TemporaryDirectory(prefix='knowledge-graph-medical-rebuild-') as temporary:
    temporary = Path(temporary)
    for subject in ('med', 'tcm', 'herbal'):
        source = ROOT / 'scripts' / 'curriculum-medical' / subject
        work = temporary / subject
        shutil.copytree(source, work)
        process = subprocess.run(
            [sys.executable, str(work / ('build_' + subject + '.py'))],
            cwd=work, text=True, capture_output=True, check=True,
        )
        for part in ('topics', 'questions', 'dependencies', 'sources', 'coverage'):
            generated = work / (part + '.json')
            destination = ROOT / 'data' / (subject + '-' + part + '.json')
            json.loads(generated.read_text(encoding='utf-8'))
            identical = generated.read_bytes() == destination.read_bytes()
            if args.write:
                shutil.copy2(generated, destination)
            results.append({
                'file': destination.name,
                'identical_before_write': identical,
                'sha256': hashlib.sha256(generated.read_bytes()).hexdigest(),
            })
passed = args.write or all(row['identical_before_write'] for row in results)
print(json.dumps({'result': 'PASS' if passed else 'FAIL', 'mode': 'write' if args.write else 'compare', 'files': results}, ensure_ascii=False, indent=2))
raise SystemExit(0 if passed else 1)
