"""Compact authoring helpers. Correct text is first here, rotated deterministically on export."""
def q(prompt, options, explanation):
    choices = options.split("|")
    assert len(choices) == 4 and len(set(choices)) == 4, prompt
    return {"prompt":prompt,"options":choices,"correct":choices[0],"explanation":explanation}

def n(slug, chapter, name, description, criteria, q1, q2, prerequisites="", section=None):
    deps=[]
    for term in prerequisites.split(";"):
        if not term:
            continue
        target, reason=term.split(">",1)
        strength="soft" if target.startswith("~") else "hard"
        deps.append((target.lstrip("~"),strength,reason))
    return {"slug":slug,"chapter":chapter,"name":name,"description":description,
            "mastery_criteria":criteria.split("|"),"questions":[q1,q2],"prerequisites":deps,"section":section}
