"""Rebuild original university-physics learning graph from authoring records.

The source catalogue was read on 2026-10-31; complete textbooks were not read.
Run this file with Python 3; five uphysics-*.json files are written beside it.
"""
from pathlib import Path
import collections, hashlib, json, math, random, runpy, sys

ROOT=Path(__file__).resolve().parent
CHECKED='2026-10-31'
REVIEW='AI作者自查与独立AI内容复核已完成；教材全文未逐页核验，待教师审核'
REVIEW_RECORD='validation/university-uphysics-peer-review.json'
SERIES='高等教育出版社普通物理学（第八版）；出版社当前标注“十四五”普通高等教育本科国家级规划教材'
UPPER='https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=61df0fe9938b7cc2960ee357'
LOWER='https://xuanshu.hep.com.cn/front/h5Mobile/bookDetails?bookId=626198ec938b7cc2960ee9d3'
AUTHORS=['程守洙','江之永']
REVISERS=['高景','胡其图','王祖源','钟宏杰','孙迺疆']
VERIFICATION='已核验出版社当前书目信息及完整公开目录，章号与节号按该目录定位；正文未逐页审读，释义与测评为原创整理。'
COURSE_ROWS=[('mechanics',51,'力学','upper'),('thermodynamics',52,'热学','upper'),('electromagnetism',53,'电磁学','upper'),('oscillations_waves',54,'振动与波','lower'),('optics',55,'光学','lower'),('modern',56,'相对论与量子基础','lower')]
CHAPTERS={1:'运动和力',2:'运动的守恒量和守恒定律',3:'刚体和流体的运动',4:'相对论基础',5:'气体动理论',6:'热力学基础',7:'静止电荷的电场',8:'恒定电流的磁场',9:'电磁感应 电磁场理论',10:'机械振动和电磁振荡',11:'机械波和电磁波',12:'光学',13:'早期量子论和量子力学基础',14:'激光和固体的量子理论简介',15:'原子核物理和粒子物理简介'}
BOOKS={}
for volume,isbn,date,printing,url in [('upper','9787040578904','2022-11','2026-04',UPPER),('lower','9787040585704','2022-12','2026-09',LOWER)]:
 name='上册' if volume=='upper' else '下册'
 BOOKS[volume]={'id':f'uphy_general8_{volume}','title':f'普通物理学（第八版）{name}','volume':name,'course_name':'大学物理','authors':AUTHORS,'revisers':REVISERS,'publisher':'高等教育出版社','edition':'第8版','isbn':isbn,'publication_date':date,'latest_printing_date':printing,'source_url':url,'catalog_url':url,'verification':VERIFICATION,'official_series':SERIES,'full_text_verified':False,'catalog_verification':'publisher_full_public_table_of_contents_read','checked_date':CHECKED,'modules':[m for m,_,_,v in COURSE_ROWS if v==volume or m=='modern'],'grades':[g for m,g,_,v in COURSE_ROWS if v==volume or m=='modern']}
 BOOKS[volume]['publication_date_note']='采用本次打开的出版社当前页；搜索缓存仍保留旧“十二五”标签及旧日期。2026年为最新印次时间，不表示新的版次。'
BOOKS['lower']['publication_date_note']+=' 下册当前选书页列2022年12月，出版社Abook页列2023年1月，搜索缓存曾显示2023-01-10；两个官方平台存在月份差异，均予保留，未核读版权页前不推定哪一个是首印日期。'
for book in BOOKS.values():book['secondary_source_url']='https://abook.hep.com.cn/1261861'

TOPICS=[]; QUESTIONS=[]; DEPS=[]; COURSES=[]; CALCULATIONS=[]
def Q(prompt,answer,distractors,explanation,calc=None):
 assert len(distractors)==3 and len(set([answer,*distractors]))==4
 return dict(prompt=prompt,correct=answer,distractors=distractors,explanation=explanation,calc=calc)

def N(name,unit,section,description,criteria,q1,q2,deps=()):
 return (name,unit,section,description,criteria,q1,q2,deps)

