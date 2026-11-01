#!/usr/bin/env python3
"""Portable author checks: schema, provenance, answer keys, coverage and DAG.

These checks do not replace human subject review.  Existing course references
are checked against the frozen v14 manifest; --baseline-data also opens originals.
"""
import argparse, collections, hashlib, json, re, tempfile
from pathlib import Path
from build import build
from common import CHAPTERS

ROOT=Path(__file__).resolve().parent

def default_data_dir():
    """Prefer an author workspace; otherwise use the installed project layout."""
    return ROOT if (ROOT/'math-probability-questions.json').is_file() else ROOT.parent.parent/'data'

def run(data_dir=None, baseline_data=None):
    data_dir=Path(data_dir) if data_dir is not None else default_data_dir()
    items={k:json.loads((data_dir/f'math-probability-{k}.json').read_text(encoding='utf-8')) for k in ['topics','questions','dependencies','sources','coverage']}
    topics=items['topics']; questions=items['questions']; deps=items['dependencies']; sources=items['sources']; coverage=items['coverage']
    checks=[]
    def check(name,condition):
        checks.append(dict(check=name,passed=bool(condition)))
        if not condition: raise AssertionError(name)
    check('100 sequential unique topic IDs',[t['id'] for t in topics]==[f'cnm_ps{i:03d}' for i in range(1,101)])
    byid={t['id']:t for t in topics}; byq={q['id']:q for q in questions}
    check('200 unique question IDs',len(questions)==len(byq)==200)
    check('8 declared modules',set(t['module'] for t in topics)==set(CHAPTERS))
    check('2 original questions and correct difficulty per topic',all([byq[t['id']+'_q1']['difficulty'],byq[t['id']+'_q2']['difficulty']]==['basic','standard'] for t in topics))
    basis_ids={s['id'] for s in sources['scope_references']}
    official_toc={c['chapter_number']:{s['section_number']:s['title'] for s in c['sections']} for c in sources['official_public_toc']}
    section_checks=[]
    for t in topics:
        chnum=CHAPTERS[t['module']][2]
        for part in t['textbook']['section'].split('；'):
            match=re.match(r'§(\d+)\s+([^（]+)',part.strip())
            section_checks.append(bool(match and official_toc[chnum].get(int(match.group(1)))==match.group(2).strip()))
    check('All mapped sections belong to verified sixth-edition public TOC',all(section_checks))
    check('Topic metadata, mastery and non-fulltext status',all(t['subject']=='math' and t['grade']==17 and t['semester']=='全' and t['external'] is False and t['standards']==[] and t['epistemic_status']=='modern_mathematics' and len(t['mastery_criteria'])==2 and len(set(t['mastery_criteria']))==2 and t['textbook']['book']=='prob_zju6_2026' and t['textbook']['volume']=='概率论与数理统计' and '未逐页核验' in t['textbook']['verification'] for t in topics))
    check('Scope labels reference available sources and declare 2027 limitation',all(set(t['exam_scope']['basis_ids'])<=basis_ids and t['exam_scope']['track'] in ['shared','math1','supplement'] and '2027大纲全文未逐条核验' in t['exam_scope']['verification'] for t in topics))
    check('Question shape and one keyed answer',all(q['topicId'] in byid and q['type']=='choice' and [c['key'] for c in q['choices']]==list('ABCD') and len({c['text'] for c in q['choices']})==4 and q['answer'] in 'ABCD' and len(q['explanation'])>10 and q['origin']=='原创练习，不是教材原题' for q in questions))
    check('Question and topic textbook/scope match',all(q['textbook']==byid[q['topicId']]['textbook'] and q['exam_scope']==byid[q['topicId']]['exam_scope'] for q in questions))
    check('Q1 diagnostic question and answer match actual question',all(t['diagnostic_question']=={'question':byq[t['id']+'_q1']['prompt'],'answer':next(c['text'] for c in byq[t['id']+'_q1']['choices'] if c['key']==byq[t['id']+'_q1']['answer'])} for t in topics))
    check('Q1 and Q2 prompts differ',all(byq[t['id']+'_q1']['prompt']!=byq[t['id']+'_q2']['prompt'] for t in topics))
    check('Explanations do not depend on option letters',all(not re.search(r'(?:选项|答案为|选择)[\s“”]*[ABCD](?![A-Za-z])',q['explanation']) for q in questions))
    check('Answer keys balanced',dict(collections.Counter(q['answer'] for q in questions))==dict.fromkeys('ABCD',50))
    manifest=json.loads((ROOT/'existing_prerequisites.json').read_text(encoding='utf-8'))
    existing={t['id']:t for t in manifest['topics']}
    check('185 unique dependency edges',len(deps)==185==len({(d['topicId'],d['prerequisiteId']) for d in deps}))
    check('Dependency endpoints and explicit reasons',all(d['topicId'] in byid and d['prerequisiteId'] in byid.keys()|existing.keys() and d['strength'] in ['hard','soft'] and len(d['reason'])>5 for d in deps))
    adjacency=collections.defaultdict(list)
    for d in deps: adjacency[d['prerequisiteId']].append(d['topicId'])
    state={}
    def visit(tid):
        if state.get(tid)==1: raise AssertionError('Dependency cycle: '+tid)
        if state.get(tid)==2: return
        state[tid]=1
        for nextid in adjacency[tid]: visit(nextid)
        state[tid]=2
    for tid in sorted(set(byid)|set(existing)): visit(tid)
    check('New course plus old-course reference DAG has no cycle',True)
    if baseline_data:
        for filename in sorted({t['source_file'] for t in existing.values()}):
            p=baseline_data/filename; raw=p.read_bytes(); baseline={t['id']:t for t in json.loads(raw)}
            for t in existing.values():
                if t['source_file']!=filename: continue
                check('Existing prerequisite '+t['id'],hashlib.sha256(raw).hexdigest()==t['source_file_sha256'] and baseline[t['id']]['name']==t['name'] and baseline[t['id']].get('subject','math')=='math')
    check('Coverage exactly matches topic partition',len(coverage['chapters'])==8 and all(c['topic_ids']==[t['id'] for t in topics if t['module']==c['module']] for c in coverage['chapters']))
    check('Coverage count matches actual files',(coverage['topic_count'],coverage['question_count'],coverage['dependency_count'])==(100,200,185))
    check('Source topic map matches exact textbook metadata',sources['topics']==[{'id':t['id'],'name':t['name'],'textbook':t['textbook'],'exam_scope':t['exam_scope']} for t in topics])
    check('Latest textbook and official outline metadata with truthful full-text limits',sources['books'][0]['isbn']=='9787040666892' and sources['books'][0]['edition']==6 and sources['books'][0]['publication_date']=='2026-02' and sources['books'][0]['full_text_verified'] is False and sources['exam_basis']['isbn']=='9787040684049' and sources['exam_basis']['publication_date']=='2026-09' and sources['exam_basis']['full_text_verified'] is False)
    with tempfile.TemporaryDirectory(prefix='probability-rebuild-',dir=ROOT) as temp:
        output=Path(temp); build(output)
        check('Portable complete rebuild is byte-for-byte deterministic',all((output/f'math-probability-{k}.json').read_bytes()==(data_dir/f'math-probability-{k}.json').read_bytes() for k in items))
    return dict(status='PASS',checks=checks,topic_count=len(topics),question_count=len(questions),dependency_count=len(deps),module_counts=dict(collections.Counter(t['module'] for t in topics)),scope_counts=dict(collections.Counter(t['exam_scope']['track'] for t in topics)),answer_key_counts=dict(collections.Counter(q['answer'] for q in questions)),limitations=['静态检查不能证明每道题的数学语义唯一性；另有作者计算和独立AI逐题复核。','教材全文和2027大纲全文未逐条核验；仍待教师审核。'])

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir',type=Path,default=default_data_dir(),help='数据目录；默认先用脚本同目录数据，否则使用../../data')
    parser.add_argument('--baseline-data',type=Path,help='可选的只读v14完整data目录')
    parser.add_argument('--report',type=Path,default=ROOT/'author-validation-report.json',help='检查报告输出路径')
    args=parser.parse_args()
    report=run(args.data_dir,args.baseline_data)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False))
