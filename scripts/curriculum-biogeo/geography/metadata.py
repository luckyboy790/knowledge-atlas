"""Verified geography bibliography and explicit evidence boundaries; no textbook text copied."""
from collections import OrderedDict
DATE = '2026-11-01'
STATUS = 'AI作者自查完成，待独立AI内容复核；未经教师审核'
INTRO = 'https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202409/t20240918_1995544.html'
MOE = 'https://www.moe.gov.cn/srcsite/A26/s8001/202408/W020240805496325238752.pdf'
NOTICE24 = 'https://jyj.wuhu.gov.cn/xwzx/tzgg/8637749.html'
NOTICE25A = 'https://jyj.wuhu.gov.cn/xwzx/tzgg/8854556.html'
NOTICE26A = 'https://jyj.wuhu.gov.cn/xwzx/tzgg/8910768.html'
NOTICE26B = 'https://jyj.wuhu.gov.cn/xwzx/tzgg/8912139.html'
BOOKS = OrderedDict()
def book(key, volume, grade, semester, level, atlas_num, chapters, update, update_url, pdf=None, atlas_isbn=None):
    title = ('义务教育教科书 地理 ' if level == '义务教育' else '普通高中教科书 地理 ') + volume
    chapters = [dict(chapter=c, sections=s.split('|')) for c,s in chapters]
    BOOKS[key] = dict(id=key,title=title,volume=volume,publisher='人民教育出版社',grade=grade,semester=semester,curriculum_level=level,
      isbn=None,edition=None,printing=None,approval_year=None,
      curriculum_standard='义务教育地理课程标准（2022年版）' if level == '义务教育' else '普通高中地理课程标准（2017年版2020年修订；现行2025年日常修订不自动证明教材换版）',
      verified_update=update,update_evidence_url=update_url,
      source_url='https://www.ditu.cn/dtkczy/dtsdili/202302/22/'+atlas_num+'.html',
      official_pdf_url=pdf,
      companion_atlas=dict(publisher='中国地图出版社',isbn=atlas_isbn,relationship='官方页面说明依据人教版相应教科书、按教科书章节体系组织；图册 ISBN 不是主教材 ISBN'),
      evidence_level='official_companion_toc_with_limited_official_main_text' if pdf else 'official_companion_toc_with_official_version_notice',
      verification='已核中国地图出版社配套图册的现行公开目录与官方教材更新依据；'+('另取得国家平台较早主教材电子版，限定为目录和实读稳定原理的辅助证据，未确认它是最新印次。' if pdf else '未取得最新版主教材全文，不声称逐页核验。'),
      read_scope=['中国地图出版社本册图册书名、适配说明、完整公开目录'] + (['国家中小学智慧教育平台较早主教材 PDF 的封面、目录及另列实读章节'] if pdf else []),
      limitations=['主教材 ISBN、完整版权页及最新印次未核，均留空。','配套图册目录用于定位主干章节，不把图册新增案例等同于主教材栏目。','原创节点与题目覆盖核心概念，不构成教材全文、全部活动或习题的替代品。'],
      chapters=chapters)
book('geo_pep_7a','七年级上册',7,'上','义务教育','1562676311596885431',[
 ('第一章 地球','第一节 地球的宇宙环境|第二节 地球与地球仪|第三节 地球的运动'),
 ('第二章 地图','第一节 地图的阅读|第二节 地形图的判读|第三节 地图的选择和应用'),
 ('第三章 陆地和海洋','第一节 大洲和大洋|第二节 世界的地形|第三节 海陆的变迁'),
 ('第四章 天气与气候','第一节 多变的天气|第二节 气温的变化与分布|第三节 降水的变化与分布|第四节 世界的气候'),
 ('第五章 居民与文化','第一节 人口与人种|第二节 城镇与乡村|第三节 多样的文化'),
 ('第六章 发展与合作','全章')], '2024年新编（教育部门教材目录更新通报）', NOTICE24, atlas_isbn='9787520441162')
book('geo_pep_7b','七年级下册',7,'下','义务教育','1562676311596885430',[
 ('第七章 我们生活的大洲——亚洲','第一节 自然环境|第二节 人文环境'),
 ('第八章 我们邻近的地区和国家','第一节 日本|第二节 东南亚|第三节 印度|第四节 俄罗斯'),
 ('第九章 东半球其他的地区和国家','第一节 西亚|第二节 欧洲西部|第三节 撒哈拉以南非洲|第四节 澳大利亚'),
 ('第十章 西半球的国家','第一节 美国|第二节 巴西'),
 ('第十一章 极地地区','全章')], '2025年新编（2026年2月27日教育部门通报）', NOTICE26A, atlas_isbn='9787520441179')
