#!/usr/bin/env python3
"""Build original biology curriculum JSON with deterministic identifiers and checks.

Usage: python build.py --out ./output [--books j7u j7l] [--snapshot-tag junior-v1]
No network access is used by this script. Public-source documents are not redistributed.
"""
import argparse, collections, copy, hashlib, importlib, json
from pathlib import Path
from metadata import BOOKS, BOOK_DEFS, CHECKED_DATE, REVIEW_STATUS, CURRICULUM_REFERENCES, VERSION_BOUNDARY, chapter_record
from review_stamp import apply_independent_review

def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode("utf-8")

def digest(obj):
    def clean(x):
        if isinstance(x,dict):
            return {k:clean(v) for k,v in x.items() if k not in {"review_status","review_record"}}
        if isinstance(x,list): return [clean(v) for v in x]
        return x
    return hashlib.sha256(json.dumps(clean(obj),ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()

def build(selected):
    rows=[]; offsets={}; offset=0
    for code,*rest,count in BOOK_DEFS:
        offsets[code]=offset; offset+=count
        if code in selected:
            module=importlib.import_module("book_"+code)
            assert len(module.ROWS)==count, (code,len(module.ROWS),count)
            for i,r in enumerate(module.ROWS,1):
                rows.append(dict(copy.deepcopy(r),book_code=code,id=f"cnb_{offsets[code]+i:03d}"))
    by_slug={r["slug"]:r for r in rows}
    assert len(by_slug)==len(rows)
    topics=[]; questions=[]; dependencies=[]
    for r in rows:
        code=r["book_code"]; b=BOOKS[code]; chapter=chapter_record(code,r["chapter"])
        textbook={"book":b["id"],"title":b["title"],"volume":b["volume"],**chapter,
                  "section":r["section"] or "本图谱主题："+r["name"],"source_url":b["source_url"],"verification":b["verification"]}
        t={"id":r["id"],"name":r["name"],"subject":"biology","domain":chapter.get("unit",b["volume"]),
           "grade":b["grade"],"semester":b["semester"],"chapter":" / ".join([b["volume"],*chapter.values()]),
           "module":b["id"],"type":"conceptual","description":r["description"],"mastery_criteria":r["mastery_criteria"],
           "external":False,"standards":[],"epistemic_status":"modern_biology","curriculum_level":b["curriculum_level"],
           "grade_assignment_note":"初中按新编教材官方册次安排。" if code.startswith("j") else "高中年级、学期是图谱建议学习编排，不代表全国统一教学进度。",
           "textbook":textbook,"review_status":REVIEW_STATUS}
        for j,q in enumerate(r["questions"],1):
            # Rotation changes only the key; original correct content remains explicit.
            shift=(int(r["id"].split("_")[1])+j-2)%4
            options=q["options"][-shift:]+q["options"][:-shift] if shift else q["options"][:]
            answer="ABCD"[options.index(q["correct"])]
            out={"id":r["id"]+f"_q{j}","topicId":r["id"],"difficulty":"basic" if j==1 else "standard","type":"choice",
                 "prompt":q["prompt"],"choices":[{"key":key,"text":txt} for key,txt in zip("ABCD",options)],"answer":answer,
                 "explanation":q["explanation"],"textbook":copy.deepcopy(textbook),"origin":"原创练习，不是教材原题","review_status":REVIEW_STATUS}
            questions.append(out)
            if j==1: t["diagnostic_question"]={"question":q["prompt"],"answer":q["correct"]}
        topics.append(t)
        for slug,strength,reason in r["prerequisites"]:
            assert slug in by_slug, (r["slug"],slug,"select all earlier books needed by dependencies")
            prerequisite=by_slug[slug]
            if (b["grade"]<=8) != (BOOKS[prerequisite["book_code"]]["grade"]<=8): strength="soft"
            dependencies.append({"topicId":r["id"],"prerequisiteId":prerequisite["id"],"strength":strength,"reason":reason})
    sources={"schema_version":"1.0","subject":"biology","checked_date":CHECKED_DATE,
      "scope":"人教版初中四册及普通高中必修、选择性必修五册的核心知识；当前输出书册以books数组为准。",
      "method":"逐册记录官方证据层级；摘要、掌握标准和两题均原创，依赖表示教学先修。未读原书小节以本图谱主题标记。",
      "version_boundary":VERSION_BOUNDARY,
      "books":[copy.deepcopy(BOOKS[c]) for c,*_ in BOOK_DEFS if c in selected],
      "curriculum_references":CURRICULUM_REFERENCES,"topics":[{"id":t["id"],"name":t["name"],"textbook":t["textbook"]} for t in topics]}
    coverage_books=[]
    for c,*_ in BOOK_DEFS:
        if c not in selected: continue
        b=BOOKS[c]; chapter_map={}
        for t in topics:
            if t["module"]!=b["id"]: continue
            tb=t["textbook"]; key=(tb.get("unit"),tb["chapter"])
            if key not in chapter_map: chapter_map[key]={**({"unit":key[0]} if key[0] else {}),"chapter":key[1],"sections":[]}
            chapter_map[key]["sections"].append({"section":tb["section"],"topic_ids":[t["id"]],"status":"主干概念已建；非全课文穷尽","evidence_level":b["evidence_level"]})
        coverage_books.append({"book":b["id"],"volume":b["volume"],"chapters":list(chapter_map.values())})
    coverage={"schema_version":"1.0","subject":"biology","checked_date":CHECKED_DATE,"scope":sources["scope"],"books":coverage_books,
      "topic_count":len(topics),"question_count":len(questions),"dependency_count":len(dependencies),
      "excluded_content":["教材原图、原文、原题和逐页再现", "未取得官方证据的版次、印次、ISBN与页码", "完整实验操作训练、临床诊疗和个人医疗决策", "全部栏目、项目、探究实践与拓展阅读的穷尽覆盖", "高中不同群落类型及其逐类适应特征尚未详细展开；全球环境问题覆盖碳收支、资源需求和生物多样性等主干，未对全部专题逐项设点"],
      "limitations":[sources["version_boundary"],"客观题只能检测部分概念表现，不能替代观察实验、项目实践与教师评价。", "AI作者自查不能替代独立复核和教师审核。"]}
    check(topics,questions,dependencies,sources,coverage)
    apply_independent_review(topics+questions)
    return {"topics":topics,"questions":questions,"dependencies":dependencies,"sources":sources,"coverage":coverage}

def check(topics,questions,deps,sources,coverage):
    ts={x["id"]:x for x in topics}; qs={x["id"]:x for x in questions}
    assert len(ts)==len(topics) and len(qs)==len(questions)
    assert len(questions)==2*len(topics)
    assert len({x["prompt"] for x in questions})==len(questions), "duplicate prompt"
    for t in topics:
        assert len(t["mastery_criteria"])>=2 and len(t["description"])>=35
        local=[qs[t["id"]+suffix] for suffix in ["_q1","_q2"]]
        for q in local:
            assert q["topicId"]==t["id"] and q["textbook"]==t["textbook"]
            assert [x["key"] for x in q["choices"]]==list("ABCD")
            assert len({x["text"] for x in q["choices"]})==4
            assert q["answer"] in "ABCD" and q["explanation"]
        first=local[0]
        assert t["diagnostic_question"]=={"question":first["prompt"],"answer":next(x["text"] for x in first["choices"] if x["key"]==first["answer"])}
    pairs=set(); adjacency={k:[] for k in ts}
    for d in deps:
        a,b=d["topicId"],d["prerequisiteId"]
        assert a in ts and b in ts and a!=b and (a,b) not in pairs
        assert d["strength"] in {"soft","hard"} and d["reason"]
        pairs.add((a,b)); adjacency[a].append(b)
    seen=set(); active=set()
    def visit(v):
        assert v not in active, "dependency cycle"
        if v in seen:return
        active.add(v)
        for w in adjacency[v]: visit(w)
        active.remove(v);seen.add(v)
    for v in ts:visit(v)
    mapped=[i for b in coverage["books"] for c in b["chapters"] for s in c["sections"] for i in s["topic_ids"]]
    assert collections.Counter(mapped)==collections.Counter(ts.keys())
    assert {x["id"] for x in sources["topics"]}==set(ts)

def main():
    p=argparse.ArgumentParser();p.add_argument("--out",type=Path,default=Path(__file__).resolve().parent/"output")
    p.add_argument("--books",nargs="+",default=[x[0] for x in BOOK_DEFS]);p.add_argument("--snapshot-tag")
    args=p.parse_args(); data=build(args.books);args.out.mkdir(parents=True,exist_ok=True)
    for name,obj in data.items(): (args.out/f"biology-{name}.json").write_bytes(encode(obj))
    report={"checked_date":CHECKED_DATE,"checks":"ID、两题、唯一选项、答案键、诊断同步、来源映射、覆盖、无重复边、自环和DAG通过", "counts":{k:len(data[k]) for k in ["topics","questions","dependencies"]},"semantic_sha256":digest(data),"independent_review":"本报告为作者侧结构自查，不判定独立内容复核状态；独立复核见 validation/biogeo-content-review.json，尚未经教师审核。"}
    (args.out/"biology-author-structure-check.json").write_bytes(encode(report))
    if args.snapshot_tag:
        snapdir=args.out/"snapshots"/args.snapshot_tag;snapdir.mkdir(parents=True,exist_ok=False)
        for code in args.books:
            b=BOOKS[code];topics=[t for t in data["topics"] if t["module"]==b["id"]];ids={t["id"] for t in topics}
            payload={"topics":topics,"questions":[q for q in data["questions"] if q["topicId"] in ids],"dependencies":[d for d in data["dependencies"] if d["topicId"] in ids],"book_source":b}
            referenced={d["prerequisiteId"] for d in payload["dependencies"]}-ids
            snapshot={"snapshot_tag":args.snapshot_tag,"book":b["id"],"id_range":[topics[0]["id"],topics[-1]["id"]],"semantic_sha256":digest(payload),"data":payload,"external_prerequisite_context":[t for t in data["topics"] if t["id"] in referenced]}
            (snapdir/f"{code}-snapshot.json").write_bytes(encode(snapshot))
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main()
