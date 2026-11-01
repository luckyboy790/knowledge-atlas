#!/usr/bin/env python3
"""Build an original TCM curriculum subset, mapped to verified 2026 book catalogues."""
from pathlib import Path
from copy import deepcopy
from collections import OrderedDict, Counter
import json
import runpy

OUT = Path(__file__).resolve().parent
CHECKED = '2026-10-31'
REVIEW = 'AI作者自查与独立AI内容复核已完成；教材全文未逐页核验，待教师审核'
SERIES = '全国中医药行业高等教育“十五五”规划教材；全国高等中医药院校规划教材（第十二版）'
BASE = 'https://detail.youzan.com/show/goods?alias='
BOOKS = {
 'basics': {'id':'tcm_basic6_2026','title':'中医基础理论（第6版）','authors':['李可建','战丽彬'],'publisher':'中国中医药出版社','edition':'单书第6版；规划教材系列第12版','isbn':'9787524703235','publication_date':'2026-06','source_url':BASE+'3ex2jpryac2b4iw','catalog_url':BASE+'3ex2jpryac2b4iw','official_series':SERIES,'full_text_verified':False,'verification':'出版社官方旗舰店书目字段、实物封面及3页公开目录已核验；未逐页读取教材全文。','catalog_images':['https://img01.yzcdn.cn/upload_files/2026/06/30/Fr7H5-f3OiKQ1xAOBeyTj6Lq_ccg.jpg','https://img01.yzcdn.cn/upload_files/2026/06/30/Fv6XSkfMXRUCJ8HQ9NuhigP6So4M.jpg','https://img01.yzcdn.cn/upload_files/2026/06/30/FnZcIGmk3-puVxno_ihmlIU6sbf9.jpg']},
 'diagnostics': {'id':'tcm_diagnostic6_2026','title':'中医诊断学（第6版）','authors':['李灿东','方朝义'],'publisher':'中国中医药出版社','edition':'单书第6版；规划教材系列第12版','isbn':'9787524700210','publication_date':'2026-03','source_url':BASE+'2oi6077kmf0uopm','catalog_url':BASE+'2oi6077kmf0uopm','official_series':SERIES,'full_text_verified':False,'verification':'出版社官方旗舰店单书实物封面、公开目录与同店套装书目已核验；套装的版次字段不作单书版次。目录第5张下半部图片未完整读取，不据此填写未读章节；未逐页读取教材全文。','metadata_url':BASE+'369ghubuu920gor','catalog_images':['https://img01.yzcdn.cn/upload_files/2026/03/31/FpyKZ6QMdSH2IKa1FTQnYCASaHig.jpg','https://img01.yzcdn.cn/upload_files/2026/03/31/FunfLHpq3XRWbUWzCXrEzAr-nR4B.jpg','https://img01.yzcdn.cn/upload_files/2026/03/31/FgynfGloMFHH8C_4wNKnOqKRn-Tb.jpg','https://img01.yzcdn.cn/upload_files/2026/03/31/FlpQJeG-PEdma9ELLwqEGuxVnM3F.jpg','https://img01.yzcdn.cn/upload_files/2026/03/31/Fuhy4WXM2oJcU_CE85NcCPEpnSuJ.jpg']},
 'formulas': {'id':'tcm_formula6_2026','title':'方剂学（第6版）','authors':['李冀','许二平'],'publisher':'中国中医药出版社','edition':'单书第6版；规划教材系列第12版','isbn':'9787524702672','publication_date':'2026-07','source_url':BASE+'2ft96gme9rlsg38','catalog_url':BASE+'2ft96gme9rlsg38','official_series':SERIES,'full_text_verified':False,'verification':'出版社官方旗舰店实物封面及8页目录已核验；ISBN与出版月份由中医书院公开书目交叉核对，未直接看到版权页；未逐页读取教材全文。','metadata_crosscheck_url':BASE+'366i40vsk4n59kk','catalog_images':['https://img01.yzcdn.cn/upload_files/2026/07/15/'+x for x in ['FpwGr_tYggTza024JqHrBrzg5M4U.jpg','Fqbs00jfS7UjKbNOq9ICsuSPTzNn.jpg','FnO3abWqdPhGy3bfdhhxhY8AtMdO.jpg','FhQuvoBQmoKb8O3fJqVVgX7vFAMT.jpg','Fm6_J2ejBgOw97sQslofc93Uu-cD.jpg','FoUyTB6uWSqc9YYkQQLiN4JhUU73.jpg','FmmGYhjXGDeQotU45Bdu3VxdHX3W.jpg','Fs45fTw0GJd2i3MNQiPNXw6CuBb9.jpg']]},
 'meridians': {'id':'tcm_acupuncture6_2026','title':'针灸学（第6版）','authors':['余曙光','倪光夏'],'publisher':'中国中医药出版社','edition':'单书第6版；规划教材系列第12版','isbn':'9787524707080','publication_date':'2026','source_url':BASE+'2x4ibzkcdz6dswd','catalog_url':BASE+'2x4ibzkcdz6dswd','official_series':SERIES,'full_text_verified':False,'verification':'出版社官方旗舰店实物封面及经络、腧穴总论目录已核验；ISBN由公开书目交叉核对。不同书目出版月份为2026-07或2026-08，未独立核实版权页，故仅记录年份；未逐页读取教材全文。','metadata_crosscheck_urls':[BASE+'2fv86abm7t2ul9e',BASE+'2ovcp4w3zqeqsnp'],'catalog_images':['https://img01.yzcdn.cn/upload_files/2026/08/13/FoJAlvM4jk1szrnGnmsxL5fe3LGO.jpg','https://img01.yzcdn.cn/upload_files/2026/08/13/FvV0rugqzyiaIoncHphlx-zX-rqE.jpg']}
}
COURSES = OrderedDict([
 ('basics', {'id':'basics','name':'中医基础理论','grade':31}),
 ('diagnostics', {'id':'diagnostics','name':'中医诊断学','grade':32}),
 ('formulas', {'id':'formulas','name':'方剂学','grade':33}),
 ('meridians', {'id':'meridians','name':'针灸学基础','grade':34})
])
topics, questions, dependencies = [], [], []
counts = Counter()

