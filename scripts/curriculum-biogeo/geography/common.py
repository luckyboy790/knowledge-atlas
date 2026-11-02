"""Small authoring helpers. The curriculum records are original, explicit content."""
ROWS = []
NUMERIC = []
def Q(prompt, answer, wrong1, wrong2, wrong3, explanation):
    assert len({answer,wrong1,wrong2,wrong3}) == 4
    return dict(prompt=prompt,correct=answer,distractors=[wrong1,wrong2,wrong3],explanation=explanation)
def A(key, book, chapter, section, name, description, skills, q1, q2, dependencies=(), domain=None):
    assert key not in {r['key'] for r in ROWS}, key
    assert len(skills.split('|')) >= 2
    ROWS.append(dict(key=key,book=book,chapter=chapter,section=section,name=name,description=description,mastery_criteria=skills.split('|'),questions=[q1,q2],dependencies=dependencies,domain=domain))
def D(key,reason,strength='hard'):
    return (key,strength,reason)
def N(key,question,expression,expected,units,reason):
    NUMERIC.append(dict(topic_key=key,question=question,expression=expression,expected=expected,units=units,reason=reason))
