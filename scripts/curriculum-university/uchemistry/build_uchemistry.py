"""Build original university chemistry learning records. Python standard library only."""
from pathlib import Path
import json, random, runpy
ROOT=Path(__file__).resolve().parent
DATE='2026-10-31'
REVIEW='AI作者自查与独立AI内容复核已完成；教材全文未逐页核验，待教师审核'
REVIEW_RECORD='validation/university-uchemistry-peer-review.json'
BASE='https://xuanshu.hep.com.cn/front/h5Mobile/bookDetails?bookId='
BOOK_ROWS=[
 ('uch_general_tju3','大学化学（第3版）',3,['天津大学大学化学教研室','杨秋华','邱海霞','曲建强'],'9787040655612','2025-12-26','68923aa7e119ac9729ca47c9',['structure','solution'],'高等学校本科大学化学教材'),
 ('uch_physical_tju7a','物理化学（第七版）（上册）',7,['天津大学物理化学教研室','刘俊吉','李松林','冯霞','朱荣娇','陈丽'],'9787040618174','2024-04-19','65e35d5374ce561611bd9d5a',['thermodynamics'],'国家级规划教材'),
 ('uch_physical_tju7b','物理化学（第七版）（下册）',7,['天津大学物理化学教研室','李松林','冯霞','刘俊吉','孙艳'],'9787040620603','2024-05-21','660452df74ce561611bd9e82',['kinetics','electrochemistry'],'国家级规划教材'),
 ('uch_organic_tju7','有机化学（第七版）',7,['天津大学有机化学教研室','赵温涛','王光伟','马宁','聂晶','黄跟平'],'9787040636840','2024-12-27','67460048e4efbc722ba488ec',['organic'],'高等学校化学及相关专业本科教材'),
 ('uch_analytical_101','分析化学',None,['蒋健晖','宦双燕','李攻科','李娜','谭蔚泓'],'9787040657067','2025-12','68a7529ee119ac9729e17a7c',['analysis'],'基础学科系列“101计划”核心教材')
]
MODULES=[('structure',61,'物质结构基础',24),('thermodynamics',62,'化学热力学与平衡',24),('kinetics',63,'化学动力学与界面',18),('solution',64,'溶液与离子平衡',22),('electrochemistry',65,'电化学',18),('organic',66,'基础有机化学',26),('analysis',67,'分析化学',28)]
MODINFO={m:(g,n,c) for m,g,n,c in MODULES}
BOOKS={}
for bid,title,edition,authors,isbn,pub,web,mods,series in BOOK_ROWS:
 url=('https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=' if bid=='uch_physical_tju7a' else BASE)+web
 BOOKS[bid]={'id':bid,'module':mods[0],'modules':mods,'grade':MODINFO[mods[0]][0],'title':title,'course_name':'、'.join(MODINFO[m][1] for m in mods),'authors':authors,'publisher':'高等教育出版社','edition':f'第{edition}版' if edition is not None else '未标版次（以ISBN识别）','isbn':isbn,'publication_date':pub,'source_url':url,'catalog_url':url,'official_series':series,'full_text_verified':False,'catalog_verification':'publisher_metadata_and_selected_public_catalog_sections_read','checked_date':DATE,'verification':'已核验出版社书目及相关公开目录；章、节名用于主题定位，摘要与题目为原创整理，教材正文未逐页核验。'}
for bid in ['uch_physical_tju7a','uch_physical_tju7b']:
 BOOKS[bid]['publication_date_note']='高教社页面重点项目/标签仍列“十二五”，更新简介列“十四五”；以第7版及ISBN识别版本，保留字段差异。2026年印次不视为新版本。'
BOOKS['uch_general_tju3']['publication_date_note']='第3版出版于2025年12月；页面最新印次列2026年9月，未将重印视为第4版。'
BOOKS['uch_organic_tju7']['publication_date_note']='第7版出版于2024年12月；页面最新印次列2026年4月，未将重印视为第8版。'
BOOKS['uch_analytical_101']['publication_date_note']='同一官方链接的作者读取快照显示出版日期2026-01-23，独立复核快照显示2025年12月；主字段采用独立复核快照2025-12，另保留该日期差异待出版社核准。最新印次均显示2025年12月，不据此推断新版。'
for bid,pdate in [('uch_general_tju3','2026-09'),('uch_physical_tju7a','2026-04'),('uch_physical_tju7b','2026-09'),('uch_organic_tju7','2026-04'),('uch_analytical_101','2025-12')]:
 BOOKS[bid]['latest_printing_date']=pdate
MODBOOK={m:b['id'] for b in BOOKS.values() for m in b['modules']}
TOPICS=[];QUESTIONS=[];DEPS=[];COURSES=[]

def Q(prompt,correct,wrong,explanation):
 assert len(wrong)==3 and len(set([correct,*wrong]))==4
 return {'prompt':prompt,'correct':correct,'wrong':wrong,'explanation':explanation}

def R(name,unit,anchor,description,criteria,q1,q2,pre=(),book=None):
 return dict(name=name,unit=unit,anchor=anchor,description=description,criteria=criteria,qs=[q1,q2],pre=pre,book=book)

