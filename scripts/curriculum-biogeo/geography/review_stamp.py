"""Attach independent review only to the exact, previously reviewed semantics.

The allowlist is created from actual independent review records, not by this module.
A changed or newly added item retains pending status on rebuild.
"""
import hashlib,json
from pathlib import Path

REVIEW_RECORD='validation/biogeo-content-review.json'
COMPLETE='独立AI内容复核已完成；未经教师审核'
PENDING='AI作者自查完成，内容待独立AI复核；未经教师审核'

def semantic_sha256(item):
    content={k:v for k,v in item.items() if k not in {'review_status','review_record'}}
    return hashlib.sha256(json.dumps(content,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def apply_independent_review(items,allowlist=None):
    if allowlist is None:
        path=Path(__file__).with_name('independent-review-allowlist.json')
        if path.exists():
            evidence=json.loads(path.read_text(encoding='utf-8'))
            assert evidence['review_record']==REVIEW_RECORD
            allowlist=evidence['semantic_hashes']
        else:
            allowlist={}
    for item in items:
        if allowlist.get(item['id'])==semantic_sha256(item):
            item['review_status']=COMPLETE
            item['review_record']=REVIEW_RECORD
        else:
            item['review_status']=PENDING
            item.pop('review_record',None)
