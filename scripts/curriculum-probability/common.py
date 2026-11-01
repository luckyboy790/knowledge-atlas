"""Original authored curriculum helpers; Python 3.9+, standard library only."""
from copy import deepcopy

BOOK_URL = 'https://xuanshu.hep.com.cn/front/book/findBookDetails?bookId=6967ccf2e119ac97292654e8'
REVIEW = 'AI作者自查与独立AI内容复核均完成；教材全文未逐页核验，待教师审核'
REVIEW_RECORD = 'validation/probability-content-review.json'
VERIFY = '出版社官方公开目录的父节定位已核验；括号内为本图谱的主题定位，不代表教材另设小节；教材正文未逐页核验；摘要与题目为原创整理。'
EXAM_VERIFY = '依据出版社公开备考目录分类；2027大纲全文未逐条核验'
CHAPTERS = {
 'events': ('第一章', '概率论的基本概念', 1),
 'univariate': ('第二章', '随机变量及其分布', 2),
 'multivariate': ('第三章', '多维随机变量及其分布', 3),
 'moments': ('第四章', '随机变量的数字特征', 4),
 'limits': ('第五章', '大数定律及中心极限定理', 5),
 'sampling': ('第六章', '样本及抽样分布', 6),
 'estimation': ('第七章', '参数估计', 7),
 'testing': ('第八章', '假设检验', 8),
}

def Q(prompt, correct, wrong, explanation):
    assert len(wrong) == 3 and len(set([correct, *wrong])) == 4
    return dict(prompt=prompt, correct=correct, wrong=wrong, explanation=explanation)

def D(prerequisite, reason, strength='hard'):
    return dict(prerequisiteId=(f'cnm_ps{prerequisite:03d}' if isinstance(prerequisite,int) else prerequisite), reason=reason, strength=strength)

def N(number, name, section, description, criteria, questions, deps=(), track='shared'):
    assert len(criteria) == 2 and len(questions) == 2
    return dict(number=number,name=name,section=section,description=description,criteria=criteria,questions=questions,deps=list(deps),track=track)

def render(module, authored):
    topics, questions, dependencies = [], [], []
    ch, title, order = CHAPTERS[module]
    for item in authored:
        n = item['number']; tid=f'cnm_ps{n:03d}'; track=item['track']
        textbook=dict(book='prob_zju6_2026',title='概率论与数理统计（第六版）',edition=6,volume='概率论与数理统计',chapter=f'{ch} {title}',section=item['section'],source_url=BOOK_URL,url=BOOK_URL,verification=VERIFY)
        scope=dict(track=track,label={'shared':'数一/数三共用基础','math1':'数一方向','supplement':'辅助理解'}[track],verification=EXAM_VERIFY,basis_ids=['prep_2026_810','prep_2023_solutions'])
        topic=dict(id=tid,name=item['name'],subject='math',domain='概率论与数理统计',grade=17,semester='全',module=module,chapter=f'概率论与数理统计 {ch} {title} {order}',type='conceptual',description=item['description'],mastery_criteria=item['criteria'],external=False,standards=[],epistemic_status='modern_mathematics',textbook=deepcopy(textbook),exam_scope=deepcopy(scope),review_status=REVIEW,review_record=REVIEW_RECORD,diagnostic_question=dict(question=item['questions'][0]['prompt'],answer=item['questions'][0]['correct']))
        topics.append(topic)
        for idx, q in enumerate(item['questions'],1):
            correct_pos=(n+2*(idx-1))%4
            answers=list(q['wrong']); answers.insert(correct_pos,q['correct'])
            questions.append(dict(id=f'{tid}_q{idx}',topicId=tid,difficulty='basic' if idx==1 else 'standard',type='choice',prompt=q['prompt'],choices=[dict(key='ABCD'[j],text=a) for j,a in enumerate(answers)],answer='ABCD'[correct_pos],explanation=q['explanation'],textbook=deepcopy(textbook),origin='原创练习，不是教材原题',exam_scope=deepcopy(scope),review_status=REVIEW,review_record=REVIEW_RECORD))
        dependencies.extend(dict(topicId=tid,**deepcopy(d)) for d in item['deps'])
    return topics,questions,dependencies
