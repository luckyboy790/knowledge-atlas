"""Build the modern-biomedicine educational graph from original authoring records.
Run: python task_med/med/build_med.py
All chapter numbers in topic.chapter are project study-unit numbers.
"""
from pathlib import Path
import json, random, runpy
ROOT=Path(__file__).resolve().parent
CHECKED='2026-10-31'
REVIEW='AI作者自查与独立AI内容复核已完成；教材全文未逐页核验，待教师审核'
REVIEW_RECORD='validation/medical-med-peer-review.json'
SERIES='全国高等学校五年制本科临床医学专业第十轮规划教材（国家卫生健康委员会十四五规划教材）'
BOOK_ROWS=[
 ('anatomy',21,'系统解剖学',10,['崔慧先','刘学政'],'9787117365918','2024-08-14','32510','653239-331836'),
 ('histology',22,'组织学与胚胎学',10,['李继承','邵淑娟'],'9787117363433','2024-07-25','32413','653052-331649'),
 ('physiology',23,'生理学',10,['罗自强','管又飞'],'9787117364256','2024-07-25','32415','653054-331651'),
 ('biochem',24,'生物化学与分子生物学',10,['高国全','汤其群'],'9787117363365','2024-07-30','32418','653057-331654'),
 ('immunology',25,'医学免疫学',8,['曹雪涛'],'9787117366144','2024-09-05','32664','653435-332032'),
 ('microbiology',26,'医学微生物学',10,['郭晓奎','彭宜红'],'9787117365932','2024-08-19','32524','653275-331872'),
 ('pathology',27,'病理学',10,['卞修武','李一雷'],'9787117364683','2024-07-31','32439','653091-331688'),
 ('pathophys',28,'病理生理学',10,['陈国强','钱睿哲'],'9787117363006','2024-07-30','32443','653095-331692'),
 ('pharmacology',29,'药理学',10,['杨宝峰','陈建国'],'9787117364287','2024-07-25','32422','653061-331658'),
 ('diagnostics',30,'诊断学',10,['万学红','卢雪峰'],'9787117363631','2024-07-25','32419','653058-331655'),
]
BOOKS={}
for mod,grade,title,edition,authors,isbn,date,mid,storeid in BOOK_ROWS:
 url=f'https://medu.pmph.com/readdetail/todetail.action?id={mid}'
 BOOKS[mod]={'id':f'med_{mod}_pmph{edition}','module':mod,'grade':grade,'title':f'{title}（第{edition}版）','course_name':title,'authors':authors,'publisher':'人民卫生出版社','edition':f'第{edition}版','isbn':isbn,'publication_date':date,'source_url':url,'catalog_url':url,'verification':'已核实出版社公开版次、作者、ISBN及简介；未取得完整可读目录或教材全文。章节采用课程主题定位，不虚构原书节号、页码。','official_series':SERIES,'full_text_verified':False,'catalog_verification':'publisher_metadata_and_synopsis_only','checked_date':CHECKED}
# Only publisher store URLs that were actually retrieved are recorded.
BOOKS['physiology']['secondary_source_url']='https://www.pmphmall.com/gdsdetail/653054-331651'
BOOKS['physiology']['publication_date_note']='人卫商城列2024-07（移动页2024-07-25），E教页列2025-04-15；采用商城出版信息，未把平台日期差异视为新版。'
BOOKS['biochem']['secondary_source_url']='https://wap.pmphmall.com/gdsdetail/653057-331654?adid=&linktype=1'
BOOKS['immunology']['secondary_source_url']='https://www.pmphmall.com/gdsdetail/653435-332032'
BOOKS['pathophys']['secondary_source_url']='https://wap.pmphmall.com/gdsdetail/653095-331692'
BOOKS['pathophys']['publication_date_note']='人卫商城列2024-07-30，E教页列2025-04-02；采用商城出版信息，未把平台日期差异视为新版。'
BOOKS['biochem']['verification']='已核实出版社版次、作者、ISBN及简介列举的四篇主题；未逐页读取全书，未核实每一具体节号、页码。'
BOOKS['anatomy']['verification']='已核实出版社版次、作者、ISBN及简介中的九系统编排；具体节号与教材全文未逐项核验。'
BOOKS['immunology']['verification']='已核实出版社第十轮中的第8版及五篇主题；第十轮不等于第10版，完整目录和全文未逐项核验。'
TOPICS=[]; QUESTIONS=[]; DEPS=[]; COURSES=[]

def Q(prompt,answer,distractors,explanation):
 assert len(distractors)==3 and len(set([answer,*distractors]))==4
 return {'prompt':prompt,'correct':answer,'distractors':distractors,'explanation':explanation}

