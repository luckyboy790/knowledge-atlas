"""Author checks for generated chemistry records; does not replace peer/teacher review."""
from pathlib import Path
from collections import Counter, defaultdict, deque
from math import isclose, log10, sin, pi, sqrt
import json, hashlib, re

ROOT = Path(__file__).resolve().parent
NAMES = ('topics', 'questions', 'dependencies', 'sources', 'coverage')
DATA = {name: json.loads((ROOT / f'uchemistry-{name}.json').read_text()) for name in NAMES}
topics, questions, dependencies = (DATA[n] for n in NAMES[:3])
sources, coverage = (DATA[n] for n in NAMES[3:])
tmap = {t['id']: t for t in topics}
qmap = {q['id']: q for q in questions}
bmap = {b['id']: b for b in sources['books']}
EXPECTED = {'structure': (61, 24), 'thermodynamics': (62, 24), 'kinetics': (63, 18),
            'solution': (64, 22), 'electrochemistry': (65, 18), 'organic': (66, 26),
            'analysis': (67, 28)}
checks = []

def require(name, condition):
    if not condition:
        raise AssertionError(name)
    checks.append(name)

require('160 unique topic IDs', len(topics) == len(tmap) == 160)
require('320 unique question IDs', len(questions) == len(qmap) == 320)
require('five deduplicated book sources', len(bmap) == len(sources['books']) == 5)
require('module counts and grades', all(
    len([t for t in topics if t['module'] == m]) == count
    and all(t['grade'] == grade for t in topics if t['module'] == m)
    for m, (grade, count) in EXPECTED.items()))
require('subject and epistemic status', all(t['subject'] == 'uchemistry'
    and t['epistemic_status'] == 'modern_chemistry' for t in topics))
require('project chapter parser compatibility', all(re.match(r'^第\d+章 ', t['chapter']) for t in topics))
require('two mastery criteria per topic', all(len(t['mastery_criteria']) == 2 for t in topics))
require('topic descriptions substantial', all(len(t['description']) >= 40 for t in topics))
require('all questions have valid topic reference', all(q['topicId'] in tmap for q in questions))
bytopic = defaultdict(list)
for q in questions:
    bytopic[q['topicId']].append(q)
    require(f'{q["id"]}: four distinct choices with ABCD keys',
        len(q['choices']) == 4 and [c['key'] for c in q['choices']] == list('ABCD')
        and len({c['text'] for c in q['choices']}) == 4)
    require(f'{q["id"]}: valid answer and substantive explanation',
        q['answer'] in 'ABCD' and len(q['answer']) == 1 and len(q['explanation']) >= 12)
    require(f'{q["id"]}: source agrees with topic', q['textbook'] == tmap[q['topicId']]['textbook'])
require('every topic has two levels of questions', all(len(bytopic[t]) == 2
    and {q['difficulty'] for q in bytopic[t]} == {'basic', 'standard'} for t in tmap))
require('diagnostic answer consistent with question bank', all(
    t['diagnostic_question']['question'] == qmap[t['id'] + '_q1']['prompt']
    and t['diagnostic_question']['answer'] == next(c['text'] for c in qmap[t['id'] + '_q1']['choices']
        if c['key'] == qmap[t['id'] + '_q1']['answer']) for t in topics))
require('unique question prompts', len({q['prompt'] for q in questions}) == len(questions))
require('no duplicate dependency pairs', len({(d['topicId'], d['prerequisiteId']) for d in dependencies}) == len(dependencies))
require('dependencies reference internal existing nodes and state reason', all(
    d['topicId'] in tmap and d['prerequisiteId'] in tmap
    and d['topicId'] != d['prerequisiteId'] and d['strength'] in ('hard', 'soft')
    and len(d['reason']) >= 12 for d in dependencies))

