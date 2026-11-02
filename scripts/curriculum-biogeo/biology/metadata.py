"""Official-source metadata; unknown printing details are intentionally null."""
CHECKED_DATE = "2026-11-01"
REVIEW_STATUS = "AI作者自查完成，待独立AI内容复核；未经教师审核"
JUNIOR_INTRO = "https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202409/t20240914_1995532.html"
JUNIOR_FRAMEWORK = "https://www.pep.com.cn/xw/zt/hd/12/xjcjs/cz/202409/W020240914365982129156.jpg"
JUNIOR_PAPER = "https://www.pep.com.cn/bks/kcjcjf/xszh/202503/W020250407382131634362.pdf"
SENIOR_INTRO = "https://www.pep.com.cn/ebook/rjs11gzjksjssw/"
SENIOR_TOC = "https://www.pep.com.cn/xw/zt/xkzt/swpxhkj/hyzl/202105/W020210526306605422940.pdf"
SENIOR_STD = "https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519140545267.pdf"
MOE_LESSONS = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/A06/202304/W020230420309231498801.pdf"
MOE_LESSONS_2024 = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/A06/202404/W020240402490580211463.pdf"
MOE_LESSONS_2025 = "https://www.moe.gov.cn/jyb_xxgk/s5743/s5744/A06/202506/W020250625697282575780.pdf"
JUNIOR_CURRENT = "https://jyj.wuhu.gov.cn/xwzx/tzgg/8912139.html"
JUNIOR_2026_NEWS = "https://www.pep.com.cn/rjdt/mtbd/202603/t20260304_2005510.shtml"
REVISION_2026 = "https://www.pep.com.cn/rjdt/rjdt/202602/t20260211_2005325.shtml"
UPDATE_SPRING = "https://jyj.wuhu.gov.cn/xwzx/tzgg/8910768.html"
UPDATE_AUTUMN = "https://jyj.wuhu.gov.cn/xwzx/tzgg/8951493.html"
SENIOR_2025_PUBLISH = "https://www.scmlzx.cn/news/202511/497838942620618752.html"
SENIOR_2025_PDF = "https://www.scmlzx.net/uploadfile/2025/1110/%EF%BC%8810%EF%BC%89%E6%99%AE%E9%80%9A%E9%AB%98%E4%B8%AD%E7%94%9F%E7%89%A9%E5%AD%A6%E8%AF%BE%E7%A8%8B%E6%A0%87%E5%87%86%E6%97%A5%E5%B8%B8%E4%BF%AE%E8%AE%A2%E7%89%88%EF%BC%882017%E5%B9%B4%E7%89%882025%E5%B9%B4%E4%BF%AE%E8%AE%A2%EF%BC%89.pdf"
SENIOR_2025_READ = {"b1":"12—15", "b2":"16—19", "s1":"20—23", "s2":"24—27", "s3":"27—31"}
VERSION_BOUNDARY = "初中采用2022课标修订六单元新编体系；八下2026新编已确认。官方2026春秋通报还确认七上、七下与高中五册有2026教材目录更新。已记录更新事实，但未取得更新后各册完整目录、正文与版权页；公开较早目录仅作章级定位参考，不能视为已逐项核验2026更新内容。高中五模块已对照2025日常修订课程标准正文（学校官网转载的可读缓存文本）；这不等于已读2026教材全文，也不自动证明纸书新版版次。"