def Q(prompt, correct, wrongs, explanation):
    assert len(wrongs) == 3 and len(set([correct]+wrongs)) == 4
    return (prompt, correct, wrongs, explanation)

def add(module, unit_no, unit, name, description, criteria, textbook_chapter, textbook_section, q1, q2, prereqs=(), epistemic='traditional_tcm_theory'):
    counts[module] += 1
    i = counts[module]
    tid = f'tcm_{module}_{i:03d}'
    course = COURSES[module]
    b = BOOKS[module]
    tb = {k:deepcopy(b[k]) for k in ['title','source_url','catalog_url','edition','isbn']}
    tb.update(book=b['id'],volume=course['name'],chapter=textbook_chapter,section=textbook_section,verification='已核验出版社2026新版公开目录的对应主题；知识及题目为原创课程归纳，未逐页核验教材全文。')
    scope={'course':course['name'],'unit':unit,'point':name,'purpose':'本科核心概念课程学习','coverage_level':'核心知识子集，非整本教材逐条覆盖'}
    record={'id':tid,'name':name,'subject':'tcm','module':module,'domain':unit,'grade':course['grade'],'semester':'全','chapter':f'第{unit_no}章 {unit}','type':'conceptual','description':description,'mastery_criteria':criteria,'external':False,'standards':[],'textbook':tb,'exam_scope':{'unit':unit,'point':name},'curriculum_scope':scope,'curriculum_level':'本科中医学基础课程','review_status':REVIEW,'review_record':'validation/medical-tcm-peer-review.json','epistemic_status':epistemic,'clinical_use':'课程知识测评，不提供个人诊断、处方或操作指导'}
    for j,q in enumerate([q1,q2],1):
        prompt,correct,wrongs,explanation=q
        slot=(len(questions)+i)%4
        values=list(wrongs);values.insert(slot,correct)
        prompt='【课程知识测评】'+prompt
        questions.append({'id':tid+f'_q{j}','topicId':tid,'difficulty':'basic' if j==1 else 'standard','type':'choice','prompt':prompt,'choices':[{'key':'ABCD'[k],'text':v} for k,v in enumerate(values)],'answer':'ABCD'[slot],'explanation':explanation,'textbook':deepcopy(tb),'origin':'原创课程学习测验，非教材原题','review_status':REVIEW,'review_record':'validation/medical-tcm-peer-review.json','epistemic_status':epistemic})
        if j==1:record['diagnostic_question']={'question':prompt,'answer':correct}
    topics.append(record)
    for item in prereqs:
        if isinstance(item,str):raise ValueError('Prerequisites require a specific reason')
        ref,strength,reason=item
        if isinstance(ref,int):ref=f'tcm_{module}_{ref:03d}'
        dependencies.append({'topicId':tid,'prerequisiteId':ref,'strength':strength,'reason':reason+'（课程学习建议，待教师审核）'})
    return tid

