#!/usr/bin/env python3
"""Rebuild original geography graph. python build.py --out PATH [--snapshots PATH]."""
import argparse,copy,hashlib,importlib,json,pathlib,collections,math,ast,operator
from metadata import BOOKS,DATE,STATUS,BOUNDARY,REFERENCES,EXCLUDED
from common import ROWS,NUMERIC
from review_stamp import apply_independent_review
ROOT=pathlib.Path(__file__).resolve().parent
for module in ['junior7','junior8','senior_required','senior_selective']:
    if (ROOT/(module+'.py')).exists(): importlib.import_module(module)
import author_updates
def dump(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def numeric_eval(expression):
    ops={ast.Add:operator.add,ast.Sub:operator.sub,ast.Mult:operator.mul,ast.Div:operator.truediv,ast.Pow:operator.pow}
    def rec(n):
        if isinstance(n,ast.Constant) and type(n.value) in (int,float): return n.value
        if isinstance(n,ast.BinOp) and type(n.op) in ops:return ops[type(n.op)](rec(n.left),rec(n.right))
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return -rec(n.operand)
        raise ValueError(expression)
    return rec(ast.parse(expression,mode='eval').body)
def build():
    ids={r['key']:f'cng_{i:03d}' for i,r in enumerate(ROWS,1)}
    topics=[];questions=[];edges=[]
    for i,r in enumerate(ROWS):
        b=BOOKS[r['book']];ch=b['chapters'][r['chapter']-1];sec=ch['sections'][r['section']-1]
        textbook={k:b[k] for k in ['title','volume','source_url','verification']}
        textbook.update(book=b['id'],chapter=ch['chapter'],section=sec)
        if b['official_pdf_url']:textbook['official_pdf_url']=b['official_pdf_url']
        if r.get('source_evidence'):textbook.update(r['source_evidence'])
        t=dict(id=ids[r['key']],name=r['name'],subject='geography',domain=r['domain'] or ch['chapter'].split(' ',1)[-1],grade=b['grade'],semester=b['semester'],chapter=b['volume']+' / '+ch['chapter']+' / '+sec,module=b['id'],type='conceptual',description=r['description'],mastery_criteria=r['mastery_criteria'],external=False,standards=[],epistemic_status='modern_geography',curriculum_level=b['curriculum_level'],grade_assignment_note='初中按人教教材册次标注；具体教学进度由学校确定。' if b['grade']<10 else '高中年级学期为建议学习顺序，不代表全国统一教学进度。',textbook=textbook,diagnostic_question={'question':r['questions'][0]['prompt'],'answer':r['questions'][0]['correct']},review_status=STATUS)
        topics.append(t)
        for j,q in enumerate(r['questions']):
            answer_pos=(i*2+j)%4
            options=q['distractors'].copy();options.insert(answer_pos,q['correct'])
            questions.append(dict(id=ids[r['key']]+f'_q{j+1}',topicId=ids[r['key']],difficulty=['basic','standard'][j],type='choice',prompt=q['prompt'],choices=[{'key':k,'text':txt} for k,txt in zip('ABCD',options)],answer='ABCD'[answer_pos],explanation=q['explanation'],textbook=copy.deepcopy(textbook),origin='原创练习，不是教材原题',review_status=STATUS))
        for key,strength,reason in r['dependencies']:
            assert key in ids, (r['key'],key)
            edges.append(dict(topicId=ids[r['key']],prerequisiteId=ids[key],strength=strength,reason=reason))
    actual_books={t['module'] for t in topics}
    sources={'schema_version':'1.0','subject':'geography','checked_date':DATE,'scope':'中国大陆人教版初中七八年级与高中必修、选择性必修九册核心知识','method':'官方更新公告核版本边界，官方配套图册提供章节定位，国家平台较早主书片段作有限辅助；另实读2025高中课标五模块内容要求，新增节点有一手专业资料。知识解释和题目均原创。','version_boundary':BOUNDARY,'books':[{k:v for k,v in b.items() if k!='chapters'} for b in BOOKS.values()],'curriculum_references':REFERENCES,'topics':[{'id':t['id'],'name':t['name'],'textbook':t['textbook']} for t in topics]}
    coverage={'schema_version':'1.0','subject':'geography','checked_date':DATE,'scope':'已核官方配套目录的每个小节或整章定位至少一个核心概念；不代表最新版主教材正文和活动穷尽','books':[],'topic_count':len(topics),'question_count':len(questions),'dependency_count':len(edges),'excluded_content':EXCLUDED,'curriculum_alignment_file':'scripts/curriculum-biogeo/geography/curriculum2025-alignment.json','limitations':[BOUNDARY,'“全章”是本项目为官方目录未列编号小节的章设置的定位标签，不假称教材有名为全章的小节。']}
    for b in BOOKS.values():
        chapters=[]
        for c in b['chapters']:
            sections=[]
            for s in c['sections']:
                matched=[t['id'] for t in topics if t['module']==b['id'] and t['textbook']['chapter']==c['chapter'] and t['textbook']['section']==s]
                sections.append({'section':s,'topic_ids':matched,'status':'core_concepts_authored' if matched else 'not_yet_authored','evidence_level':b['evidence_level']})
            chapters.append({'chapter':c['chapter'],'sections':sections})
        coverage['books'].append({'book':b['id'],'volume':b['volume'],'chapters':chapters})
    # Meaningful structural checks: mapping, cross references, cycle detection and arithmetic.
    byid={t['id']:t for t in topics}; byq=collections.defaultdict(list)
    assert len(byid)==len(topics)
    assert [t['id'] for t in topics]==[f'cng_{i:03d}' for i in range(1,len(topics)+1)]
    assert len({q['id'] for q in questions})==len(questions)
    for q in questions:
        byq[q['topicId']].append(q)
        assert q['topicId'] in byid
        assert [x['key'] for x in q['choices']]==list('ABCD')
        assert len({x['text'] for x in q['choices']})==4
        assert q['answer'] in 'ABCD' and len(q['answer'])==1
        assert q['textbook']==byid[q['topicId']]['textbook']
    for t in topics:
        qs=byq[t['id']];assert len(qs)==2
        assert [q['difficulty'] for q in qs]==['basic','standard']
        assert qs[0]['prompt']!=qs[1]['prompt']
        assert len(t['mastery_criteria'])>=2
        assert t['diagnostic_question']=={'question':qs[0]['prompt'],'answer':next(x['text'] for x in qs[0]['choices'] if x['key']==qs[0]['answer'])}
    seen=set();graph=collections.defaultdict(list)
    for e in edges:
        pair=(e['topicId'],e['prerequisiteId']);assert pair not in seen;seen.add(pair)
        assert e['topicId'] in byid and e['prerequisiteId'] in byid and e['topicId']!=e['prerequisiteId']
        assert e['strength'] in ('hard','soft') and len(e['reason'])>=8
        graph[e['topicId']].append(e['prerequisiteId'])
        if byid[e['topicId']]['grade']>=10 and byid[e['prerequisiteId']]['grade']<10:assert e['strength']=='soft'
    visiting=set();visited=set()
    def dfs(x):
        assert x not in visiting,('cycle',x)
        if x in visited:return
        visiting.add(x)
        for p in graph[x]:dfs(p)
        visiting.remove(x);visited.add(x)
    for x in byid:dfs(x)
    flat=[tid for b in coverage['books'] for c in b['chapters'] for s in c['sections'] for tid in s['topic_ids']]
    assert collections.Counter(flat)==collections.Counter(byid.keys())
    calculations=[]
    for n in NUMERIC:
        result=numeric_eval(n['expression']);assert math.isclose(result,n['expected'],abs_tol=1e-9),(n,result)
        qid=ids[n['topic_key']]+f"_q{n['question']}"
        q=next(q for q in questions if q['id']==qid)
        calculations.append(dict(n,question_id=qid,result=result,pass_check=True,prompt=q['prompt'],correct_choice=next(x['text'] for x in q['choices'] if x['key']==q['answer'])))
    report={'subject':'geography','checked_date':DATE,'topic_count':len(topics),'question_count':len(questions),'dependency_count':len(edges),'books_with_topics':len(actual_books),'checks':{'continuous_ids':True,'two_questions_per_topic':True,'choices_distinct_and_keys_valid':True,'diagnostic_question_matches_q1':True,'textbook_consistent':True,'one_coverage_mapping_per_topic':True,'dependency_references_valid':True,'dependency_dag':True,'cross_stage_edges_soft':True,'arithmetic_recomputed':True},'answer_distribution':dict(collections.Counter(q['answer'] for q in questions)),'per_book':{b:sum(t['module']==b for t in topics) for b in BOOKS},'semantic_check':'作者在编写时逐题核对适用条件、四个选项与解析；程序不把答案键合法当作语义正确。全量独立AI内容复核由主代理另行执行，未经教师审核。','version_limit':BOUNDARY,'numeric_checks':calculations}
    apply_independent_review(topics+questions)
    return topics,questions,edges,sources,coverage,report

def main():
    p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,default=ROOT/'generated');p.add_argument('--snapshots',type=pathlib.Path);p.add_argument('--partial',action='store_true');args=p.parse_args()
    vals=build();names=['topics','questions','dependencies','sources','coverage']
    if not args.partial:
        assert all(s['topic_ids'] for b in vals[4]['books'] for c in b['chapters'] for s in c['sections']),'Some verified sections lack core topics'
    for name,data in zip(names,vals):dump(args.out/f'geography-{name}.json',data)
    dump(args.out/'author-check-report.json',vals[5])
    dump(args.out/'numeric-checks.json',vals[5]['numeric_checks'])
    if args.snapshots:
        for b in BOOKS:
            ts=[t for t in vals[0] if t['module']==b]
            if not ts:continue
            tids={t['id'] for t in ts};folder=args.snapshots/b;manifest={}
            snapshots={'topics':ts,'questions':[q for q in vals[1] if q['topicId'] in tids],'dependencies':[e for e in vals[2] if e['topicId'] in tids]}
            for name,data in snapshots.items():
                file=folder/(name+'.json');dump(file,data);manifest[file.name]=hashlib.sha256(file.read_bytes()).hexdigest()
            dump(folder/'book-source.json',next(x for x in vals[3]['books'] if x['id']==b))
            dump(folder/'sha256.json',{'book':b,'files':manifest,'topic_count':len(ts),'question_count':len(snapshots['questions']),'dependency_count':len(snapshots['dependencies'])})
    print(json.dumps({k:vals[5][k] for k in ['topic_count','question_count','dependency_count','per_book']},ensure_ascii=False))
if __name__=='__main__':main()