UNITS = {
 1: "第一单元 生物和细胞", 2: "第二单元 多种多样的生物",
 3: "第三单元 植物的生活", 4: "第四单元 人体生理与健康",
 5: "第五单元 生物与环境", 6: "第六单元 生命的延续和发展",
}
JCHAPTERS = {
 (1,1): "第一章 认识生物", (1,2): "第二章 认识细胞", (1,3): "第三章 从细胞到生物体",
 (2,1): "第一章 藻类与植物的类群", (2,2): "第二章 动物的类群", (2,3): "第三章 微生物", (2,4): "第四章 生物分类的方法",
 (3,1): "第一章 被子植物的一生", (3,2): "第二章 植物体内的物质与能量变化",
 (4,1): "第一章 人的生殖和发育", (4,2): "第二章 人体的营养", (4,3): "第三章 人体的呼吸",
 (4,4): "第四章 人体内物质的运输", (4,5): "第五章 人体内废物的排出", (4,6): "第六章 人体生命活动的调节", (4,7): "第七章 健康地生活",
 (5,1): "第一章 生态系统", (5,2): "第二章 生态安全",
 (6,1): "第一章 生物的生殖", (6,2): "第二章 生物的遗传与变异", (6,3): "第三章 生物的进化", (6,4): "第四章 生物多样性及其保护",
}
SCHAPTERS = {
 "b1": ["走近细胞","组成细胞的分子","细胞的基本结构","细胞的物质输入和输出","细胞的能量供应和利用","细胞的生命历程"],
 "b2": ["遗传因子的发现","基因和染色体的关系","基因的本质","基因的表达","基因突变及其他变异","生物的进化"],
 "s1": ["人体的内环境与稳态","神经调节","体液调节","免疫调节","植物生命活动的调节"],
 "s2": ["种群及其动态","群落及其演替","生态系统及其稳定性","人与环境"],
 "s3": ["发酵工程","细胞工程","基因工程","生物技术的安全性与伦理问题"],
}
BOOK_DEFS = [
 ("j7u","七年级上册",7,"上","义务教育",[(1,1),(1,2),(1,3),(2,1),(2,2),(2,3),(2,4)],20),
 ("j7l","七年级下册",7,"下","义务教育",[(3,1),(3,2),(4,1),(4,2),(4,3),(4,4),(4,5)],20),
 ("j8u","八年级上册",8,"上","义务教育",[(4,6),(4,7),(5,1),(5,2)],16),
 ("j8l","八年级下册",8,"下","义务教育",[(6,1),(6,2),(6,3),(6,4)],16),
 ("b1","必修1 分子与细胞",10,"上","必修",list(range(1,7)),26),
 ("b2","必修2 遗传与进化",10,"下","必修",list(range(1,7)),24),
 ("s1","选择性必修1 稳态与调节",11,"上","选择性必修",list(range(1,6)),22),
 ("s2","选择性必修2 生物与环境",11,"下","选择性必修",list(range(1,5)),17),
 ("s3","选择性必修3 生物技术与工程",12,"全","选择性必修",list(range(1,5)),18),
]

