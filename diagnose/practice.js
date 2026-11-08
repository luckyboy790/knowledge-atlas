/* Practice shares the diagnostic question renderer, but owns its queue and progress. */
(function () {
  'use strict';
  window.createPractice = function ({subject, graph, h, show, ask, avoid}) {
    const schedule = window.AtlasPractice;
    const dashboardUrl = Subjects.link('index.html?practice=review', subject);
    const exploreUrl = Subjects.link('../explore/index.html', subject);
    const name = id => graph.byId[id].name;
    const page = (...children) => h('div', {class:'page page-question practice-page'}, ...children);
    let queue = [], answers = [], label = '', seed = '', exact = false;
    const bank = id => graph.bank[id] || [];
    function saved() {
      return new Map([...schedule.records(subject)].filter(([id]) => bank(id).length));
    }
    function link(href, title) { return h('a', {class:'btn', href}, title); }
    function lobby() {
      const entries = saved();
      const due = schedule.dueEntries(entries);
      const dueIds = new Set(due.map(([id]) => id));
      const upcoming = [...entries].sort((a,b) => a[1].due.localeCompare(b[1].due)).filter(([id]) => !dueIds.has(id));
      const card = h('section', {class:'card practice-card'},
        h('p', {class:'q-chapter'}, Subjects.names[subject]),
        h('h1', {}, '今日复习'),
        h('p', {}, due.length ? '有 ' + due.length + ' 个知识点到期。先凭记忆做题，再对照解析。' :
          entries.size ? '今天的复习已完成。' : '从图谱选一个想练的知识点。完成第一题后，这里就会显示下次复习日期。'));
      if (due.length) card.append(h('button', {class:'primary', onclick:() => start(due.slice(0, 4).map(e => e[0]), true)}, '开始本轮复习（' + Math.min(due.length,4) + ' 个知识点）'));
      card.append(link(exploreUrl, '去图谱选点'));
      if (upcoming.length) card.append(h('h2', {}, '接下来复习'), h('ul', {class:'practice-list'}, upcoming.slice(0,6).map(([id, value]) =>
        h('li', {}, h('a', {href: exploreUrl + '#' + encodeURIComponent(id)}, name(id)), h('time', {datetime:value.due}, value.due)))));
      card.append(h('p', {class:'muted small'}, '练习记录保存在当前浏览器。'));
      show(page(card));
    }
    function choose(id, level, excluded = []) {
      const recent = saved().get(id)?.recent || [];
      const candidates = bank(id).filter(q => !excluded.includes(q.id));
      const preference = level === 'basic' ? ['basic','standard','advanced'] : ['standard','advanced','basic'];
      const old = new Set(avoid);
      function rank(q) {
        const pos = recent.indexOf(q.id);
        return [pos < 0 ? 0 : recent.length - pos, old.has(q.id) ? 1 : 0, preference.indexOf(q.difficulty) < 0 ? 3 : preference.indexOf(q.difficulty)];
      }
      return candidates.sort((a,b) => {
        const x = rank(a), y = rank(b);
        return x[0]-y[0] || x[1]-y[1] || x[2]-y[2];
      })[0];
    }
    function start(ids, review, question) {
      exact = Boolean(question);
      answers = []; queue = []; seed = Math.random().toString(36).slice(2);
      if (exact) {
        label = '人工核验习题';
        queue.push({topicId:ids[0], question, attempt:1});
        return ask(queue[0]);
      }
      label = review ? '到期复习' : '专项练习';
      for (const id of ids) {
        const first = choose(id, review ? 'standard' : 'basic');
        if (!first) continue;
        queue.push({topicId:id, question:first, attempt:1});
        if (!review) {
          const second = choose(id, 'standard', [first.id]);
          if (second) queue.push({topicId:id, question:second, attempt:2});
        }
      }
      if (queue.length) ask(queue[0]); else lobby();
    }
    function commit(result) {
      const item = queue[answers.length];
      const id = item.topicId;
      const ok = result === 'correct';
      schedule.record(subject, id, item.question.id, ok);
      answers.push({id, ok});
      if (!exact && !ok && item.attempt === 1 && !queue.some(other => other.topicId === id && other.attempt > 1)) {
        const retry = choose(id, 'basic', [item.question.id]);
        if (retry) queue.push({topicId:id, question:retry, attempt:2});
      }
      if (answers.length < queue.length) return ask(queue[answers.length]);
      const touched = [...new Set(answers.map(a => a.id))];
      const entries = saved();
      show(page(h('section', {class:'card practice-card'},
        h('h1', {}, '本轮练习完成'),
        h('p', {}, '共练 ' + answers.length + ' 题，独立答对 ' + answers.filter(a => a.ok).length + ' 题。'),
        h('h2', {}, '下次复习'), h('ul', {class:'practice-list'}, touched.map(id =>
          h('li', {}, name(id), h('time', {}, entries.get(id).due)))),
        h('p', {class:'muted small'}, schedule.persistent() ? '到期后从首页进入「今日复习」。' : '当前浏览器无法保存记录，离开页面后需重新开始。'),
        link(dashboardUrl,'返回今日复习'), link(exact ? Subjects.link('../explore/index.html?reviewed=1#' + encodeURIComponent(id), subject) : exploreUrl,'回到知识图谱'))));
    }
    return {lobby, start, commit, get count(){return answers.length;}, get total(){return queue.length;}, get label(){return label;}, get seed(){return seed;}};
  };
})();