for file in ['basics.py','diagnostics.py','formulas.py','meridians.py']:
    runpy.run_path(str(OUT/file), init_globals={'add':add,'Q':Q})

coverage_courses=[]
for module,course in COURSES.items():
    units=OrderedDict()
    for t in topics:
        if t['module']!=module:continue
        u=units.setdefault(t['domain'],{'unit':t['domain'],'chapter':t['chapter'],'points':[]})
        u['points'].append({'point':t['name'],'topicIds':[t['id']],'textbook_chapter':t['textbook']['chapter'],'textbook_section':t['textbook']['section']})
    coverage_courses.append(dict(course,units=list(units.values()),topic_count=counts[module],question_count=counts[module]*2,book=BOOKS[module]['id']))

sources={'subject':'tcm','schema_version':1,'checked_date':CHECKED,'reference_policy':'以截至2026-10-31已正式出版且出版社可核验的十五五系列第十二版教材为主；单书版次与系列版次分别标明。出版社目录用于课程主题定位，原创知识和题目未声称完成教材全文或教师审核。','books':list(BOOKS.values()),'series_release':{'title':'全国中医药行业高等教育“十五五”规划教材发布','release_date':'2026-08-11','report_date':'2026-08-17','url':'https://cntcm.com.cn/m/content/202608/17/c504726.html','organizers':['国家中医药管理局教材办公室','中国中医药出版社'],'note':'首批191种教材发布，并于2026年秋使用；不将尚未出版的编写计划作为新版依据。'},'limits':['覆盖中医基础理论、诊断学、方剂分类与配伍、针灸理论基础的核心学习子集，不代表完整中医学本科或执业能力课程。','理论模型、传统分类与现代解剖、生理、病理和临床疗效证据分别处理。','教材目录已核验；没有取得并逐页核验四本书全文，没有复制教材原题。','方剂名称与传统分类用于学术学习；不提供药物剂量、煎服步骤、针刺参数、个人处方或疗效保证。','中医经典独立课程及中医内外妇儿等临床学科未在本次核心子集中展开。']}
coverage={'subject':'tcm','checked_date':CHECKED,'scope':'四门本科基础课程核心知识子集；项目章号是学习单元编号，textbook字段另记已核验教材章名。','courses':coverage_courses,'topic_count':len(topics),'question_count':len(questions),'coverage_claim':'所有新增节点均映射本项目课程范围；不宣称逐页覆盖四本教材全文。','excluded':['个人疾病诊断和个体治疗建议','方药剂量及具体煎服流程','针刺或其他侵入性操作步骤','经典和各临床专科全课程']}
for name,obj in [('topics',topics),('questions',questions),('dependencies',dependencies),('sources',sources),('coverage',coverage)]:
    (OUT/f'{name}.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'topics':len(topics),'questions':len(questions),'dependencies':len(dependencies),'courses':dict(counts)},ensure_ascii=False))