def build_course(mod,records):
 book=BOOKS[mod]; units={}; course_topics=[]
 for i,r in enumerate(records,1):
  name,unit,anchor,desc,criteria,q1,q2,*rest=r
  assert len(criteria)>=2
  tid=f'med_{mod}_{i:03d}'
  if unit not in units: units[unit]={'unit':unit,'chapter':f'第{len(units)+1}章 {unit}','points':[]}
  tb={'book':book['id'],'title':book['title'],'volume':book['course_name'],'chapter':'主题定位：'+anchor,'section':name+'（课程主题映射，具体教材节号未核实）','source_url':book['source_url'],'catalog_url':book['catalog_url'],'edition':book['edition'],'isbn':book['isbn'],'verification':book['verification']}
  t={'id':tid,'name':name,'subject':'med','module':mod,'domain':unit,'grade':book['grade'],'semester':'全','chapter':units[unit]['chapter'],'type':'conceptual','description':desc,'mastery_criteria':criteria,'external':False,'standards':[],'textbook':tb,'exam_scope':{'unit':unit,'point':name},'curriculum_scope':{'course':book['course_name'],'unit':unit,'point':name,'level':'本科基础与临床学习方法','chapter_numbering':'项目自编学习单元编号，不对应教材章号'},'review_status':REVIEW,'epistemic_status':'modern_biomedicine','curriculum_level':'医学本科基础','diagnostic_question':{'question':q1['prompt'],'answer':q1['correct']}}
  t['review_record']=REVIEW_RECORD
  TOPICS.append(t); course_topics.append(tid)
  units[unit]['points'].append({'point':name,'topicIds':[tid],'textbook_chapter':tb['chapter'],'textbook_section':tb['section']})
  for j,q in enumerate([q1,q2],1):
   choices=[q['correct'],*q['distractors']]
   random.Random(tid+f'_q{j}').shuffle(choices)
   key='ABCD'[choices.index(q['correct'])]
   QUESTIONS.append({'id':tid+f'_q{j}','topicId':tid,'difficulty':'basic' if j==1 else 'standard','type':'choice','prompt':q['prompt'],'choices':[{'key':k,'text':v} for k,v in zip('ABCD',choices)],'answer':key,'explanation':q['explanation'],'textbook':tb,'origin':'原创课程学习测验，非教材原题','review_status':REVIEW,'review_record':REVIEW_RECORD,'epistemic_status':'modern_biomedicine'})
  if rest:
   for pre,reason,*strength in rest[0]:
    pid=f'med_{mod}_{pre:03d}' if isinstance(pre,int) else pre
    DEPS.append({'topicId':tid,'prerequisiteId':pid,'strength':strength[0] if strength else 'hard','reason':reason+'（AI学习建议，未经教师审核）'})
 COURSES.append({'id':mod,'name':book['course_name'],'grade':book['grade'],'book':book['id'],'topic_count':len(course_topics),'question_count':2*len(course_topics),'scope':'本科课程核心概念样本；不是全书逐章全量覆盖或临床执业能力考核','units':list(units.values())})

for mod,*_ in BOOK_ROWS:
 namespace=runpy.run_path(str(ROOT/f'author_{mod}.py'),init_globals={'Q':Q})
 build_course(mod,namespace['RECORDS'])

SOURCES={'subject':'med','checked_date':CHECKED,'schema_version':1,'official_series':SERIES,'series_url':'https://medu.pmph.com/community/toCommunity.action?id=2130','reference_policy':'按截至核验日出版社可核实的五年制临床医学第十轮规划教材组织本科基础核心课程；这是所选官方规划教材体系，不声称全国所有院校唯一指定。版次与上架、更新、重印日期分开。','books':list(BOOKS.values()),'knowledge_policy':'描述和题目为原创课程知识整理；教材记录用于版本与主题对应，不表示每条释义已逐页核对最新教材。纯教学数据示例不用于个体诊疗决策。','limits':['未获得并逐页阅读所选教材全文，部分只有出版社简介，无完整可读目录。','各课程选择核心基础主题，不声称覆盖全部临床医学专业、全书章节或执业医师考试。','所列依赖关系是学习建议，不代表唯一官方教学顺序。','学习测验只检测概念理解，不能替代实验、标本辨识、病史采集、体格检查或临床带教。','药理与诊断学内容不含个体化处方、剂量或实际操作指导。'],'date_discrepancies':[{'module':m,'note':BOOKS[m]['publication_date_note']} for m in ['physiology','pathophys']]}
COVERAGE={'subject':'med','checked_date':CHECKED,'scope':'现代医学本科十门基础课程的核心知识与临床学习方法；不含完整内外妇儿专科疾病谱','mapping_policy':'topic.chapter为项目学习单元；textbook.chapter标明主题定位，未核实具体教材章号或页码','courses':COURSES,'topic_count':len(TOPICS),'question_count':len(QUESTIONS)}
for name,data in [('topics',TOPICS),('questions',QUESTIONS),('dependencies',DEPS),('sources',SOURCES),('coverage',COVERAGE)]:
 (ROOT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'topics':len(TOPICS),'questions':len(QUESTIONS),'dependencies':len(DEPS),'courses':len(COURSES)},ensure_ascii=False))