def build_course(mod,grade,title,default_volume,records):
 units={}; ids=[]; used_books=set()
 for i,(name,unit,section,desc,criteria,q1,q2,deps) in enumerate(records,1):
  tid=f'uphy_{mod}_{i:03d}'; ids.append(tid)
  chapter=int(section.split('-')[0]);book=BOOKS['upper' if chapter<=9 else 'lower']; used_books.add(book['id'])
  if unit not in units:units[unit]={'unit':unit,'chapter':f'第{len(units)+1}章 {unit}','points':[]}
  tb={'book':book['id'],'title':book['title'],'volume':book['volume'],'chapter':f'第{chapter}章 {CHAPTERS[chapter]}','section':'§'+section+'（该节内主题：'+name+'）','source_url':book['source_url'],'catalog_url':book['catalog_url'],'edition':book['edition'],'isbn':book['isbn'],'verification':VERIFICATION}
  TOPICS.append({'id':tid,'name':name,'subject':'uphysics','module':mod,'domain':unit,'grade':grade,'semester':'全','chapter':units[unit]['chapter'],'type':'conceptual','description':desc,'mastery_criteria':criteria,'external':False,'standards':[],'textbook':tb,'exam_scope':{'unit':unit,'point':name},'curriculum_scope':{'course':title,'unit':unit,'point':name,'level':'理工科本科大学物理核心','chapter_numbering':'topic.chapter为项目学习单元；textbook.chapter/section为出版社公开目录定位'},'review_status':REVIEW,'review_record':REVIEW_RECORD,'epistemic_status':'modern_physics','curriculum_level':'大学物理','diagnostic_question':{'question':q1['prompt'],'answer':q1['correct']}})
  units[unit]['points'].append({'point':name,'topicIds':[tid],'textbook_chapter':tb['chapter'],'textbook_section':tb['section'],'book':book['id']})
  for j,q in enumerate([q1,q2],1):
   qid=f'{tid}_q{j}';choices=[q['correct'],*q['distractors']];random.Random(qid).shuffle(choices)
   QUESTIONS.append({'id':qid,'topicId':tid,'difficulty':'basic' if j==1 else 'standard','type':'choice','prompt':q['prompt'],'choices':[{'key':k,'text':x} for k,x in zip('ABCD',choices)],'answer':'ABCD'[choices.index(q['correct'])],'explanation':q['explanation'],'textbook':tb,'origin':'原创大学物理学习测验，非教材原题','review_status':REVIEW,'review_record':REVIEW_RECORD,'epistemic_status':'modern_physics'})
   if q['calc']:
    expr,expected,*rest=q['calc'];CALCULATIONS.append({'questionId':qid,'expression':expr,'expected':expected,'tolerance':rest[0] if rest else 1e-8,'answer_text':q['correct']})
  for pre,reason,*strength in deps:
   pid=f'uphy_{mod}_{pre:03d}' if isinstance(pre,int) else pre
   DEPS.append({'topicId':tid,'prerequisiteId':pid,'strength':strength[0] if strength else 'hard','reason':reason+'（AI学习建议，未经教师审核）'})
 COURSES.append({'id':mod,'name':title,'grade':grade,'book':BOOKS[default_volume]['id'],'books':sorted(used_books),'topic_count':len(ids),'question_count':2*len(ids),'scope':'所选教材对应章的核心主题；含少量标星拓展，不代表物理学专业所有课程或完整实验训练','units':list(units.values())})

for mod,grade,title,vol in COURSE_ROWS:
 author_path=ROOT/f'author_{mod}.py'
 if not author_path.exists() and '--partial' in sys.argv:continue
 records=runpy.run_path(str(author_path),init_globals={'Q':Q,'N':N,'math':math})['RECORDS']
 build_course(mod,grade,title,vol,records)
SOURCES={'subject':'uphysics','checked_date':CHECKED,'schema_version':1,'official_series':SERIES,'series_url':UPPER,'reference_policy':'采用截至2026-10-31出版社当前可核验的所选教材最新版次。大学物理没有全国所有高校唯一指定的统一课本；本项目采用一套国家级规划教材，并非声称唯一官方教材。出版年月、最新印次和版次分别记录。','books':list(BOOKS.values()),'knowledge_policy':'按出版社公开目录组织核心知识，由作者原创概括和编题；章/节映射不等于逐页核对全书。模型、近似条件和符号约定在知识点或题设中说明。','limits':['已读完整公开目录，未逐页取得或审读完整教材正文。','覆盖理工科大学物理基础与少量近代物理拓展，未覆盖理论力学、电动力学、专业量子力学、统计物理或大学物理实验的完整课程。','微积分、向量、基础概率是学习准备；本轮未将其作为跨学科硬依赖自动判分。','先修关系为项目学习建议，不是出版社给出的唯一教学顺序。','每节点两题仅反映有限抽查，不能等同完整推导、实验或综合解题能力。'],'date_discrepancies':[{'book':'uphy_general8_lower','note':BOOKS['lower']['publication_date_note']}],'edition_search_note':'用出版社域名强检索查找同名第九版及更高版，未找到已发行的更高版主教材记录；当前出版社条目及2026印次仍标第八版。未把搜索无结果单独当作不存在的证明。'}
COVERAGE={'subject':'uphysics','checked_date':CHECKED,'scope':'理工科本科大学物理六模块核心知识','mapping_policy':'按已经读取的出版社公开目录给出章/节；topic.chapter是项目自编单元，非原书章号；相对论在上册第4章，量子在下册第13–15章','courses':COURSES,'topic_count':len(TOPICS),'question_count':len(QUESTIONS),'learning_prerequisites':['高中物理基本概念','向量与三角函数','一元微积分；涉及梯度时需要多元微积分入门','概率密度与统计平均的基础概念']}
for name,data in [('topics',TOPICS),('questions',QUESTIONS),('dependencies',DEPS),('sources',SOURCES),('coverage',COVERAGE)]:
 (ROOT/f'uphysics-{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(ROOT/'numeric-checks.json').write_text(json.dumps(CALCULATIONS,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'topics':len(TOPICS),'questions':len(QUESTIONS),'dependencies':len(DEPS),'courses':len(COURSES),'books':len(BOOKS),'numeric_checks':len(CALCULATIONS)},ensure_ascii=False))
