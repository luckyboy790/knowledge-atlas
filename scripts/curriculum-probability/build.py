#!/usr/bin/env python3
"""Rebuild this original curriculum without third-party packages."""
import argparse, hashlib, importlib, json
from pathlib import Path
from common import CHAPTERS,render,BOOK_URL

ROOT=Path(__file__).resolve().parent
def dump(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def build(out):
    required=[ROOT/f'{module}.py' for module in CHAPTERS]+[ROOT/'source_metadata.json']
    missing=[str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError('完整构建缺少必需作者源文件: '+', '.join(missing))
    topics=[]; questions=[]; deps=[]; chapters=[]
    for module,(ch,title,order) in CHAPTERS.items():
        authored=importlib.import_module(module).TOPICS
        t,q,d=render(module,authored); topics+=t; questions+=q; deps+=d
        chapters.append(dict(module=module,chapter=ch,title=title,topic_ids=[x['id'] for x in t],source_sections=list(dict.fromkeys(x['textbook']['section'] for x in t)),exam_scope_status='规划分类基于公开备考目录；2027考试大纲全文待复核'))
    source_path=ROOT/'source_metadata.json'
    sources=json.loads(source_path.read_text(encoding='utf-8'))
    sources['topics']=[dict(id=t['id'],name=t['name'],textbook=t['textbook'],exam_scope=t['exam_scope']) for t in topics]
    coverage=dict(schema_version='1.0',subject='math',course_id='probability_statistics',course='概率论与数理统计',grade=17,chapters=chapters,topic_count=len(topics),question_count=len(questions),dependency_count=len(deps),scope_note=sources['scope_note'],not_included=['第六章§2直方图和箱线图','第七章§2截尾样本最大似然估计、§6(0–1)分布参数区间估计、§8贝叶斯估计','第八章§5样本容量选取、§6分布拟合检验、§7列联表检验','第九至十四章的方差分析、回归、Bootstrap、R与随机过程'],verification_limits=['仅核验出版社公开书目和父节目录，未逐页核验教材全文','2027官方考试大纲已核书目，未取得全文逐条核对','AI原创内容仍需教师审核'])
    outputs=dict(topics=topics,questions=questions,dependencies=deps,sources=sources,coverage=coverage)
    for suffix,data in outputs.items(): dump(out/f'math-probability-{suffix}.json',data)
    return outputs

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--out',type=Path,default=ROOT); parser.add_argument('--snapshot',choices=list(CHAPTERS)); args=parser.parse_args()
    outputs=build(args.out)
    if args.snapshot:
        ids={t['id'] for t in outputs['topics'] if t['module']==args.snapshot}
        p=ROOT/'snapshots'/args.snapshot
        for kind in ['topics','questions','dependencies']:
            data=[x for x in outputs[kind] if (x['id'] if kind=='topics' else x['topicId']) in ids]
            dump(p/f'{kind}.json',data)
        dump(p/'manifest.json',{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(p.glob('*.json')) if f.name!='manifest.json'})
    print(json.dumps({k:len(outputs[k]) for k in ['topics','questions','dependencies']},ensure_ascii=False))