BOOKS = {}
for code, volume, grade, semester, level, chapters, count in BOOK_DEFS:
    junior = code.startswith("j")
    title = ("义务教育教科书 生物学 " if junior else "普通高中教科书 生物学 ") + volume
    verification = (
      "已实读出版社新教材介绍、六单元22章框架图及编写者论文的册次分配；本图谱主题为原创知识细分，不冒充原书小节。未取得各册现行印次完整正文。"
      if junior else
      "已实读出版社公开培训资料中的本册完整目录截图及官方课程标准对应模块正文；未取得2026在用印次全册正文，图谱主题为原创细分。"
      if code in {"b1","b2"} else
      "已实读出版社五册教材介绍、官方课程标准对应模块正文及教育部精品课目录中的本册章名；未取得本册现行印次完整目录与正文，图谱主题为原创细分。"
    )
    source_url = JUNIOR_INTRO if junior else SENIOR_TOC if code in {"b1","b2"} else MOE_LESSONS
    read_scope = (
      ["出版社2024年新教材介绍全文及框架图", "编写者论文PDF第2—3页的单元内容、册次安排；论文其余相关教材特点"] if junior else
      ["出版社2019教材介绍图页1—9（原册67—75页）", "2021公开培训PDF第19—20页新教材目录", "官方2020修订课程标准PDF第20—24页（印刷11—15页）"] if code == "b1" else
      ["出版社2019教材介绍图页1—9（原册67—75页）", "2021公开培训PDF第57—59页新教材目录", "官方2020修订课程标准PDF第24—28页（印刷15—19页）"] if code == "b2" else
      ["出版社2019教材介绍图页1—9（原册67—75页）", "教育部2023公布精品课清单PDF第44页：第1、2、5章；2024公布清单检索原文：第3、4章", "官方2020修订课程标准PDF第28—32页（印刷19—23页）"] if code == "s1" else
      ["出版社2019教材介绍图页1—9（原册67—75页）", "教育部2023公布精品课清单PDF第44页：四章、生态工程第3节", "官方2020修订课程标准PDF第32—36页（印刷23—27页）", "出版社2021种群教学设计公开培训PDF，种群数量与调查方法正文"] if code == "s2" else
      ["出版社2019教材介绍图页1—9（原册67—75页）", "教育部2023公布精品课清单PDF第44页：第1—3章；2025公布清单检索原文第485页：第4章", "官方2020修订课程标准PDF第36—40页（印刷27—31页）", "国家中小学智慧教育平台公开PDF的检索摘录：第4章；直接下载403，未作为全册已读"]
    )
    BOOKS[code] = {
      "id":"pep_biology_"+code, "title":title, "volume":volume,"publisher":"人民教育出版社",
      "grade":grade,"semester":semester,"curriculum_level":level,
      "edition":None,"edition_note":"未取得本册现行印次版权页，不猜测版次与年月。",
      "approval":"2024年教育部审定目录列入七至八年级四册" if junior else None,
      "curriculum_basis":"义务教育生物学课程标准（2022年版）" if junior else "普通高中生物学课程标准（2017年版）；已对照2017年版2020年修订正文",
      "printing":None,"isbn":None,
      "version_note":("2022课标修订的新编六单元体系；2024起逐册投入使用。八下2026年新编由2026年3月官方教材更新通报确认。" if junior else "五册必修/选择性必修体系；未将2025课程标准日常修订视为纸质教材新版。未取得能排除后续局部改动的2026版权页。"),
      "source_url":source_url,"evidence_pdf_url":JUNIOR_PAPER if junior else SENIOR_TOC if code in {"b1","b2"} else SENIOR_STD,
      "verification":verification,"evidence_level":"官方编写说明与章级框架" if junior else "官方培训资料完整目录与课程标准正文" if code in {"b1","b2"} else "官方书目、教育部章名索引与课程标准正文",
      "read_scope":read_scope,
      "supporting_urls":([JUNIOR_FRAMEWORK,JUNIOR_PAPER,JUNIOR_CURRENT,JUNIOR_2026_NEWS] if junior else [SENIOR_INTRO,SENIOR_TOC,SENIOR_STD,MOE_LESSONS,MOE_LESSONS_2024,MOE_LESSONS_2025]),
      "limitations":["没有逐页读取该册最新版完整正文；摘要与题目是原创教学重述，并非教材原文或原题。", "最近印次、ISBN、版权页年月尚待逐册实物或官方电子版权页核对。", "覆盖核心概念和探究能力，不代表课文、栏目、活动和习题穷尽。"],
    }

for _code,_date,_item,_url in [
 ("j7u","2026-08-24",16,UPDATE_AUTUMN), ("j7l","2026-02-27",44,UPDATE_SPRING),
 ("b1","2026-08-24",21,UPDATE_AUTUMN), ("b2","2026-02-27",42,UPDATE_SPRING),
 ("s1","2026-08-24",22,UPDATE_AUTUMN), ("s2","2026-08-24",23,UPDATE_AUTUMN), ("s3","2026-02-27",43,UPDATE_SPRING),
]:
    _b=BOOKS[_code]
    _b["verified_update"]={"label":"2026年更新","notice_date":_date,"notice_item":_item,"meaning":"官方比对后报告教材目录发生变化；不等于版权页版次、印次或全部变更内容已核验"}
    _b["update_evidence_url"]=_url
    _b["version_note"] += " 官方"+_date+"通报第"+str(_item)+"项列为2026年更新，更新后完整目录和正文尚未取得。"
    _b["verification"] += " 已发现2026目录更新通报；上述较早章级定位不得解读为2026更新后目录已逐项一致性核验。"
    _b["read_scope"].append("已实读"+_date+"地方教育局教材目录更新通报第"+str(_item)+"项，未提供具体改动目录")
    _b["supporting_urls"].append(_url)
    _b["limitations"].insert(0,"已知2026目录更新的具体改动尚待新目录与正文核验。")
BOOKS["j8l"]["verified_update"]={"label":"2026年新编","notice_date":"2026-03-05","notice_item":63,"meaning":"新编投入使用已确认，完整版权页与逐节内容未取得"}
BOOKS["j8l"]["update_evidence_url"]=JUNIOR_CURRENT
BOOKS["j8u"]["version_note"] += " 出版社2026年介绍确认八上新编教材自2025年秋使用；本次未找到另列2026目录更新的证据。"