book('geo_pep_8a','八年级上册',8,'上','义务教育','1562676311596885429',[
 ('第一章 从世界看中国','第一节 疆域|第二节 人口|第三节 民族'),
 ('第二章 中国的自然环境','第一节 地形|第二节 气候|第三节 河流与湖泊'),
 ('第三章 中国的自然资源','第一节 土地资源|第二节 水资源|第三节 矿产资源|第四节 海洋资源'),
 ('第四章 中国的经济发展','第一节 农业|第二节 工业|第三节 交通运输'),
 ('第五章 建设美丽中国','第一节 自然灾害与防灾减灾|第二节 环境保护与发展')], '2025年新编；宝鸡市2026年6月8日官方面试教材表旁证2025年6月第1版（未见版权页）', NOTICE25A, atlas_isbn='9787520442602')
BOOKS['geo_pep_8a']['limitations'].append('图册介绍段落将本册误写为八年级下册，同时写供上学期使用；标题、目录及同社路径日期为2026年7月的页面均为八上。采用标题与目录，不传播该笔误；网址中的日期不作为版次依据。')
book('geo_pep_8b','八年级下册',8,'下','义务教育','1562676311596885428',[
 ('第六章 中国的地理差异','全章'),
 ('第七章 北方地区','第一节 自然特征与农业|第二节 “白山黑水”——东北三省|第三节 世界最大的黄土堆积区——黄土高原|第四节 祖国的首都——北京'),
 ('第八章 南方地区','第一节 自然特征与农业|第二节 “鱼米之乡”——长江三角洲地区|第三节 特别行政区——香港和澳门|第四节 祖国的神圣领土——台湾省'),
 ('第九章 西北地区','第一节 自然特征与农业|第二节 干旱的宝地——塔里木盆地'),
 ('第十章 青藏地区','第一节 自然特征与农业|第二节 “中华水塔”——三江源地区'),
 ('第十一章 奋进中的中国','全章')], '2026年新编（2026年3月5日教育部门通报第65项）', NOTICE26B, atlas_isbn='9787520442978')
