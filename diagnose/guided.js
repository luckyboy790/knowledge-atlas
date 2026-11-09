// One worked example, a partly completed problem, then a fresh independent check.
(function () {
  'use strict';
  window.createGuidedPractice = function ({subject, id, origin, recheck, graph, questions, avoid, h, show, ask}) {
    const unit = GuidedMath.get(subject, id);
    const schedule = window.AtlasPractice;
    const title = target => graph.byId[target].name;
    const topicUrl = target => Subjects.link('../explore/index.html#' + encodeURIComponent(target), subject);
    const nextUrl = target => Subjects.link('index.html?practice=guided&target=' + encodeURIComponent(target) + '&stage=check&from=' + encodeURIComponent(id), subject);
    const scheduleUrl = Subjects.link('index.html?practice=review',subject);
    const pool = GuidedMath.questions(unit, id, questions);
    const recent = schedule.records(subject).get(id)?.recent || [];
    const used = new Set([...avoid, ...recent]);
    const seed = Math.random().toString(36).slice(2);
    let current, stepIndex = 0;
    let firstRecheck = recheck;
    const exitUrl = topicUrl(origin || id);
    const exitLabel = origin ? '回到原知识点 · ' + title(origin) : '回到知识点 · ' + title(id);
    function page(stage, heading, ...content) {
      const card = h('section', {class:'card practice-card guided-card'},
        h('p', {class:'q-chapter'}, title(id) + ' · ' + stage), h('h1', {tabindex:'-1'}, heading), ...content);
      show(h('div', {class:'page page-question practice-page'}, card));
      card.querySelector('h1').focus({preventScroll:true});
    }
    function button(label, fn, primary = false) {
      return h('button', {type:'button', class:primary ? 'primary' : '', onclick:fn}, label);
    }
    function exitLink() { return h('a',{class:'btn',href:exitUrl},exitLabel); }
    function source() { return h('p', {class:'muted small'}, '站内编写的分步讲解与练习，尚未经教师审核。'); }
    function example() {
      page('分步例题', unit.goal, h('p',{class:'q-text'},unit.example),
        h('ol',{class:'guided-steps'},unit.steps.map(line => h('li',{},line))), source(),
        h('div',{class:'row'},button('试着补一步',step,true),button('直接独立作答',check)),exitLink());
    }
    function step() {
      const task = unit.step(stepIndex++);
      const input = h('input',{id:'step-answer',class:'ans-input',type:'text',inputmode:'numeric',autocomplete:'off',required:true});
      const feedback = h('div',{role:'status','aria-live':'polite'});
      const submit = h('button',{type:'submit',class:'primary'},'核对这一步');
      const form = h('form',{onsubmit:event => {
        event.preventDefault();
        if (submit.disabled || !input.value.trim()) return;
        const value = input.value.trim().normalize('NFKC');
        const ok = DiagEngine.judgeQuestion(task,value).verdict === 'correct';
        input.readOnly = true;
        submit.disabled = true;
        const message = !ok && Object.prototype.hasOwnProperty.call(task.mistakes,value) ? task.mistakes[value] : task.explanation;
        feedback.append(h('p',{class:'verdict ' + (ok ? 'ok' : 'no')},ok ? '这一步做对了' : '再看这一步'),
          h('p',{},message), ok ? button('开始独立作答',check,true) :
          h('div',{class:'row'},button('换一题练这一步',step,true),button('重看例题',example)));
        feedback.querySelector('button').focus({preventScroll:true});
      }},h('label',{for:'step-answer',class:'q-text guided-prompt'},task.prompt),input,h('div',{class:'row q-actions'},submit),feedback);
      page('补全一步',unit.goal,form,source(),exitLink());
    }
    function check() {
      current = pool.find(q => !used.has(q.id));
      if (!current) {
        page('本轮结束','本组题目已经练过',h('p',{},'可以到今日复习再练，或回到图谱选择其他知识点。'),exitLink(),
          h('a',{class:'btn',href:scheduleUrl},'今日复习'));
        return;
      }
      used.add(current.id);
      ask({topicId:id,question:current,attempt:1});
    }
    function commit(result, selfRated) {
      const ok = result === 'correct';
      const measured = firstRecheck;
      firstRecheck = false;
      schedule.record(subject,id,current.id,ok,new Date(),measured);
      const entry = schedule.records(subject).get(id);
      const passedText = selfRated ? '本题自评通过' : '独立作答通过';
      const actions = h('div',{class:'row'});
      if (ok && origin && GuidedMath.get(subject, origin)) {
        actions.append(h('a',{class:'btn btn-primary',href:nextUrl(origin)},'回到「' + title(origin) + '」独立做一题'));
      } else if (ok && origin) {
        actions.append(h('a',{class:'btn btn-primary',href:Subjects.link('index.html?practice=focus&target=' + encodeURIComponent(origin),subject)},'练习原知识点 · ' + title(origin)));
      }
      if (!ok) actions.append(button('重看分步例题',example,true));
      if (pool.some(q => !used.has(q.id))) actions.append(button('换一道独立题',check));
      actions.append(exitLink());
      page('练习结果',ok ? passedText : result === 'assisted' ? '这题在提示下完成' : '这一步还需要巩固',
        h('p',{},unit.goal + '。下次复习日期为 ' + entry.due + '。'),
        measured ? h('p',{},'原目标复测：本机已作答 ' + entry.recheck.attempts + ' 次，其中独立通过 ' + entry.recheck.passed + ' 次（含作答后的自评）。') : null,
        schedule.persistent() ? null : h('p',{class:'muted small'},'记录仅在当前页面有效。'),actions);
    }
    return {example,check,commit,exitUrl,exitLabel,guided:true,count:0,total:1,label:'独立作答',seed};
  };
})();