for _code,_pages in SENIOR_2025_READ.items():
    _b=BOOKS[_code]
    _b["curriculum_basis"]="普通高中生物学课程标准日常修订版（2017年版2025年修订）；已读对应模块正文并参考2020修订版作前后核对"
    _b["verification"] += " 已实读2025日常修订课程标准本模块正文（印刷第"+_pages+"页，学校官网转载缓存）；课程标准校核不代替2026教材正文校核。"
    _b["read_scope"].append("2025日常修订课程标准印刷第"+_pages+"页：本模块内容要求、教学提示与学业要求，另读封面目录；学校官网转载附件的可读缓存文本")
    _b["supporting_urls"].extend([SENIOR_2025_PUBLISH,SENIOR_2025_PDF])
    _b["curriculum_current_evidence"]={"title":"普通高中生物学课程标准日常修订版（2017年版2025年修订）","document_authority":"教育部国家课程标准；并以人教社2026培训消息交叉核对版本名称","repost_publisher":"木里藏族自治县中学","repost_date":"2025-11-10","publish_url":SENIOR_2025_PUBLISH,"read_url":SENIOR_2025_PDF,"read_printed_pages":_pages,"access":"发布页附件已核；旧域PDF网页缓存全文可读，直接下载404，新域附件403；未取得本地文件","local_sha256":None,"limitation":"学校转载的课程标准，不是人民教育出版社2026教材正文"}
BOOKS["b1"]["chapter_title_variants"]=[
 {"chapter":4,"display":"细胞的物质输入和输出","variant":"细胞的物质输入与输出","evidence":"2021培训目录与2023教育部课程目录分别出现和/与差异；保留别名，不推断2026目录已核。"},
 {"chapter":5,"display":"细胞的能量供应和利用","variant":"细胞的能量供应与利用","evidence":"2021培训目录与2023教育部课程目录分别出现和/与差异；保留别名，不推断2026目录已核。"},
]

CURRICULUM_REFERENCES = [
 {"title":"教育部2022年义务教育课程方案和课程标准通知","url":"https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html","evidence_level":"官方发布通知"},
 {"title":"2024年义务教育国家课程教学用书目录（人教生物七至八年级）","url":"https://www.moe.gov.cn/srcsite/A26/s8001/202408/W020240805496325238752.pdf","evidence_level":"正式审定书目"},
 {"title":"普通高中生物学课程标准（2017年版2020年修订）","url":SENIOR_STD,"evidence_level":"对应五模块正文已读","read_scope":"PDF第20—40页；第27页未单独逐段复核，核心概念已涵盖于第25—26页"},
 {"title":"人教社2026年关于2025日常修订课程标准示范培训的官方消息","url":REVISION_2026,"evidence_level":"2025日常修订与教材使用培训官方消息，已读官方检索原文","limitation":"培训消息不证明全套纸书产生新的版次；直接页面访问403"},
 {"title":"普通高中生物学课程标准日常修订版（2017年版2025年修订）","url":SENIOR_2025_PDF,"publish_url":SENIOR_2025_PUBLISH,"document_authority":"教育部国家课程标准","repost_publisher":"木里藏族自治县中学","repost_date":"2025-11-10","evidence_level":"官方学校转载的课程标准正文；非教材正文","read_scope":"封面、目录、课程性质与目标；印刷第12—31页的五模块全部内容要求、教学提示及学业要求。网页文本行262—828。","local_sha256":None,"limitation":"实际可读为旧域PDF网页缓存；直接下载404，新域附件403，未取得本地PDF。未将学校转载者视为教材出版社。"},
]

def chapter_record(code, chapter):
    if code.startswith("j"):
        return {"unit":UNITS[chapter[0]],"chapter":JCHAPTERS[tuple(chapter)]}
    return {"chapter":f"第{chapter}章 {SCHAPTERS[code][chapter-1]}"}

def plan():
    return [{"book":BOOKS[c]["id"],"volume":v,"planned_topic_count":n,"chapters":[chapter_record(c,x) for x in ch]} for c,v,g,s,l,ch,n in BOOK_DEFS]