def acyclic(edges):
    indegree = {t: 0 for t in tmap}
    outgoing = defaultdict(list)
    for edge in edges:
        outgoing[edge['prerequisiteId']].append(edge['topicId'])
        indegree[edge['topicId']] += 1
    queue = deque(t for t, value in indegree.items() if value == 0)
    seen = 0
    while queue:
        node = queue.popleft(); seen += 1
        for nxt in outgoing[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0: queue.append(nxt)
    return seen == len(tmap)

require('full graph including soft relations is acyclic', acyclic(dependencies))
require('hard prerequisite graph is acyclic', acyclic([d for d in dependencies if d['strength'] == 'hard']))
require('all topic source IDs ISBNs editions and URLs agree with books', all(
    t['textbook']['book'] in bmap and all(t['textbook'][field] == bmap[t['textbook']['book']][field]
        for field in ('isbn', 'edition', 'source_url', 'catalog_url')) for t in topics))
require('book module and grade metadata derived from actual topics', all(
    set(b['modules']) == {t['module'] for t in topics if t['textbook']['book'] == b['id']}
    and set(b['grades']) == {t['grade'] for t in topics if t['textbook']['book'] == b['id']}
    for b in bmap.values()))
require('coverage global counts agree', coverage['topic_count'] == len(topics)
    and coverage['question_count'] == len(questions) and len(coverage['courses']) == 7)
for c in coverage['courses']:
    mapped = [tid for unit in c['units'] for point in unit['points'] for tid in point['topicIds']]
    actual = [t['id'] for t in topics if t['module'] == c['id']]
    require(f'{c["id"]}: coverage exhaustive without duplicates', set(mapped) == set(actual)
        and len(mapped) == len(actual) == c['topic_count'] and c['question_count'] == 2 * len(actual))
    require(f'{c["id"]}: all used books listed', set(c['books']) == {tmap[t]['textbook']['book'] for t in actual})
require('full-text verification honestly false', all(b['full_text_verified'] is False for b in bmap.values()))
require('no invented analysis edition number', bmap['uch_analytical_101']['edition'] == '未标版次（以ISBN识别）')

numeric = []
def n(qid, calculation, value, expected, choice, tolerance=0.005):
    q = qmap['uch_' + qid]
    chosen = next(c['text'] for c in q['choices'] if c['key'] == q['answer'])
    assert isclose(value, expected, rel_tol=tolerance, abs_tol=1e-12), (qid, value, expected)
    assert chosen == choice, (qid, chosen, choice)
    numeric.append({'question_id': q['id'], 'independent_author_calculation': calculation,
                    'calculated_value': value, 'rounded_value': expected, 'keyed_choice': chosen, 'passed': True})

n('structure_001_q2', 'nRT/p=1×8.314×300/100 L', 1*8.314*300/100, 24.9, '24.9 L')
n('structure_002_q2', 'p(O2)=150×1/(2+1) kPa', 150/3, 50, '50 kPa')
n('structure_006_q1', 'd sublevel: 2(2l+1), l=2', 2*(2*2+1), 10, '10个')
n('structure_006_q2', 'n=3 shell orbitals: Σ(2l+1), l=0..2', sum(2*l+1 for l in range(3)), 9, '9个')
n('structure_012_q1', 'formal charge=5−0−8/2', 5-8/2, 1, '+1')
n('structure_016_q1', 'bond order=(8−4)/2', (8-4)/2, 2, '2')
n('structure_020_q1', 'FCC:8/8+6/2', 8/8+6/2, 4, '4')
n('structure_020_q2', 'BCC:8/8+1', 8/8+1, 2, '2')
n('structure_021_q2', 'd=0.150/(2sin30°) nm', 0.150/(2*sin(pi/6)), 0.150, '0.150 nm')
n('structure_023_q1', 'three bidentate ligands:3×2', 3*2, 6, '6')
n('structure_023_q2', 'Fe charge−6=−4', -4+6, 2, '+2')
n('thermodynamics_002_q2', 'ΔU=Q+W=500−200 J', 500-200, 300, '+300 J')
n('thermodynamics_003_q2', 'W=−p_extΔV=−100×(5−2) kPa·L', -100*(5-2), -300, '−300 J')
n('thermodynamics_004_q2', 'Cp,m=Cv,m+R=20.8+8.31', 20.8+8.31, 29.1, '29.1 J·mol⁻¹·K⁻¹')
n('thermodynamics_006_q2', 'Hess sum=20−50 kJ/mol', 20-50, -30, '−30 kJ·mol⁻¹')
n('thermodynamics_007_q2', 'ΔH increment=20×(400−300)/1000 kJ/mol', 20*(400-300)/1000, 2, '2.0 kJ·mol⁻¹')
n('thermodynamics_009_q2', 'ΔS=Qrev/T=600/300 J/K', 600/300, 2, '+2.0 J·K⁻¹')
n('thermodynamics_010_q2', 'isolated total entropy=−3+5 J/K', -3+5, 2, '+2 J·K⁻¹')
n('thermodynamics_012_q2', 'A=10−300×20/1000 kJ', 10-300*20/1000, 4, '4 kJ')
n('thermodynamics_014_q2', 'V=Σni Vbar_i=1×20+2×30 mL', 1*20+2*30, 80, '80 mL')
n('thermodynamics_015_q2', 'a=γc/c°=0.8×0.1/1', 0.8*0.1, 0.080, '0.080')
n('thermodynamics_016_q2', 'Q=aB²/aA=0.2²/0.5', 0.2**2/0.5, 0.080, '0.080')
n('thermodynamics_018_q1', 'reverse reaction K=1/4', 1/4, 0.25, '0.25')
n('thermodynamics_018_q2', 'half reaction K=9^(1/2)', sqrt(9), 3, '3')
n('thermodynamics_021_q1', 'phase rule F=C−P+2=1−3+2', 1-3+2, 0, '0')
n('thermodynamics_023_q2', 'Henry p=kx=200×0.010 kPa', 200*0.010, 2.0, '2.0 kPa')
n('thermodynamics_024_q2', 'rich phase fraction=(0.35−0.20)/(0.80−0.20)', (0.35-0.20)/(0.80-0.20), .25, '25%')
n('kinetics_001_q2', 'dB/dt=−(dA/dt)/2=0.04/2', .040/2, .020, '0.020 mol·L⁻¹·s⁻¹')
n('kinetics_002_q1', 'total order=2+1', 2+1, 3, '3')
n('kinetics_003_q1', 'order=log4/log2', log10(4)/log10(2), 2, '2')
n('kinetics_005_q2', 'zero-order t1/2=A0/(2k)=0.2/(2×0.01)', .2/(2*.01), 10, '10 s')
n('kinetics_006_q2', 'first-order remaining=2^(−30/10)', 2**(-30/10), .125, '1/8')
n('kinetics_007_q2', 'second-order t1/2=1/(kA0)=1/(0.5×0.2)', 1/(.5*.2), 10, '10 s')
n('kinetics_010_q2', 'reverse barrier=50−(−20)', 50-(-20), 70, '70 kJ·mol⁻¹')
n('kinetics_015_q2', 'Langmuir theta=3/(1+3)', 3/(1+3), .75, '0.75')
n('kinetics_016_q2', 'surface work=0.05×0.020 J', .05*.020, .0010, '0.0010 J')
n('kinetics_017_q2', 'Laplace pressure ratio=(1/r)/(1/2r)', 1/(1/2), 2, '2倍')
n('solution_001_q2', 'molality=0.10/0.50 mol/kg', .1/.5, .20, '0.20 mol·kg⁻¹')
n('solution_002_q2', 'I=0.5×[0.010×2²+0.020×1²]', .5*(.010*4+.020), .030, '0.030 mol·L⁻¹')
n('solution_003_q2', 'Raoult p=0.90×20.0 kPa', .90*20, 18, '18.0 kPa')
n('solution_004_q2', 'freezing depression=1.86×0.10 K', 1.86*.10, .186, '0.186 K')
n('solution_005_q2', 'osmotic pressure=0.010×8.314×300 kPa', .010*8.314*300, 24.9, '24.9 kPa')
n('solution_007_q2', 'Kb=Kw/Ka=1e−14/1e−5', 1e-14/1e-5, 1e-9, '1.0×10⁻⁹')
n('solution_008_q2', 'neutral dilute pH=pKw/2=13/2', 13/2, 6.5, '6.5')
n('solution_009_q2', 'weak-acid pH=−log(sqrt(Ka c))', -log10(sqrt(1e-5*.10)), 3, '3.0')
n('solution_010_q2', 'weak-base pH=pKw+log(sqrt(Kb c))', 14+log10(sqrt(1e-5*.10)), 11, '11.0')
n('solution_011_q2', 'aA2−/aHA−=10^(pH−pKa2)=10^1', 10**1, 10, '10')
n('solution_012_q2', 'buffer pH=4.76+log10', 4.76+log10(10), 5.76, '5.76')
n('solution_015_q1', 'distribution fraction=1/(1+1)', 1/(1+1), .5, '0.50')
n('solution_015_q2', 'distribution fraction=9/(1+9)', 9/(1+9), .9, '90%')
n('solution_017_q2', 'Qsp=1e−3×1e−4=1e−7 >1e−8', 1e-3*1e-4, 1e-7, 'Q_sp=10⁻⁷>K_sp，有沉淀倾向')
n('solution_020_q2', 'beta2=K1K2=1e4×1e3', 1e4*1e3, 1e7, '10⁷')
n('solution_021_q2', 'conditional K=1e8×1e−3', 1e8*1e-3, 1e5, '10⁵')
n('electrochemistry_005_q2', 'E=1.10−0.05916/2 log100 V', 1.10-.05916/2*log10(100), 1.04, '1.04 V')
n('electrochemistry_006_q2', 'ΔG=−nFE=−2×96485×0.500/1000 kJ/mol', -2*96485*.500/1000, -96.5, '−96.5 kJ·mol⁻¹')
n('electrochemistry_007_q2', 'K=10^(1×0.05916/0.05916)', 10**(.05916/.05916), 10, '10')
n('electrochemistry_008_q2', 'E=0.05916/2 log100 V', .05916/2*log10(100), .0592, '0.0592 V')
n('electrochemistry_010_q2', 'amount=Q/(2F)=1930/(2×96500) mol', 1930/(2*96500), .0100, '0.0100 mol')
n('electrochemistry_011_q2', 'current efficiency=0.016/0.020', .016/.020, .8, '80%')
n('electrochemistry_012_q2', 'conductivity=cell constant×G=100×0.020', 100*.020, 2, '2.0 S·m⁻¹')
n('electrochemistry_014_q2', 'anion transport number=1−0.40', 1-.40, .60, '0.60')
n('electrochemistry_016_q2', 'working voltage=1.2+0.3+0.2 V', 1.2+.3+.2, 1.7, '1.7 V')
n('electrochemistry_018_q1', '1 Ah=1 C/s×3600 s', 1*3600, 3600, '3600 C')
n('electrochemistry_018_q2', 'energy=2.0 Ah×3.0 V', 2*3, 6, '6.0 Wh')
n('analysis_004_q2', 'relative error=(10.2−10.0)/10.0×100%', (10.2-10)/10*100, 2, '+2.0%')
n('analysis_005_q1', 'addition rounding:round(12.11+0.3,1)', round(12.11+.3,1), 12.4, '12.4')
n('analysis_005_q2', 'multiplication to 2 significant figures', float(format(2.5*3.42,'.2g')), 8.6, '8.6')
n('analysis_006_q2', 'sample SD=sqrt(((1−2)²+(2−2)²+(3−2)²)/(3−1))', sqrt(((1-2)**2+(2-2)**2+(3-2)**2)/(3-1)), 1, '2和1 mg·L⁻¹')
n('analysis_007_q2', 'CI halfwidth=t s/sqrt(n)=3.18×2/2', 3.18*2/sqrt(4), 3.18, '3.18 mg·L⁻¹')
n('analysis_009_q2', 'calibrated c=(0.50−0.10)/2.0', (.50-.10)/2, .20, '0.20')
n('analysis_010_q2', 'standard addition c=20×2/(40−20)', 20*2/(40-20), 2, '2.0 mg·L⁻¹')
n('analysis_011_q2', 'internal-standard ratio=(2×50)/(2×100)', (2*50)/(2*100), .50, '仍为0.50')
n('analysis_012_q2', 'stipulated LOD=3×0.002/0.050', 3*.002/.050, .12, '0.12 mg·L⁻¹')
n('analysis_015_q2', 'EDTA n=0.0100 mol/L×0.025 L×1000 mmol/mol', .0100*.025*1000, .250, '0.250 mmol')
n('analysis_016_q2', 'electron balance 2nA=5nB; nA/nB=5/2', 5/2, 2.5, '5∶2')
n('analysis_017_q2', '1:1 precipitation nX=nM=0.400 mmol', .400, .400, '0.400 mmol')
n('analysis_018_q2', 'A=epsilon b c=4000×1×2e−5', 4000*1*2e-5, .080, '0.080')
n('analysis_019_q1', 'A=−log(10/100)', -log10(10/100), 1, '1.0')
n('analysis_019_q2', 'T at A=1,2:10^−1,10^−2; final T=1%', 10**(-2)*100, 1, '由10%降至1%')
n('analysis_023_q2', 'ion mass≈(m/z)z=100×2 Da', 100*2, 200, '200 Da')
n('analysis_024_q2', 'retention factor=(5−1)/1', (5-1)/1, 4, '4.0')
n('analysis_025_q2', 'resolution=2(6−5)/(0.5+0.5)', 2*(6-5)/(.5+.5), 2, '2.0')
n('analysis_027_q1', 'NMR shift=600/(200e6)×1e6 ppm', 600/(200e6)*1e6, 3, '3.0 ppm')
n('analysis_028_q2', 'XPS binding energy=1486.6−1000.0−4.6 eV', 1486.6-1000.0-4.6, 482, '482.0 eV')

report = {
    'checked_date': sources['checked_date'], 'check_role': 'AI author self-check',
    'status': 'passed', 'topic_count': len(topics), 'question_count': len(questions),
    'dependency_count': len(dependencies), 'dependency_strengths': dict(Counter(d['strength'] for d in dependencies)),
    'module_counts': dict(Counter(t['module'] for t in topics)),
    'answer_key_counts': dict(sorted(Counter(q['answer'] for q in questions).items())),
    'structural_assertion_count': len(checks), 'numerical_check_count': len(numeric),
    'numerical_checks': numeric,
    'sha256': {name: hashlib.sha256((ROOT/f'uchemistry-{name}.json').read_bytes()).hexdigest() for name in NAMES},
    'limitations': ['数值复算由作者编写，不能称为独立审查。', '自动校验不证明全部概念与干扰项正确；另需逐条语义复核。',
                   '未逐页核验教材全文，未经化学教师审核。']}
(ROOT/'author-check-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('numerical_checks','sha256')},ensure_ascii=False,indent=2))
