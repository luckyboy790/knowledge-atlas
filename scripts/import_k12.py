#!/usr/bin/env python3
"""Build offline book scripts from a pinned K12-KGraph release. See data/k12/README.md."""
import argparse
from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'k12'
REV = 'd8522c2b336ee435aa51daa39ca0dd736f56fa53'
URL = f'https://huggingface.co/datasets/lhpku20010120/K12-KGraph/resolve/{REV}/K12-KGraph/subject_specific_KG'
SUBJECTS = dict(math='cnm', physics='cnp', chemistry='cnc', biology='cnb')
DIGITS = '〇一二三四五六七八九'
TYPES = {'Concept': '概念', 'Skill': '技能', 'Experiment': '实验'}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def book_info(subject, code, title):
    match = re.fullmatch(r'(\d)([ab]?)', code)
    if match:
        grade = int(match[1])
        term = {'a': '上', 'b': '下', '': '全'}[match[2]]
        return grade, term, DIGITS[grade] + term, title
    number = int(code[-1])
    elective = code.startswith('xz')
    if subject == 'math':
        grade = 11 + number if elective else 9 + number
        key = ('选必' if elective else '高') + DIGITS[number]
    else:
        grade = (12 if number == 3 else 11) if elective else (11 if number == 3 else 10)
        key = ('选必' if elective else '必修') + DIGITS[number]
    return grade, '', key, title


def cycle_edges(edges):
    """Tarjan SCCs. Preserve every intra-component edge as an inspectable source link."""
    neighbors = defaultdict(list)
    for a, b, _ in edges:
        neighbors[a].append(b)
    seen, low, comp, stack, active = {}, {}, {}, [], set()

    def visit(a):
        seen[a] = low[a] = len(seen)
        stack.append(a)
        active.add(a)
        for b in neighbors.get(a, []):
            if b not in seen:
                visit(b)
                low[a] = min(low[a], low[b])
            elif b in active:
                low[a] = min(low[a], seen[b])
        if low[a] == seen[a]:
            while True:
                b = stack.pop()
                active.remove(b)
                comp[b] = a
                if a == b:
                    break

    for a in list(neighbors):
        if a not in seen:
            visit(a)
    return {(a, b) for a, b, _ in edges if comp[a] == comp[b]}


def build(subject, source):
    prefix = SUBJECTS[subject]
    raw = json.loads(source)
    nodes = {n['id']: n for n in raw['nodes']}
    books, learning, omitted = {}, {}, []
    for key, n in nodes.items():
        if n['label'] == 'Book':
            books[key] = {'book': book_info(subject, key.split('_')[1], n['name']),
                          'topics': [], 'dependencies': [], 'relations': []}
        if n['label'] in TYPES:
            if re.fullmatch(r'node_\d+', n['name']) and not n.get('properties'):
                omitted.append(key)
            else:
                learning[key] = n
    old_file = ('' if subject == 'math' else subject + '-') + 'topics.json'
    legacy = defaultdict(list)
    for topic in json.loads((ROOT / 'data' / old_file).read_text()):
        if topic['id'].startswith(prefix + '_') and not topic.get('external') and topic['grade'] < 15:
            legacy[topic['name']].append(topic)
    counts = Counter(n['name'] for n in learning.values())
    ids = {}
    appearances, parent = defaultdict(list), {}
    for e in raw['edges']:
        if e['type'] == 'appears_in' and e.get('target') in nodes:
            appearances[e['source']].append(e['target'])
        if e['type'] == 'is_part_of':
            parent[e['source']] = e['target']
    for key, n in learning.items():
        book, local = key.split('_rjb_', 1)
        bid = book + '_rjb'
        grade, term, _, _ = books[bid]['book']
        previous = legacy[n['name']]
        old = previous[0] if counts[n['name']] == len(previous) == 1 else None
        if old and (old['grade'] != grade or (term in ('上','下') and old.get('semester') not in (term, '全'))):
            old = None
        site_id = old['id'] if old else prefix + '_k' + book.split('_')[1] + local
        ids[key] = site_id
        loc = []
        for target in appearances[key]:
            section = nodes[target]['label'] == 'Section'
            chapter = parent.get(target) if section else target
            if chapter not in nodes or nodes[chapter]['label'] != 'Chapter':
                continue
            chapter_id = chapter.split('_')[-1].removeprefix('ch')
            row = [chapter_id, nodes[chapter]['name'], nodes[target]['name'] if section else '']
            if row not in loc:
                loc.append(row)
        props = n.get('properties', {})
        summary = props.get('definition') or props.get('description') or props.get('process') or props.get('conclusion', '')
        if not summary and props.get('instrument'):
            summary = '实验器材：' + '、'.join(props['instrument']) + '。'
        fields = {k:props[k] for k in ('formula','examples','aliases','phenomena','conclusion') if props.get(k) and props[k] != summary}
        books[bid]['topics'].append([site_id, key, n['name'], TYPES[n['label']], summary, loc, fields])
    deps, relations, seen = [], [], set()
    prereq_rows = 0
    for e in raw['edges']:
        a, b, typ = e['source'], e.get('target'), e['type']
        if typ == 'prerequisites_for':
            prereq_rows += 1
        if a not in ids or b not in ids or (a,b,typ) in seen:
            continue
        seen.add((a,b,typ))
        if typ == 'prerequisites_for':
            deps.append((a, b, e.get('properties',{}).get('evidence','')))
        elif typ in ('is_a','verifies','relates_to'):
            relations.append((a, b, typ))
    cyclic = cycle_edges(deps)
    for a, b, evidence in deps:
        if (a,b) in cyclic:
            relations.append((a,b,'cycle'))
        else:
            books[a.split('_rjb_')[0]+'_rjb']['dependencies'].append([ids[a],ids[b],evidence])
    for a, b, typ in relations:
        books[a.split('_rjb_')[0]+'_rjb']['relations'].append([ids[a],ids[b],typ])
    filenames = []
    for bid, book in books.items():
        raw_book = compact(book)
        key = 'k12-' + bid + '.json'
        js = 'window.ToyData.register(' + compact(key) + ',' + compact(raw_book) + ');\n'
        digest = sha256(js.encode()).hexdigest()[:12]
        file = f'{bid}.{digest}.js'
        (OUT / file).write_text(js)
        filenames.append([key, file])
    stats = dict(books=len(books), topics=len(ids), sourcePrerequisites=prereq_rows,
                 diagnosticEdges=len(deps)-len(cyclic), cycleEdges=len(cyclic),
                 nonLearningOrDuplicateEdges=prereq_rows-len(deps), omitted=omitted,
                 retainedIds=sum(not v.startswith(prefix + '_k') for v in ids.values()),
                 sourceSHA256=sha256(source).hexdigest())
    return filenames, stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-dir', type=Path)
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    manifest, stats = {}, {}
    for subject in SUBJECTS:
        source = ((args.from_dir / f'{subject}.json').read_bytes() if args.from_dir else
                  urlopen(f'{URL}/{subject}.json', timeout=90).read())
        manifest[subject], stats[subject] = build(subject, source)
    (OUT / 'index.json').write_text(json.dumps({'revision':REV,'books':manifest,'stats':stats},ensure_ascii=False,indent=2)+'\n')
    keep = {file for rows in manifest.values() for _,file in rows}
    for file in OUT.glob('*.js'):
        if file.name not in keep:
            file.unlink()
    print(json.dumps(stats,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
