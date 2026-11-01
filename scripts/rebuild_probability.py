#!/usr/bin/env python3
"""Rebuild the five probability files in isolation; compare by default.

--write is an explicit authoring operation. Any changed content needs a fresh
independent review and rebuilt runtime payloads before release.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FILES=[f'math-probability-{p}.json' for p in ('topics','questions','dependencies','sources','coverage')]
parser=argparse.ArgumentParser()
parser.add_argument('--write', action='store_true', help='write rebuilt course JSON, requiring review if content changed')
args=parser.parse_args()
report_path=ROOT/'validation/probability-rebuild.json'
report={'date':'2026-10-31','mode':'write' if args.write else 'compare_only','status':'IN_PROGRESS','files':[]}
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
try:
    with tempfile.TemporaryDirectory(prefix='probability-rebuild-') as tmp:
        output=Path(tmp)
        result=subprocess.run([sys.executable,str(ROOT/'scripts/curriculum-probability/build.py'),'--out',str(output)],capture_output=True,text=True)
        if result.returncode:
            raise RuntimeError('Curriculum builder failed: '+result.stderr.strip())
        topics=json.loads((output/FILES[0]).read_text())
        questions=json.loads((output/FILES[1]).read_text())
        assert len(topics)==100 and len({t['id'] for t in topics})==100,'Incomplete topic build'
        assert len(questions)==200 and len({q['id'] for q in questions})==200,'Incomplete question build'
        for name in FILES:
            generated=output/name;current=ROOT/'data'/name
            identical=current.exists() and current.read_bytes()==generated.read_bytes()
            entry={'file':name,'identical_before_write':identical,'generated_sha256':digest(generated),'current_sha256_before_write':digest(current) if current.exists() else None}
            if args.write:
                current.parent.mkdir(parents=True,exist_ok=True)
                shutil.copyfile(generated,current)
                entry['written_sha256']=digest(current)
            report['files'].append(entry)
        report['all_five_identical']=all(x['identical_before_write'] for x in report['files'])
        if not args.write and not report['all_five_identical']:
            raise RuntimeError('Rebuilt files differ from delivered data; compare the listed hashes before any explicit write.')
        report['status']='PASS' if report['all_five_identical'] else 'WRITTEN_REVIEW_REQUIRED'
        report['scope']='Only the five math-probability JSON files; no original data file or core engine is modified.'
        report['limitations']=['Reproducibility is not content validation. Changed data invalidates the hash-bound content review until independently rechecked.']
except Exception as error:
    report['status']='FAIL';report['error']=str(error)
    report_path.parent.mkdir(parents=True,exist_ok=True)
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2));sys.exit(1)
report_path.parent.mkdir(parents=True,exist_ok=True)
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