book('geo_pep_b1','必修 第一册',10,'上','必修','1562676311596888327',[
 ('第一章 宇宙中的地球','第一节 地球的宇宙环境|第二节 太阳对地球的影响|第三节 地球的历史|第四节 地球的圈层结构'),
 ('第二章 地球上的大气','第一节 大气的组成和垂直分层|第二节 大气受热过程和大气运动'),
 ('第三章 地球上的水','第一节 水循环|第二节 海水的性质|第三节 海水的运动'),
 ('第四章 地貌','第一节 常见地貌类型|第二节 地貌的观察'),
 ('第五章 植被与土壤','第一节 植被|第二节 土壤'),
 ('第六章 自然灾害','第一节 气象灾害|第二节 地质灾害|第三节 防灾减灾|第四节 地理信息技术在防灾减灾中的应用')], '核到官方配套目录及较早主教材；未核到本册2025年内容更新公告，不能据此断言从未更新', None,
 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets/e2c5fb9c-9a73-4f1a-8fb5-10b1299c7f5c.pkg/pdf.pdf', '9787520412650')
book('geo_pep_b2','必修 第二册',10,'下','必修','1562676311596888325',[
 ('第一章 人口','第一节 人口分布|第二节 人口迁移|第三节 人口容量'),
 ('第二章 乡村和城镇','第一节 乡村和城镇空间结构|第二节 城镇化|第三节 地域文化与城乡景观'),
 ('第三章 产业区位因素','第一节 农业区位因素及其变化|第二节 工业区位因素及其变化|第三节 服务业区位因素及其变化'),
 ('第四章 交通运输布局与区域发展','第一节 区域发展对交通运输布局的影响|第二节 交通运输布局对区域发展的影响'),
 ('第五章 环境与发展','第一节 人类面临的主要环境问题|第二节 走向人地协调——可持续发展|第三节 中国国家发展战略举例')], '新课标2025年更新（2026年2月27日教育部门通报第5项；不等同已读2025新版全文）', NOTICE26A,
 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets_document/8452d2cf-1a23-4656-84b9-26616cbd2eff.pkg/pdf.pdf','9787520412452')
book('geo_pep_s1','选择性必修1 自然地理基础',11,'上','选择性必修','1562676311596888331',[
 ('第一章 地球的运动','第一节 地球的自转和公转|第二节 地球运动的地理意义'),
 ('第二章 地表形态的塑造','第一节 塑造地表形态的力量|第二节 构造地貌的形成|第三节 河流地貌的发育'),
 ('第三章 大气的运动','第一节 常见天气系统|第二节 气压带和风带|第三节 气压带和风带对气候的影响'),
 ('第四章 水的运动','第一节 陆地水体及其相互关系|第二节 洋流|第三节 海—气相互作用'),
 ('第五章 自然环境的整体性与差异性','第一节 自然环境的整体性|第二节 自然环境的地域差异性')], '核到官方配套目录；未核到本册较新版本更新公告，最新印次未知', None,
 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets/373d48bd-c1b4-4edd-b148-628713692ba3.pkg/pdf.pdf', '9787520417112')
book('geo_pep_s2','选择性必修2 区域发展',11,'下','选择性必修','1562676311596888333',[
 ('第一章 区域与区域发展','第一节 多种多样的区域|第二节 区域整体性和关联性'),
 ('第二章 资源、环境与区域发展','第一节 区域发展的自然环境基础|第二节 生态脆弱区的综合治理|第三节 资源枯竭型城市的转型发展'),
 ('第三章 城市、产业与区域发展','第一节 城市的辐射功能|第二节 地区产业结构变化'),
 ('第四章 区际联系与区域协调发展','第一节 流域内协调发展|第二节 资源跨区域调配|第三节 产业转移|第四节 国际合作')], '国家平台较早主教材后记含2023年7月；最新印次未知', None,
 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets/db7e6c9c-44b3-4818-96c6-ce81dabb3cc7.pkg/pdf.pdf', '9787520417945')
book('geo_pep_s3','选择性必修3 资源、环境与国家安全',12,'全','选择性必修','1562676311596888332',[
 ('第一章 自然环境与人类社会','第一节 自然环境的服务功能|第二节 自然资源及其利用|第三节 环境问题及其危害'),
 ('第二章 资源安全与国家安全','第一节 资源安全对国家安全的影响|第二节 中国的能源安全|第三节 中国的耕地资源与粮食安全|第四节 海洋空间资源开发与国家安全'),
 ('第三章 环境安全与国家安全','第一节 环境安全对国家安全的影响|第二节 环境污染与国家安全|第三节 生态保护与国家安全|第四节 全球气候变化与国家安全'),
 ('第四章 保障国家安全的资源、环境战略与行动','第一节 走向生态文明|第二节 国家战略与政策|第三节 国际合作')], '新课标2025年更新（2026年2月27日教育部门通报第4项；不等同已读2025新版全文）', NOTICE26A,
 'https://r1-ndr.ykt.cbern.com.cn/edu_product/esp/assets/f07377f5-2ced-4d59-a59d-fe3b37800ead.pkg/pdf.pdf', '9787520417556')
BOUNDARY = ('采用截至2026-11-01可核验的官方课程与配套目录结构，已知主教材新版更新另列：初中为2022课标第十二套教材，已核七上2024、七下与八上2025、八下2026新编通知；高中通报明确必修二与选择性必修三2025更新。各册章节主要据中国地图出版社对应人教版的官方配套图册目录，图册中高中课标标识仍为2017年版2020年修订，不能单独证明与2025更新后主教材细目完全相同。较早国家平台主书仅作实读片段的有限辅助。未取得九册最新版主教材完整版权页；更新后主教材目录与全文仍待核，不宣称最新正文或最新目录已逐页逐节核完。2025年高中课标日常修订与教材版次分开记录。')
REFERENCES = [
 dict(id='pep_new_junior',title='人教版义务教育地理（七～八年级）新教材介绍',publisher='人民教育出版社',url=INTRO,date='2024-09-18',evidence_level='official_publisher_revision_introduction',read_scope='网页正文全文；世界地理/中国地理的年级安排、2022课标依据和七上八上结构调整。未见各册全文。'),
 dict(id='moe_catalog2024',title='2024年义务教育国家课程教学用书目录（根据2022年版课程标准修订）',publisher='教育部',url=MOE,date='2024-08',evidence_level='official_approved_catalog',read_scope='教材书目身份与课标体系；不能由书目直接推出已取得所有新版正文。'),
 dict(id='update2024',title='2024—2025学年第一学期教材目录更新工作进展通报',publisher='芜湖市教育局',url=NOTICE24,date='2024-08-30',evidence_level='education_authority_update_notice',short_evidence='七年级上册（2024年新编）',read_scope='地理对应条目'),
 dict(id='update2025a',title='2025—2026学年第一学期教材目录更新工作进展第一次通报',publisher='芜湖市教育局',url=NOTICE25A,date=None,evidence_level='education_authority_update_notice',short_evidence='八年级上册（2025年新编）',read_scope='地理第14项'),
 dict(id='update2026a',title='2025—2026学年第二学期芜湖智慧教育平台教材目录更新工作进展第一次通报',publisher='芜湖市教育局',url=NOTICE26A,date='2026-02-27',evidence_level='education_authority_update_notice',short_evidence='选择性必修3资源、环境与国家安全（新课标2025年更新）；必修第二册（新课标2025年更新）；七年级下册（2025年新编）',read_scope='网页正文，地理第4、5、8项；官方确认教材目录变化，不提供所更新教材的全篇正文。'),
 dict(id='update2026b',title='2025—2026学年第二学期芜湖智慧教育平台教材目录更新工作进展第二次通报',publisher='芜湖市教育局',url=NOTICE26B,date='2026-03-05',evidence_level='education_authority_update_notice',short_evidence='八年级下册（2026年新编）',read_scope='网页正文第65项地理；不能把2024旧初中PDF称为八下最新。'),
 dict(id='hep_curriculum2025',title='普通高中地理课程标准（2017年版2025年修订）相关修订解读',publisher='高等教育出版社',url='https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=6a6a3486e119ac97299a686a',date='2026-10',evidence_level='official_publisher_curriculum_metadata',read_scope='主代理核实的课程标准修订书目；未阅读解读书全文；只用于区分现行课标与教材版本。')
]
EXCLUDED = ['教材整篇课文、地图、摄影图像与原题（版权内容未复制）','各册研究性学习、问题研究和跨学科主题活动的全部操作任务','配套图册独有的补充大洲案例，不冒充主教材正式小节','动态人口总量、GDP、国家排名等未经指定年份核实的记忆题','依赖未提供地图、图像或统计表才能作答的题目','未取得的最新版主教材版权页、变化页及全文逐页校对']
# Exact reading boundaries; downloading the same public PDFs through the executor returned 403.
PDF_READ = {
 'geo_pep_b1':'国家平台主教材网页解析：封面、完整目录、第一章章首与第一节地球的宇宙环境开头片段。',
 'geo_pep_b2':'国家平台主教材网页解析：封面、完整目录、第一章人口分布开头片段；其中旧年份人口数字未用作当前事实。',
 'geo_pep_s2':'国家平台主教材网页解析：封面、完整目录、第一节多种多样的区域开头片段；检索还显示2023年7月后记。',
 'geo_pep_s3':'国家平台主教材网页解析：封面、完整目录、第一节自然环境的服务功能开头片段。'
}
for _key,_b in BOOKS.items():
    if _b['grade']>=10:
        _b['curriculum_standard']='官方配套图册明示依据普通高中地理课程标准（2017年版2020年修订）'
        _b['current_curriculum_standard']='普通高中地理课程标准（2017年版2025年修订）；只确认课标现行修订，不由此猜测每册教材版次'
        if _key in PDF_READ:
            _b['read_scope']=['中国地图出版社本册图册书名、适配说明、完整公开目录',PDF_READ[_key]]
            _b['verification']='已核中国地图出版社官方配套图册目录；国家平台较早主教材仅实读封面、目录与开头片段，未证实为最新印次；节点和题目为对应课程主题的原创整理，未逐点声称由最新正文核验。'
            _b['limitations'].append('国家平台PDF可由网页检索解析部分正文；正规执行器公开下载返回403，未绕过访问控制，未本地下载或全文通读。')
        else:
            _b['evidence_level']='official_companion_toc'
            _b['read_scope']=['中国地图出版社本册图册书名、适配说明、完整公开目录']
            _b['verification']='已核中国地图出版社官方配套图册目录；主教材PDF链接已发现但未成功读取，不把链接可定位视为正文已核。'
            _b['limitations'].append('主教材链接网页读取失败，正规执行器下载返回403；本册没有主教材正文实读证据。')
for _r in REFERENCES:
    if _r['id']=='update2025a':_r['date']='2025-08-25'
CURRICULUM2025='https://www.scmlzx.net/uploadfile/2025/1110/%EF%BC%887%EF%BC%89%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E5%9C%B0%E7%90%86%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%E6%97%A5%E5%B8%B8%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%89.pdf'
REFERENCES.extend([
 dict(id='curriculum2025_text',title='普通高中地理课程标准日常修订版（2017年版2025年修订）',publisher='教育部课程标准；木里藏族自治县中学正式公开转载',url=CURRICULUM2025,landing_url='https://www.scmlzx.cn/news/202511/497838942620618752.html',date='2025-11-10',evidence_level='official_curriculum_document_reposted_by_school',read_scope='网页PDF解析实读封面、目录、课程结构；印刷页10—16五模块全部49项内容要求及相邻教学提示。新版学校链接下载403，但旧站公开镜像已被网页检索完整解析。未全文阅读实施建议及其余选修模块。',limitations='课标原文证据不等于最新版人教主教材正文或目录证据。'),
 dict(id='curriculum2025_ictr',title='课程教材研究所教学中心组织开展普通高中地理学业质量标准解读活动',publisher='教育部课程教材研究所',url='https://www.ictr.edu.cn/curriculum_reform/ke/detail/5942.html',date='2026-04-01',evidence_level='official_curriculum_research_institute_notice',read_scope='检索返回官方网页正文，确认2025日常修订及学业质量三个水平；页面直接打开返回412，未绕过。'),
 dict(id='enso_hko',title='厄尔尼诺与拉尼娜背景资料',publisher='香港天文台',url='https://my.weather.gov.hk/sc/lrf/enso/enso-backgnd.htm',date=None,evidence_level='official_meteorological_science',read_scope='实读ENSO中性、厄尔尼诺和拉尼娜的海温与信风机制文字；不采用未阅读图像作题。',topic_ids=['cng_175']),
 dict(id='lithium_cgs2025',title='我国锂矿找矿取得重大突破 重塑全球锂资源格局',publisher='中国地质调查局',url='https://m.cgs.gov.cn/ddyw/202501/t20250108_779419.html',date='2025-01-08',evidence_level='official_geological_survey_announcement',read_scope='网页正文全文；使用矿床类型、地域与加工技术实例。未用其中储量和排名当作2026实时数据。',topic_ids=['cng_176']),
 dict(id='land_survey3',title='第三次全国国土调查主要数据公报',publisher='国务院第三次全国国土调查领导小组办公室、自然资源部、国家统计局；国家基础地理信息中心公开',url='https://www.ngcc.cn/xwzx/bnyw/202401/t20240110_2271.html',date='2021-08-26',data_reference_date='2019-12-31',evidence_level='official_joint_statistical_communique',read_scope='实读公报标题、标准时点、耕地分类、南北分布、坡度和水热分区等段落；题目明确给出64%和2019时点，不要求背诵实时土地统计。',topic_ids=['cng_177']),
 dict(id='unclos',title='联合国海洋法公约',publisher='联合国',url='https://www.un.org/zh/documents/treaty/UNCLOS-1982',official_pdf_url='https://www.un.org/depts/los/convention_agreements/texts/unclos/unclos_c.pdf',date='1982-12-10',evidence_level='official_treaty_text',read_scope='实读中文第55、56、58条的专属经济区基本制度、沿海国权利和义务、其他国家权利和义务；未用作具体海域划界判断。',topic_ids=['cng_178'])
])
BOUNDARY += ' 已另实读2025高中地理课标五模块内容要求，并据此补充拉尼娜、锂矿实例、耕地分布、海洋权益和课标所列岛屿对象；这项对照不替代主教材最新版目录/正文核验。'
EXCLUDED.extend(['课程要求中的完整读图、绘图、野外观察、实验和社会调查表现，不由文字选择题代替','当前主教材更新后所有活动、真实案例和数据变化的逐页对照','高中九个校本选修模块（本次范围为必修与选择性必修）'])
for _b in BOOKS.values():
    if _b['grade']>=10:
        _b['read_scope'].append('另实读2025高中地理课标本模块内容要求；不是本册主教材全文。')
        _b['curriculum_reference_url']=CURRICULUM2025

# Root independently re-read these supporting pages during final source review.
REFERENCES.extend([
 dict(id='baoji2026_j8',title='2026年宝鸡高新区事业单位公开招聘（募）工作人员面试公告',publisher='宝鸡市人民政府',url='https://www.baoji.gov.cn/bmpd/bjgxq/gzdt/tzgg/202606/t20260608_1275934.html',date='2026-06-08',evidence_level='official_local_textbook_use_notice',read_scope='实读检索返回第六部分第7项：八年级地理上册、人民教育出版社、2025年6月第1版。作为地区用书的辅助旁证，未见主教材版权页。'),
 dict(id='atlas_j8a_additional',title='地理图册 八年级上册',publisher='中国地图出版社',url='https://www.ditu.cn/dtssy/dtsgjjc/rjbczdltc/rjbczdltcdyfc/202607/10/1662676311596901670.html',date=None,evidence_level='official_companion_toc',read_scope='实读标题、ISBN、完整目录及简介；标题与目录为八上，简介误写八下且同时写上学期。网址路径日期不视为图书版次或印次。')
])