def build_module(mod,records):
 grade,title,expected=MODINFO[mod]; assert len(records)==expected,(mod,len(records),expected)
 units={}
 for i,r in enumerate(records,1):
  tid=f'uch_{mod}_{i:03d}'; book=BOOKS[r['book'] or MODBOOK[mod]]
  unit=r['unit']; units.setdefault(unit,{'unit':unit,'chapter':f'第{len(units)+1}章 {unit}','points':[]})
  chapter,section=r['anchor'].split('｜',1)
  tb={'book':book['id'],'title':book['title'],'volume':book['title'],'chapter':chapter,'section':section,'source_url':book['source_url'],'catalog_url':book['catalog_url'],'edition':book['edition'],'isbn':book['isbn'],'verification':book['verification']}
  topic={'id':tid,'name':r['name'],'subject':'uchemistry','module':mod,'domain':unit,'grade':grade,'semester':'全','chapter':units[unit]['chapter'],'type':'conceptual','description':r['description'],'mastery_criteria':r['criteria'],'external':False,'standards':[],'textbook':tb,'exam_scope':{'unit':unit,'point':r['name']},'curriculum_scope':{'course':title,'unit':unit,'point':r['name'],'level':'本科大学化学核心知识','chapter_numbering':'项目自编学习单元；textbook另列已核验目录主题定位'},'curriculum_level':'大学化学本科基础','review_status':REVIEW,'review_record':REVIEW_RECORD,'epistemic_status':'modern_chemistry','diagnostic_question':{'question':r['qs'][0]['prompt'],'answer':r['qs'][0]['correct']}}
  TOPICS.append(topic)
  units[unit]['points'].append({'point':r['name'],'topicIds':[tid],'textbook_chapter':chapter,'textbook_section':section})
  for j,q in enumerate(r['qs'],1):
   choices=[q['correct'],*q['wrong']];random.Random(tid+f'_q{j}').shuffle(choices)
   QUESTIONS.append({'id':tid+f'_q{j}','topicId':tid,'difficulty':'basic' if j==1 else 'standard','type':'choice','prompt':q['prompt'],'choices':[{'key':k,'text':t} for k,t in zip('ABCD',choices)],'answer':'ABCD'[choices.index(q['correct'])],'explanation':q['explanation'],'textbook':tb,'origin':'原创本科课程知识测评，非教材原题','review_status':REVIEW,'review_record':REVIEW_RECORD,'epistemic_status':'modern_chemistry'})
  for dep in r['pre']:
   pre,reason,*strength=dep;pid=f'uch_{mod}_{pre:03d}' if isinstance(pre,int) else pre
   DEPS.append({'topicId':tid,'prerequisiteId':pid,'strength':strength[0] if strength else 'hard','reason':reason+'（AI学习建议，未经教师审核）'})
 COURSES.append({'id':mod,'name':title,'grade':grade,'book':MODBOOK[mod],'topic_count':len(records),'question_count':len(records)*2,'scope':'大学化学核心知识模块；不等于一门专业课程或整本教材的全量覆盖','units':list(units.values())})

for mod,*_ in MODULES:
 ns=runpy.run_path(str(ROOT/f'author_{mod}.py'),init_globals={'Q':Q,'R':R});build_module(mod,ns['RECORDS'])
for course in COURSES:
 course['books']=list(dict.fromkeys(t['textbook']['book'] for t in TOPICS if t['module']==course['id']))
for book in BOOKS.values():
 actual=[m for m,_,_,_ in MODULES if any(t['module']==m and t['textbook']['book']==book['id'] for t in TOPICS)]
 book['modules']=actual;book['grades']=[MODINFO[m][0] for m in actual]
 book['module']=actual[0];book['grade']=MODINFO[actual[0]][0]
 book['course_name']='、'.join(MODINFO[m][1] for m in actual)
SOURCES={'subject':'uchemistry','checked_date':DATE,'schema_version':1,'official_series':'高等教育出版社本科教材现行版本；含国家级规划教材与化学“101计划”核心教材','series_url':BOOKS['uch_general_tju3']['source_url'],'reference_policy':'以天津大学《大学化学》第3版为总框架，采用同出版社《物理化学》第7版上下、《有机化学》第7版和化学“101计划”《分析化学》补充大学层次核心原理。核验的是所选书系的当前版次，不宣称全国高校唯一官方指定；重印与新版分开。','books':list(BOOKS.values()),'knowledge_policy':'知识释义、题目、解析和依赖均为原创整理。目录对应不等于教材正文逐页核对；例题均为抽象教学模型，不是实验操作规程。','limits':['没有取得并逐页核验五本教材全文；已读出版社公开书目及用于映射的目录条目。','覆盖7个核心知识模块，不覆盖全部化学专业课程、实验技能、所有元素或有机合成反应。','先修关系为教学建议，题目仅提供有限的概念与计算反馈，不能替代课程考核和实验训练。','全部内容尚未经化学教师审校。'],'date_discrepancies':[{'book':b['id'],'note':b['publication_date_note']} for b in BOOKS.values()]}
COVERAGE={'subject':'uchemistry','checked_date':DATE,'scope':'本科大学化学核心原理、微观结构、反应热力学与动力学、溶液、电化学及有机/分析基础','mapping_policy':'学习单元编号为项目自编；textbook.chapter/section为已经读取的出版社目录主题定位，不引用未读正文页码。','courses':COURSES,'topic_count':len(TOPICS),'question_count':len(QUESTIONS)}
SOURCES['assumed_foundations']=['高中化学中的元素符号、化学式、计量关系和原子/电荷守恒。','单位换算、代数、指数和对数；涉及热力学势与速率时使用基础微分、偏导和积分语言。','本模块图仅建立大学化学科内的先修关系；上述背景是课程准备说明，不用于跨学科自动推断掌握状态。']
for suffix,data in [('topics',TOPICS),('questions',QUESTIONS),('dependencies',DEPS),('sources',SOURCES),('coverage',COVERAGE)]:
 (ROOT/f'uchemistry-{suffix}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'topics':len(TOPICS),'questions':len(QUESTIONS),'dependencies':len(DEPS),'modules':len(COURSES),'books':len(BOOKS)},ensure_ascii=False))
