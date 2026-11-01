"""Author structural and numerical self-check, independent of the website engine."""
from pathlib import Path
import collections, hashlib, json, math, re

ROOT=Path(__file__).resolve().parent
data={name:json.loads((ROOT/f'uphysics-{name}.json').read_text()) for name in ['topics','questions','dependencies','sources','coverage']}
topics=data['topics'];questions=data['questions'];edges=data['dependencies'];books=data['sources']['books'];courses=data['coverage']['courses']
ids={t['id'] for t in topics};byid={t['id']:t for t in topics};qids={q['id'] for q in questions};bookids={b['id'] for b in books}
checks=[]
def check(name,value):
 if not value:raise AssertionError(name)
 checks.append(name)
check('unique topic and question IDs',len(ids)==len(topics) and len(qids)==len(questions))
check('six explicit course modules',len(courses)==6 and {c['grade'] for c in courses}==set(range(51,57)))
check('two distinct textbook volumes',len(bookids)==2)
for b in books:
 isbn=b['isbn'];digits=list(map(int,isbn));check('ISBN checksum '+b['id'],len(digits)==13 and sum((1 if i%2==0 else 3)*d for i,d in enumerate(digits))%10==0)
 check('book metadata and full-text limit '+b['id'],bool(b['authors'] and b['source_url'] and b['edition']) and b['full_text_verified'] is False)
section_counts={1:6,2:8,3:6,4:6,5:7,6:7,7:10,8:9,9:7,10:8,11:9,12:18,13:11,14:5,15:5}
qmap=collections.defaultdict(list)
for q in questions:
 check('question topic '+q['id'],q['topicId'] in ids);qmap[q['topicId']].append(q)
 check('four distinct choices '+q['id'],len(q['choices'])==4 and {c['key'] for c in q['choices']}==set('ABCD') and len({c['text'] for c in q['choices']})==4)
 check('answer exists '+q['id'],q['answer'] in {c['key'] for c in q['choices']})
 check('question explanation and context '+q['id'],bool(q['explanation']) and q['epistemic_status']=='modern_physics')
 check('question source same as topic '+q['id'],q['textbook']==byid[q['topicId']]['textbook'])
for t in topics:
 qs=sorted(qmap[t['id']],key=lambda q:q['id'])
 check('two difficulty levels '+t['id'],len(qs)==2 and {q['difficulty'] for q in qs}=={'basic','standard'})
 check('sample synchronized '+t['id'],t['diagnostic_question']['question']==qs[0]['prompt'] and t['diagnostic_question']['answer']==next(c['text'] for c in qs[0]['choices'] if c['key']==qs[0]['answer']))
 check('topic required fields '+t['id'],t['subject']=='uphysics' and len(t['mastery_criteria'])>=2 and bool(t['description']) and t['epistemic_status']=='modern_physics')
 check('source exists '+t['id'],t['textbook']['book'] in bookids)
 refs=re.findall(r'§(\d+)-(\d+)',t['textbook']['section'])
 check('mapped public section '+t['id'],bool(refs) and all(int(ch) in section_counts and 1<=int(s)<=section_counts[int(ch)] for ch,s in refs))
 check('correct source volume '+t['id'],t['textbook']['book'].endswith('upper' if int(refs[0][0])<=9 else 'lower'))
seen=set();graph=collections.defaultdict(list)
for e in edges:
 pair=(e['topicId'],e['prerequisiteId']);check('valid unique edge '+str(pair),pair not in seen and pair[0] in ids and pair[1] in ids and pair[0]!=pair[1]);seen.add(pair)
 check('edge semantics fields '+str(pair),e['strength'] in ['hard','soft'] and len(e['reason'])>=10);graph[pair[0]].append(pair[1])
visiting=set();done=set()
def visit(tid):
 if tid in visiting:raise AssertionError('cycle '+tid)
 if tid in done:return
 visiting.add(tid)
 for pre in graph[tid]:visit(pre)
 visiting.remove(tid);done.add(tid)
for tid in ids:visit(tid)
check('acyclic dependency graph',len(done)==len(ids))
covered=[]
for c in courses:
 ts=[t for t in topics if t['module']==c['id']]
 mapped=[tid for u in c['units'] for p in u['points'] for tid in p['topicIds']];covered+=mapped
 check('course count '+c['id'],len(ts)==c['topic_count'] and c['question_count']==2*len(ts))
 check('course mappings '+c['id'],set(mapped)=={t['id'] for t in ts} and all(t['grade']==c['grade'] for t in ts))
check('coverage has every node once',len(covered)==len(ids) and set(covered)==ids)
numeric=json.loads((ROOT/'numeric-checks.json').read_text());numeric_results=[]
for row in numeric:
 actual=eval(row['expression'],{'__builtins__':{}},{'math':math,'abs':abs})
 passed=abs(actual-row['expected'])<=max(row['tolerance'],abs(row['expected'])*1e-10)
 check('numerical calculation '+row['questionId'],passed)
 numeric_results.append({**row,'computed':actual,'passed':True})
hashes={f'uphysics-{name}.json':hashlib.sha256((ROOT/f'uphysics-{name}.json').read_bytes()).hexdigest() for name in data}
result={'date':'2026-10-31','status':'PASS_AUTHOR_SELF_CHECK','review_role':'编写者程序检查与编写期间内容自查；独立内容复核另行记录','counts':{'topics':len(topics),'questions':len(questions),'dependencies':len(edges),'hard_edges':sum(e['strength']=='hard' for e in edges),'soft_edges':sum(e['strength']=='soft' for e in edges),'courses':len(courses),'books':len(books)},'checks_passed':len(checks),'numeric_checks':len(numeric_results),'numeric_results':numeric_results,'course_counts':{c['id']:c['topic_count'] for c in courses},'answer_key_distribution':dict(collections.Counter(q['answer'] for q in questions)),'hashes':hashes,'source_check':'两册出版社当前书目及完整公开目录已读取；版次与2026年最新印次分别记录。','remaining_limits':['未逐页阅读两册教材正文。','未由高校物理教师审核；本文件不代替独立内容复核报告。','两道题仅作基础抽查，未覆盖每章全部推导、计算或实验。']}
(ROOT/'author-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['numeric_results','hashes']},ensure_ascii=False))
