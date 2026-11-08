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


def published_question(props):
    stem, answer = props['stem'].strip(), props['answer'].strip()
    # Retain the published option order: answers or explanations can refer to a letter.
    options = list(re.finditer(r'(?<![A-Za-z0-9])([A-D])[.．、]\s*', stem))
    key = re.fullmatch(r'([A-D])(?:[。.]|[（(].*[）)])?', answer, re.S)
    if key and len(options) >= 2:
        keys = ''.join(m[1] for m in options)
        if keys == 'ABCD'[:len(keys)] and key[1] in keys:
            spans = [m.start() for m in options] + [len(stem)]
            choices = [{'key':m[1], 'text':stem[m.end():spans[i+1]].strip().rstrip('；;')} for i,m in enumerate(options)]
            if all(c['text'] for c in choices):
                return dict(type='choice', prompt=stem[:spans[0]].rstrip(), answer=key[1], choices=choices,
                            sourceAnswer=answer)
    verdict = re.match(r'^(正确|错误|对|错|√|×)(?=$|[。，；、（(])', answer)
    if (props.get('type') == '判断题' and verdict and
            not re.search(r'理由|为什么|解释|原因|\([2-9]\)|（[2-9]）', stem)):
        choices = [{'key':'A','text':'正确'}, {'key':'B','text':'错误'}]
        return dict(type='choice',prompt=stem,answer='A' if verdict[1] in ('正确','对','√') else 'B',
                    choices=choices,sourceAnswer=answer)
    kind = 'numeric' if re.fullmatch(r'-?\d+(?:\.\d+|/\d+)?', answer) and not re.search(r'为什么|说明|方法|解释|证明|竖式',stem) else 'self'
    return dict(type=kind,prompt=stem,answer=answer)


def write_exercises(subject, raw, nodes, ids):
    selected = json.loads((ROOT / 'scripts' / 'k12-exercise-selection.json').read_text())[subject]
    links = defaultdict(list)
    for edge in raw['edges']:
        if edge['type'] in ('tests_concept','tests_skill'):
            for item in edge.get('target_name_to_ids', []):
                origin = item.get('target')
                if origin in ids and ids[origin] not in links[edge['source']]:
                    links[edge['source']].append(ids[origin])
    questions = []
    for code, numbers in selected.items():
        for number in numbers:
            book_id = subject + '_' + code + '_rjb'
            source_id = book_id + '_exe' + str(number)
            node = nodes[source_id]
            assert node['label'] == 'Exercise' and links[source_id], source_id
            props = node['properties']
            assert isinstance(props.get('answer'),str) and props['answer'].strip(), source_id
            question = published_question(props)
            if props.get('analysis'):
                question['explanation'] = props['analysis'].strip()
            # A source book and its exercise number yield a stable slot across future additions.
            if code.startswith('xzxbx'):
                book_code = 40 + int(code[-1])
            elif code.startswith('bx'):
                book_code = 30 + int(code[-1])
            else:
                book_code = int(code[0]) * 3 + {'a':0, 'b':1, '':2}[code[1:]]
            slot = 100000 + 1000 * book_code + number
            primary = links[source_id][0]
            question.update(id=primary+'_q'+str(slot), topicId=primary, linkedTopicIds=links[source_id],
                            source='k12-exercise', sourceId=source_id, sourceBook=nodes[book_id]['name'],
                            difficulty={1:'basic',2:'basic',3:'standard',4:'advanced',5:'advanced'}[props['difficulty']])
            questions.append(question)
    assert len({q['sourceId'] for q in questions}) == len(questions)
    key = 'exercises-' + subject + '.json'
    js = 'window.ToyData.register(' + compact(key) + ',' + compact(compact(questions)) + ');\n'
    file = f'exercises-{subject}.{sha256(js.encode()).hexdigest()[:12]}.js'
    (OUT / file).write_text(js)
    return [key,file], len(questions)


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
    exercise_file, stats['selectedExercises'] = write_exercises(subject, raw, nodes, ids)
    return filenames, stats, exercise_file


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-dir', type=Path)
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    manifest, stats, exercises = {}, {}, {}
    for subject in SUBJECTS:
        source = ((args.from_dir / f'{subject}.json').read_bytes() if args.from_dir else
                  urlopen(f'{URL}/{subject}.json', timeout=90).read())
        manifest[subject], stats[subject], exercises[subject] = build(subject, source)
    (OUT / 'index.json').write_text(json.dumps({'revision':REV,'books':manifest,'stats':stats,'exercises':exercises},ensure_ascii=False,indent=2)+'\n')
    keep = {file for rows in manifest.values() for _,file in rows}
    keep.update(file for _,file in exercises.values())
    for file in OUT.glob('*.js'):
        if file.name not in keep:
            file.unlink()
    print(json.dumps(stats,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
