/* 诊断小工具界面。核心逻辑全部在 engine.js，这里只负责数据加载、渲染与本地存储。 */
(function () {
  'use strict';
  function uiText(text) { return Subjects.assessment(text, subject); }
  const E = window.DiagEngine;
  const LS_SESSION = 'cnmDiagnose.session.v9';
  const LS_SESSION_EN = 'cneDiagnose.session.v9';
  const LS_SETTINGS = 'cnmDiagnose.settings.v2';
  const LS_SEEN = 'cnmDiagnose.seen.v1';
  const LIMIT_MIN = 8, LIMIT_MAX = 30;
  const SCREEN_MIN = 20, SCREEN_MAX = 60;
  const GRADES = '一二三四五六七八九'.split('');
  const VOLUMES = [
    ['一上', '一年级上册'], ['一下', '一年级下册'], ['二上', '二年级上册'], ['二下', '二年级下册'],
    ['三上', '三年级上册'], ['三下', '三年级下册'], ['四上', '四年级上册'], ['四下', '四年级下册'],
    ['五上', '五年级上册'], ['五下', '五年级下册'], ['六上', '六年级上册'], ['六下', '六年级下册'],
    ['七上', '七年级上册'], ['七下', '七年级下册'], ['八上', '八年级上册'], ['八下', '八年级下册'],
    ['九上', '九年级上册'], ['九下', '九年级下册'], ['九全', '九年级全一册'],
    ['必修一', '必修一 · 必修第一册'], ['必修二', '必修二 · 必修第二册'], ['必修三', '必修三 · 必修第三册'],
    ['高一', '高一 · 必修第一册'], ['高二', '高二 · 必修第二册'],
    ['选必一', '选必一 · 选择性必修第一册'], ['选必二', '选必二 · 选择性必修第二册'],
    ['高等数学', '大学 · 高等数学'], ['线性代数', '大学 · 线性代数'], ['概率论与数理统计', '大学 · 概率论与数理统计'],
    ['选必三', '选必三 · 选择性必修第三册'], ['选必四', '选必四 · 选择性必修第四册']
  ];
  const RESULT_LABEL = { correct: '对', wrong: '错', skip: '不会' };
  const STATUS_LABEL = { mastered: '已掌握', shaky: '不稳', weak: '薄弱', unknown: '未测' };
  const DIFF_LABEL = { basic: '基础', standard: '标准', advanced: '提高' };
  const TYPE_LABEL = { numeric: '数值题', choice: '选择题', short: '短答题', self: '开放题', legacy: '诊断题' };

  const root = document.getElementById('root');
  let D = null;            // 数据：{topics, deps, stdById, graph, tree}
  let session = null;      // 引擎会话
  let sessionMeta = null;  // {label, chapterKey?}
  let demo = null;         // 演示模式：{oracle}
  let ui = { key: null, phase: 'ask', answer: '', verdict: null };
  let subject = 'math';
  let startQuery = '';
  let startStage = '';
  let startCourse = '';
  let startMember = '';
  let chapterOpen = false;
  let gradeSel = '七';     // 开始页「按年级 / 课程整体诊断」：年级
  let volSel = '';         // '' 整年级 / '上' / '下'
  let seedParam = null;    // URL 参数 seed：固定选题的随机种子
  let pathCy = null;
  let pathToken = 0;
  let pathTipLock = false;
  let shareBlobUrl = null;
  let shareToken = 0;
  let exportCache = {session:null,label:null,text:''};

  /* ------------------------------------------------------------ 小工具 */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const a = attrs || {};
    Object.keys(a).forEach(function (k) {
      const v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'open' || k === 'disabled' || k === 'selected' || k === 'value') el[k] = v === true ? true : v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function figureEl(svg) {
    if (typeof svg !== 'string' || svg.indexOf('<svg') !== 0) return null;
    if (/<\s*script|foreignObject|<\s*image\b|https?:\/\//i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"', ''))) return null;
    const wrap = h('div', { class: 'q-figure' });
    wrap.innerHTML = svg;
    const node = wrap.querySelector('svg');
    if (!node) return null;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    return wrap;
  }
  function sessionKey() { if (Subjects.merged(subject)) return subject + 'Diagnose.session.v17'; return Subjects.academic(subject) || Subjects.biogeo(subject) ? subject + 'Diagnose.session.v1' : subject === 'chemistry' ? 'cncDiagnose.session.v9' : subject === 'physics' ? 'cnpDiagnose.session.v9' : subject === 'english' ? LS_SESSION_EN : LS_SESSION; }
  function withSubject(href) {
    return Subjects.link(href, subject);
  }
  function detectSubject() { return Subjects.read(); }
  function applySubjectChrome() {
    document.body.classList.toggle('subject-english', subject === 'english');
    document.querySelectorAll('.site-nav a:not(.subject-link), a.brand, .site-footer a[href="../sources.html"]').forEach(function (link) {
      const href = link.getAttribute('href');
      const next = withSubject(href);
      if (next && next !== href) link.setAttribute('href', next);
    });
    document.querySelectorAll('.subject-link').forEach(function (link) {
      const on = link.getAttribute('data-subject') === subject;
      link.classList.toggle('on', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (Subjects.science(subject) || Subjects.academic(subject)) { document.title = uiText('诊断 · ') + Subjects.names[subject]; gradeSel = Subjects.specs[subject].start; if (subject === 'chemistry' || Subjects.academic(subject)) volSel = '';  }
    const initial = Subjects.initialScope(), params = new URLSearchParams(location.search);
    startStage = params.get('stage') || initial.stage;
    if (!['','p','j','h','u'].includes(startStage)) startStage='';
    startMember = subject === 'tcm' && ['tcm','herbal'].includes(params.get('member')) ? params.get('member') : initial.member;
    if (Subjects.mixedScience(subject) && startStage === 'u') gradeSel='university';
    if (startMember === 'herbal') gradeSel='materia';
    if (subject === 'english') {
      document.title = uiText('诊断 · 英语');
      var juniorOk = '三四五六七八九'.indexOf(gradeSel) >= 0;
      var seniorOk = gradeSel.indexOf('必修') === 0 || gradeSel.indexOf('选必') === 0;
      if (!juniorOk && !seniorOk) gradeSel = '四';
    }
  }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式等 */ } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function nameOf(id) { const t = D.graph.byId[id]; return t ? t.name : id; }
  function getSettings() {
    const st = lsGet(LS_SETTINGS) || {};
    let limit = parseInt(st.limit, 10);
    if (!(limit >= LIMIT_MIN && limit <= LIMIT_MAX)) limit = E.DEFAULT_LIMIT;
    let screenLimit = parseInt(st.screenLimit, 10);
    if (!(screenLimit >= SCREEN_MIN && screenLimit <= SCREEN_MAX)) screenLimit = E.SCREEN_LIMIT;
    return { limit: limit, screenLimit: screenLimit };
  }
  function setSetting(k, v) { const o = getSettings(); o[k] = v; lsSet(LS_SETTINGS, o); }
  function seenList() { const v = lsGet(LS_SEEN); return Array.isArray(v) ? v : []; }
  function markSeen(qid) {
    if (!qid || demo) return;
    const v = seenList();
    if (v.indexOf(qid) < 0) { v.push(qid); lsSet(LS_SEEN, v); }
  }
  function newSeed() { return seedParam != null ? seedParam : Math.random().toString(36).slice(2, 10); }
  function resetUi() { ui = { key: null, phase: 'ask', answer: '', verdict: null, picked: null }; }
  function clearRoot() { while (root.firstChild) root.removeChild(root.firstChild); }
  function teardownPath() {
    pathToken++;
    pathTipLock = false;
    if (pathCy) { pathCy.destroy(); pathCy = null; window.__pathCy = null; }
  }
  function show(node) { teardownPath(); closeShare(); clearRoot(); root.append(node); window.scrollTo(0, 0); }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function theme() {
    return {
      primary: cssVar('--node-primary'), primaryBg: cssVar('--node-primary-bg'),
      junior: cssVar('--node-junior'), juniorBg: cssVar('--node-junior-bg'),
      university: cssVar('--node-university'), universityBg: cssVar('--node-university-bg'),
      senior: cssVar('--node-senior'), seniorBg: cssVar('--node-senior-bg'),
      currentBg: cssVar('--node-current-bg'), currentBorder: cssVar('--node-current-border'),
      currentText: cssVar('--node-current-text') || cssVar('--node-text'), halo: cssVar('--node-halo') || cssVar('--node-current-border'),
      text: cssVar('--node-text'), edge: cssVar('--edge'), edgeSoft: cssVar('--edge-soft'),
      bad: cssVar('--diagram-bad'), badBg: cssVar('--diagram-bad-bg')
    };
  }
  function labelLimit() { return window.matchMedia('(max-width: 700px)').matches ? 8 : 10; }
  function clipLabel(name) {
    const chars = Array.from(name || '');
    const limit = labelLimit();
    if (chars.length <= limit) return name || '';
    return chars.slice(0, limit - 1).join('') + '…';
  }

  /* ------------------------------------------------------------ 数据 */
  async function loadData() {
    const urls = ['../data/topics.json', '../data/dependencies.json', '../data/cn-curriculum-standards.json', '../data/id-aliases.json'];
    const rs = await Promise.all(urls.map(function (u) { return Subjects.fetch(u.replace(/[^/]+$/, function(f){return Subjects.data(f, subject);}), subject); }));
    rs.forEach(function (r, i) { if (!r.ok) throw new Error(urls[i] + ' → HTTP ' + r.status); });
    const js = await Promise.all(rs.map(function (r) { return r.json(); }));
    // 题库可选：缺失（404）或损坏时回退到 topics.json 的 diagnostic_question
    let questions = null;
    try {
      const qr = await Subjects.fetch('../data/' + Subjects.data('questions.json', subject), subject);
      if (qr.ok) questions = await qr.json();
    } catch (e) { questions = null; }
    const topics = js[0].filter(function (t) { return Subjects.of(t) === subject; });
    const allow = {};
    topics.forEach(function (t) { allow[t.id] = true; });
    const deps = js[1].filter(function (d) { return allow[d.topicId] && allow[d.prerequisiteId]; });
    if (questions) questions = questions.filter(function (q) { return allow[q.topicId]; });
    const stdById = {};
    js[2].items.forEach(function (x) { stdById[x.id] = x; });
    const graph = E.buildGraph(Subjects.engineTopics(topics), deps, questions);
    D = { topics: topics, deps: deps, stdById: stdById, graph: graph, tree: buildTree(topics), aliases: (js[3] && js[3].aliases) || {} };
  }

  function buildTree(topics) {
    const vols = {};
    topics.forEach(function (t) {
      if (t.external) return;
      const c = Subjects.isAcademicTopic(t) ? Subjects.computingChapter(t) : Subjects.science(subject) && (t.grade >= 10 || Subjects.biogeo(subject)) ? Subjects.scienceChapter(t) : E.parseChapter(t.chapter);
      const v = vols[c.volume] || (vols[c.volume] = { chapters: [], byKey: {}, label:c.label, grade:t.grade });
      const key = c.chapterNo + ' ' + c.chapterName;
      let ch = v.byKey[key];
      if (!ch) {
        ch = v.byKey[key] = { volume: c.volume, volumeLabel:c.label || c.volume, key: c.volume + ' ' + c.chapterNo, label: c.chapterNo + ' ' + c.chapterName, topics: [] };
        v.chapters.push(ch);
      }
      ch.topics.push({ t: t, section: c.section });
    });
    return vols;
  }
  function volumeRows() {
    if (!Subjects.science(subject) && !Subjects.academic(subject)) return VOLUMES;
    return Object.keys(D.tree).map(function(key) {
      const old = VOLUMES.find(function(v){return v[0] === key;});
      return [key, D.tree[key].label || (old ? old[1] : key)];
    });
  }

  /* ------------------------------------------------------------ 会话 */
  function save() {
    if (demo || !session) return;
    lsSet(sessionKey(), {
      v: Subjects.merged(subject) ? 3 : 2, subject:subject, recovery:sessionMeta.recovery, mode: session.mode, targets: session.targets, limit: session.limit, label: sessionMeta.label, answers: session.answers,
      seed: session.seed, avoid: session.avoid, savedAt: new Date().toISOString()
    });
  }

  function startSession(targets, label, limit, mode) {
    const screen = mode === 'screen';
    session = E.createSession(D.graph, targets, {
      mode: mode, limit: limit || (screen ? getSettings().screenLimit : getSettings().limit), seed: newSeed(), avoid: seenList()
    });
    sessionMeta = { label: label };
    resetUi();
    save();
    render();
  }

  function restoreSession(saved, originalKey) {
    const checked = SessionCompatibility.inspect(D.graph, saved, E);
    if (!checked.ok) return false;
    session = checked.session;
    sessionMeta = {label:saved.label || saved.targets.map(nameOf).join('、'),recovery:originalKey ? '已依据记录中的题目身份恢复，并按当前图谱重算关系推断；推断数量可能与原结果不同。旧记录仍单独保留。' : checked.orderChanged ? '已依据记录中的题目身份恢复。更正判定或先修变化可能改变后续顺序，关系推断已按当前图谱重算。' : saved.recovery};
    resetUi();
    if (originalKey) save();
    return true;
  }
  function downloadSaved(key, label) {
    let raw;
    try { raw=localStorage.getItem(key); } catch (_) { return; }
    if (!raw) return;
    const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
    const a=h('a',{href:url,download:'saved-' + key + '.json'});
    document.body.append(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},2000);
  }
  function savedCard(saved, key, label, legacy, hasCurrent) {
    const checked=SessionCompatibility.inspect(D.graph,saved,E);
    const card=h('div',{class:'banner saved-record','data-storage-key':key},h('b',{text:label}),h('span',{text:(saved.label || (Array.isArray(saved.targets) ? saved.targets.map(nameOf).join('、') : '') || '未命名记录') + '（已答 ' + (Array.isArray(saved.answers) ? saved.answers.length : 0) + ' 题）'}));
    if (checked.ok) {
      card.append(h('button',{class:'primary',onclick:function(){if(restoreSession(saved,legacy ? key : null)) render(); else renderStart('记录已变化，未恢复。原记录仍保留。');}},legacy ? (hasCurrent ? '恢复此份并替换当前进度' : '恢复此份旧记录') : '继续'));
      if (legacy) card.append(h('span',{class:'small',text:'依据已记录题目恢复，关系推断按当前图谱重算；这份旧记录保持原样，不与其他旧档合并。'}));
    } else card.append(h('span',{class:'small',text:checked.reason + ' 原记录保留，可下载后查看；请从当前目标重新开始。'}));
    card.append(h('button',{onclick:function(){downloadSaved(key,label);}},legacy ? '下载原记录' : '下载此记录'));
    if (!legacy) card.append(h('button',{onclick:function(){lsDel(key);renderStart();}},'放弃当前存档'));
    return card;
  }

  function restart() {
    session = null; demo = null;
    lsDel(sessionKey());
    history.replaceState(null, '', location.pathname + (subject === 'math' ? '' : '?subject=' + subject));
    render();
  }

  function commit(result) {
    const item = E.nextItem(D.graph, session);
    session = E.applyAnswer(D.graph, session, item.topicId, result, { text: ui.answer });
    markSeen(item.question.id);
    resetUi();
    save();
    render();
  }

  function rebuild(answers, limit) {
    session = E.replay(D.graph, session.targets, answers, {
      mode: session.mode, limit: limit == null ? session.limit : limit, seed: session.seed, avoid: session.avoid
    });
    resetUi();
    save();
    render();
  }

  /* ------------------------------------------------------------ 演示模式 */
  // 演示用的“学生”：目标不会（错、错 -> 薄弱）；它的第一个可测先修也不会；再往前（或另一个先修）答错一次、第二题答对 -> 不稳；其余都会
  function makeOracle(targets, mode) {
    const G = D.graph;
    if (mode === 'screen') {
      // 整体筛查：按知识点序号，约 1/6 不会、1/6 不稳，其余都会（与 scripts/demo_grade.js 相同）
      return function (id, attempt) {
        const i = G.index[id];
        if (i % 6 === 0) return 'wrong';
        if (i % 6 === 3) return attempt === 1 ? 'wrong' : 'correct';
        return 'correct';
      };
    }
    const t0 = E.createSession(G, targets).stack[0];
    const testablePre = function (id) { return G.prereqs[id].filter(function (x) { return E.isTestable(G, x.id); }).map(function (x) { return x.id; }); };
    const weak = new Set([t0]);
    const shaky = new Set();
    const p = testablePre(t0);
    if (p.length) {
      const q = testablePre(p[0]);
      if (q.length) { weak.add(p[0]); shaky.add(q[0]); }
      else if (p.length > 1) { weak.add(p[0]); shaky.add(p[1]); }
      else shaky.add(p[0]);
    }
    return function (id, attempt) {
      if (weak.has(id)) return 'wrong';
      if (shaky.has(id)) return attempt === 1 ? 'wrong' : 'correct';
      return 'correct';
    };
  }

  function runDemo(steps) {
    let n = 0;
    while (n < steps) {
      const item = E.nextItem(D.graph, session);
      if (!item) break;
      session = E.applyAnswer(D.graph, session, item.topicId, demo.oracle(item.topicId, item.attempt));
      n++;
    }
  }

  /* ------------------------------------------------------------ 渲染入口 */
  function render() {
    if (!session) return renderStart();
    const item = E.nextItem(D.graph, session);
    if (item) renderQuestion(item); else renderResult();
    if (sessionMeta.recovery && root.firstChild) root.firstChild.prepend(h('p',{class:'banner recovery-note',text:sessionMeta.recovery}));
  }

  /* ------------------------------------------------------------ 开始页 */
  function stageButton(value, label) {
    return h('button', {
      type: 'button',
      class: 'stage-tab' + (startStage === value ? ' on' : ''),
      role: 'tab',
      'aria-selected': startStage === value ? 'true' : 'false',
      onclick: function () { startStage = value; if (Subjects.academic(subject)) startMember=''; if (value !== 'u') startCourse=''; renderStart(); }
    }, label);
  }

  function renderStart(errMsg) {
    const page = h('div', { class: 'page page-start' });
    const saved = lsGet(sessionKey());
    if (saved) page.append(savedCard(saved,sessionKey(),'当前进度',false,false));
    const legacy = Subjects.legacySessions(subject).map(function(spec){return {spec:spec,saved:lsGet(spec.key)};}).filter(function(x){return !!x.saved;});
    if (legacy.length) {
      const old=h('section',{class:'legacy-records','aria-label':'合并前的独立记录'},h('h2',{text:'合并前的独立记录'}),h('p',{class:'muted small',text:'分别选择要恢复的旧记录。恢复前会逐题核对题目身份、选题参数与范围；更正判定后的历史答案保留，关系推断重新计算。未选择的旧档不会改变。'}));
      legacy.forEach(function(x){old.append(savedCard(x.saved,x.spec.key,x.spec.label,true,!!saved));});
      page.append(old);
    }
    if (errMsg) page.append(h('p', { class: 'err', text: errMsg }));

    const st = getSettings();
    const limitInput = h('input', { type: 'number', min: LIMIT_MIN, max: LIMIT_MAX, step: 1, value: String(st.limit), id: 'limit-input', 'aria-label': '题量上限' });
    limitInput.addEventListener('change', function () {
      let v = parseInt(limitInput.value, 10);
      if (!(v >= LIMIT_MIN)) v = LIMIT_MIN;
      if (v > LIMIT_MAX) v = LIMIT_MAX;
      limitInput.value = String(v);
      setSetting('limit', v);
    });
    const listBox = h('div', { id: 'target-list' });
    const browser = h('details', { class: 'chapter-browser', id: 'chapter-browser', open: chapterOpen || !!startQuery },
      h('summary', null, Subjects.academic(subject) ? uiText('按课程、学习单元浏览') : '按册、章浏览'),
      h('p', { class: 'muted small', text: Subjects.academic(subject) ? uiText('按课程及学习单元展开，也可以搜索知识点。教材章节另列在知识点详情中。') : '列表按年级、册、章折叠。想直接开始，用上面的搜索更快。' }),
      listBox);
    browser.addEventListener('toggle', function () { chapterOpen = browser.open; });
    page.append(h('header', { class: 'diag-intro' },
      h('p', { class: 'eyebrow', text: Subjects.names[subject] + uiText(' · 自适应诊断') }),
      h('h1', { text: uiText('选择诊断目标') }),
      h('p', { class: 'lede' }, Subjects.academic(subject) || Subjects.science(subject) ? '选一个想检查的知识点。首题答对时工具标为「已掌握」，答错后再用另一道题确认：两题都不会时标为「薄弱」并追查先修，第二题答对则标为「不稳」。这是基础抽查标签，不代表完整掌握。' : subject === 'english'
        ? '选一个想学会或想检查的英语知识点。第一题答对就算掌握；答错会再出一道同级或更容易的题——第二题也错才算薄弱，并回溯到先修；第二题答对则标为「不稳」。'
        : '选一个想学会或想检查的知识点。第一题答对就算掌握；答错会再出一道同级或更容易的题——第二题也错才算薄弱，并回溯到先修；第二题答对则标为「不稳」。')));
    const startGrid = h('div', { class: 'start-grid' });
    startGrid.append(h('div', { class: 'card card-target' },
      h('div', { class: 'card-head' }, h('span', { class: 'card-no', text: 'A' }), h('h2', { text: uiText('按知识点诊断') })),
      h('p', { class: 'muted small card-sub' }, '从一个具体的知识点出发，沿先修往回追，找出最早没学会的地方。'),
      h('div', { class: 'stage-tabs', role: 'tablist', 'aria-label': Subjects.academic(subject) ? Subjects.unitLabel(subject) + '筛选' : '学段' },
        Subjects.academic(subject) ? [stageButton('', '全部')].concat(Subjects.coursesFor(subject).map(function(c){return stageButton(c.id,c.name);})) : Subjects.science(subject) ? [stageButton('', '全部'), stageButton('j','初中'), stageButton('h','高中')].concat(Subjects.mixedScience(subject) ? [stageButton('u','大学')] : []) : [stageButton('', '全部'), stageButton('p', '小学'), stageButton('j', '初中'), stageButton('h', '高中')].concat(subject === 'math' ? [stageButton('u', '大学')] : [])),
      Subjects.mixedScience(subject) && startStage === 'u' ? h('label',{class:'scope-select'},'大学模块 ',h('select',{'aria-label':'大学模块',value:startCourse,onchange:function(e){startCourse=e.target.value;fillList(listBox);}},h('option',{value:''},'全部大学模块'),Subjects.coursesFor(subject).map(function(c){return h('option',{value:c.id,selected:c.id===startCourse},c.name);}))) : null,
      subject === 'tcm' ? h('label',{class:'scope-select'},'课程组 ',h('select',{'aria-label':'中医药课程组',value:startMember,onchange:function(e){startMember=e.target.value;startStage='';renderStart();}},[['','全部十门课程'],['tcm','中医四门基础课程'],['herbal','中药六门核心课程']].map(function(row){return h('option',{value:row[0],selected:row[0]===startMember},row[1]);}))) : null,
      h('input', {
        type: 'search', class: 'search-lg', id: 'search',
        placeholder: Subjects.science(subject) || Subjects.academic(subject) ? '搜索知识点，例如：' + Subjects.specs[subject].search : subject === 'english' ? '搜索知识点，例如：现在进行时、虚拟语气、there is' : '搜索知识点，例如：配方法、极限、矩阵对角化',
        value: startQuery, autocomplete: 'off', 'aria-label': '搜索知识点',
        oninput: function (e) {
          startQuery = e.target.value;
          fillList(listBox);
          if (startQuery.trim()) { browser.open = true; chapterOpen = true; }
        }
      }),
      h('p', { class: 'muted small', id: 'match-count' }),
      flowDiagram(),
      h('div', { class: 'row limit-row' },
        h('label', null, '单点 / 整章题量上限（' + LIMIT_MIN + '–' + LIMIT_MAX + '）', limitInput),
        h('span', { class: 'muted small' }, '每个知识点最多问 2 题。到上限后，没测到的标为「未测」。'))));
    startGrid.append(gradeCard());
    page.append(startGrid);
    page.append(h('div', { class: 'card card-browser' }, browser));
    page.append(h('p', { class: 'muted small' },
      uiText('可以诊断的知识点：') + D.topics.length + ' 个。进度和出过的题只保存在这台浏览器里。'));
    show(page);
    fillList(listBox);
    if (startQuery) { const el = document.getElementById('search'); if (el) el.focus(); }
  }

  // 开始页的判定流程示意：与上方说明文字内容相同，只做视觉补充，所以对读屏隐藏。
  function flowDiagram() {
    const step = function (text) { return h('span', { class: 'flow-step', text: text }); };
    const arrow = function (text) { return h('span', { class: 'flow-arrow' }, h('em', { text: text })); };
    const out = function (cls, text) { return h('span', { class: 'flow-out tag ' + cls, text: text }); };
    return h('div', { class: 'flow', 'aria-hidden': 'true' },
      h('p', { class: 'flow-title', text: '每个知识点怎么判' }),
      h('div', { class: 'flow-row' }, step('第 1 题'), arrow('答对'), out('mastered', '已掌握')),
      h('div', { class: 'flow-row' }, step('答错 → 第 2 题'), arrow('答对'), out('shaky', '不稳')),
      h('div', { class: 'flow-row' }, step('第 2 题仍错'), arrow('判定'), out('weak', '薄弱，回溯先修')));
  }

  function universityGrade(sel) { return subject === 'math' && (sel === '高等数学' || sel === '线性代数' || sel === '概率论与数理统计'); }
  function scopeTargets(scope) {
    const course = Subjects.courseTargets(D.topics, scope, subject);
    if (course) return course;
    if (Subjects.academic(subject)) return null;
    if (Subjects.biogeo(subject)) return Subjects.schoolTargets(D.topics, scope, subject);
    if (Subjects.science(subject)) {
      const gradeMap = {'高一':10,'高一年级':10,'10':10,'高二':11,'高二年级':11,'11':11,'高三':12,'高三年级':12,'12':12};
      const g = gradeMap[scope];
      const bookAliases = {'必修一':'必修第一册','必修二':'必修第二册','必修三':'必修第三册','选必一':'选择性必修第一册','选必二':'选择性必修第二册','选必三':'选择性必修第三册'};
      const key = bookAliases[scope] || scope;
      const bookCode = function(value) {
        const m = /^(选择性必修|选必|必修)第?([一二三123])(?:册)?/.exec(String(value || ''));
        return m ? (m[1] === '必修' ? 'b' : 's') + ({一:'1',二:'2',三:'3'}[m[2]] || m[2]) : '';
      };
      const code = bookCode(key);
      const list = D.topics.filter(function(t) {
        if (t.external || t.grade < 10 || Subjects.isAcademicTopic(t)) return false;
        if (g) return t.grade === g;
        const b = t.textbook || {};
        return b.book === key || b.volume === key || b.title === key || (code && bookCode(b.volume) === code);
      });
      if (list.length) return {ids:list.map(function(t){return t.id;}),volumes:Array.from(new Set(list.map(function(t){return t.textbook.book;}))),label:g ? Subjects.scienceGrade(g) + '（建议编排）' : Subjects.bookLabel(list[0])};
    }
    if (!universityGrade(scope)) return E.gradeTargets(D.graph, scope, Subjects.science(subject) ? 'all' : subject);
    const ids = D.topics.filter(t => t.grade === {高等数学:15,线性代数:16,概率论与数理统计:17}[scope]).map(t => t.id);
    return ids.length ? {ids:ids, volumes:[scope], label:'大学 · ' + scope + (scope === '概率论与数理统计' ? '（完整课程，含数一方向内容）' : '')} : null;
  }
  function seniorGrade(sel) {
    return universityGrade(sel) || sel === '高一' || sel === '高二' || (Subjects.science(subject) && sel === '高三') || String(sel).indexOf('选必') === 0 || String(sel).indexOf('必修') === 0;
  }
  function seniorRangeLabel(sel) { return universityGrade(sel) ? '整门课程' : String(sel).indexOf('选必') === 0 ? '整册' : '必修整册'; }
  function gradeScope() {
    if (Subjects.academic(subject)) return gradeSel;
    if (Subjects.mixedScience(subject) && gradeSel === 'university') return volSel || 'university';
    if (Subjects.science(subject) && seniorGrade(gradeSel)) return volSel || gradeSel;
    if (seniorGrade(gradeSel)) return gradeSel;
    if ((subject === 'english' || subject === 'physics') && gradeSel === '九') return '九全';
    return gradeSel + (volSel ? volSel : '年级');
  }

  function gradeCard() {
    const box = h('div', { class: 'card card-grade', id: 'grade-card' });
    const fill = function () {
      while (box.firstChild) box.removeChild(box.firstChild);
      const g = scopeTargets(gradeScope());
      const tabs = function (label, items, current, set) {
        return h('div', { class: 'stage-tabs', role: 'tablist', 'aria-label': label }, items.map(function (it) {
          return h('button', {
            type: 'button', class: 'stage-tab' + (current === it[0] ? ' on' : ''), role: 'tab',
            'aria-selected': current === it[0] ? 'true' : 'false', 'data-value': it[0],
            onclick: function () { set(it[0]); fill(); }
          }, it[1]);
        }));
      };
      const limitInput = h('input', {
        type: 'number', min: SCREEN_MIN, max: SCREEN_MAX, step: 1, value: String(getSettings().screenLimit), id: 'screen-limit-input', 'aria-label': uiText('整体诊断题量上限')
      });
      function commitScreenLimit() {
        let v = parseInt(limitInput.value, 10);
        if (!(v >= SCREEN_MIN)) v = SCREEN_MIN;
        if (v > SCREEN_MAX) v = SCREEN_MAX;
        limitInput.value = String(v);
        setSetting('screenLimit', v);
        return v;
      }
      limitInput.addEventListener('change', commitScreenLimit);
      if (Subjects.academic(subject)) {
        box.append(
          h('div', {class:'card-head'}, h('span',{class:'card-no',text:'B'}), h('h2',{text:uiText('按课程整体诊断')})),
          h('p',{class:'muted small card-sub'},Subjects.universityScience(subject) ? '选择单个模块或全部模块，抽查基础知识并按学习单元汇总。答错时只在所选范围内追查先修；范围外的基础会在结果中提示。' : '选择单门课程或全部课程，抽查基础知识并按学习单元汇总。答错时只在所选范围内追查先修；范围外的基础会在结果中提示。'),
          tabs(uiText('诊断课程'), [['all',subject === 'cs408' ? '四门综合' : '全部' + Subjects.unitLabel(subject)]].concat(Subjects.coursesFor(subject).map(function(c){return [c.id,c.name];})), gradeSel, function(v){gradeSel=v;}),
          h('p',{class:'muted',id:'grade-info'}, g ? g.label + '：' + g.ids.length + ' 个知识点。' : '这个范围没有知识点。'),
          h('div',{class:'row limit-row'}, h('label',null,'题量上限（' + SCREEN_MIN + '–' + SCREEN_MAX + '）',limitInput),h('button',{class:'primary',id:'btn-grade-start',disabled:!g,onclick:function(){if(g) startSession(g.ids,g.label + (Subjects.curriculum(subject) ? '（整体测评）' : '（整体筛查）'),commitScreenLimit(),'screen');}},uiText('开始整体诊断'))),
          h('p',{class:'muted small'},Subjects.universityScience(subject) ? '到题量上限后，未抽查的知识点标为「未测」。结果页可再加题；基础选择题不能替代推导、综合计算与实验能力考核。' : Subjects.medical(subject) ? '到题量上限后，未抽查的知识点标为「未测」。结果页可再加题；这些基础题用于课程复习，不能评价临床实践能力。' : uiText('到题量上限后，未抽查的知识点会标为「未测」。结果页可再加题；基础诊断不能替代算法设计、综合计算和整卷训练。')),
          h('a',{class:'small',href:'../sources.html?subject=' + subject + '#' + subject},Subjects.curriculum(subject) ? '查看教材版本、核验范围与' + Subjects.unitLabel(subject) + '覆盖' : '查看考试依据、教材版本和覆盖范围')
        );
        return;
      }
      box.append(
        h('div', { class: 'card-head' }, h('span', { class: 'card-no', text: 'B' }), h('h2', { text: uiText('按年级 / 课程整体诊断') })),
        h('p', { class: 'muted small card-sub' }, '不选具体知识点，在一个年级、册或大学课程中抽查：每个知识点最多问 2 题，答错只在所选范围内回溯先修，最后按章汇总出哪几章薄弱。适合期初摸底、学期末复习。'),
        tabs('年级', Subjects.science(subject) ? Subjects.specs[subject].grades.map(function(g){var c={7:'七',8:'八',9:'九',10:'高一',11:'高二',12:'高三'}[g];return [c,Subjects.scienceGrade(g)];}).concat(Subjects.mixedScience(subject) ? [['university','大学']] : []) : subject === 'english'
          ? '三四五六七八九'.split('').map(function (x) { return [x, x + '年级']; }).concat([
            ['必修一', '必修一'], ['必修二', '必修二'], ['必修三', '必修三'],
            ['选必一', '选必一'], ['选必二', '选必二'], ['选必三', '选必三'], ['选必四', '选必四']
          ])
          : GRADES.map(function (x) { return [x, x + '年级']; }).concat([
            ['高等数学', '高等数学'], ['线性代数', '线性代数'], ['概率论与数理统计', '概率论与数理统计'], ['高一', '高一'], ['高二', '高二'], ['选必一', '选必一'], ['选必二', '选必二'], ['选必三', '选必三']
          ]), gradeSel, function (v) {
          gradeSel = v;
          if (seniorGrade(v) || v === 'university' || Subjects.courseFrom(volSel,subject)) volSel = '';
          else if ((subject === 'english' || subject === 'physics') && v === '九') volSel = '全';
          else if (volSel === '全') volSel = '';
        }),
        h('div', { class: 'tabs-gap' }),
        Subjects.mixedScience(subject) && gradeSel === 'university'
          ? tabs('大学模块', [['','全部大学模块']].concat(Subjects.coursesFor(subject).map(function(c){return [c.id,c.name];})),volSel,function(v){volSel=v;})
          : Subjects.science(subject) && seniorGrade(gradeSel)
          ? tabs('范围', [['','年级建议范围']].concat(volumeRows().filter(function(v){return D.tree[v[0]].grade === {'高一':10,'高二':11,'高三':12}[gradeSel];})), volSel, function(v){volSel=v;})
          : seniorGrade(gradeSel)
          ? tabs('范围', [['', seniorRangeLabel(gradeSel)]], '', function () { volSel = ''; })
          : ((subject === 'english' || subject === 'physics') && gradeSel === '九')
            ? tabs('范围', [['全', '全一册']], '全', function () { volSel = '全'; })
            : tabs('范围', [['', '整年级'], ['上', '上册'], ['下', '下册']], volSel, function (v) { volSel = v; }),
        h('p', { class: 'muted', id: 'grade-info' }, g ? g.label + '：' + g.ids.length + ' 个知识点。' : '这个范围没有知识点。'),
        h('div', { class: 'row limit-row' },
          h('label', null, '题量上限（' + SCREEN_MIN + '–' + SCREEN_MAX + '）', limitInput),
          h('button', {
            class: 'primary', id: 'btn-grade-start', disabled: !g,
            onclick: function () { if (g) startSession(g.ids, g.label + '（整体筛查）', commitScreenLimit(), 'screen'); }
          }, uiText('开始整体诊断'))),
        h('p', { class: 'muted small' }, '知识点多、题量有限，到上限后没测到的标为「未测」；结果页可以再加题。默认 ' + E.SCREEN_LIMIT + ' 题。'),
        Subjects.science(subject) ? h('p',{class:'muted small'},'高中按人教版册章整理；高一至高三仅为建议学习编排，请以学校实际教学顺序为准。') : '',
        subject === 'math' && gradeSel === '概率论与数理统计' ? h('p',{class:'muted small probability-scope'},'按浙大《概率论与数理统计》第六版的公开目录组织核心知识，整门测评包含数一方向内容。备考方向参考出版社公开目录；2027 年大纲全文尚未逐条核验。', h('a',{href:'../sources.html?subject=math#math-probability'},'查看教材与考研范围说明')) : '');
    };
    fill();
    return box;
  }

  function fillList(box) {
    while (box.firstChild) box.removeChild(box.firstChild);
    const q = startQuery.trim().toLowerCase();
    let shown = 0;
    function volumeStage(key) {
      if (Subjects.academic(subject)) return key;
      if (Subjects.science(subject) && D.tree[key]) return Subjects.stageCode(D.tree[key].grade,subject);
      if (universityGrade(key)) return 'u';
      if (key === '高一' || key === '高二' || key.indexOf('选必') === 0 || key.indexOf('必修') === 0) return 'h';
      if ('一二三四五六'.indexOf(key.charAt(0)) >= 0) return 'p';
      return 'j';
    }
    volumeRows().forEach(function (vv) {
      if (startStage && volumeStage(vv[0]) !== startStage) return;
      if (startCourse && vv[0] !== startCourse) return;
      const v = D.tree[vv[0]];
      if (!v) return;
      const chapters = [];
      v.chapters.forEach(function (ch) {
        const chHit = q && ch.label.toLowerCase().indexOf(q) >= 0;
        const rows = ch.topics.filter(function (x) {
          if (startMember && Subjects.rawOf(x.t) !== startMember) return false;
          if (!q || chHit) return true;
          return (x.t.name + ' ' + x.t.description + ' ' + x.t.chapter).toLowerCase().indexOf(q) >= 0;
        });
        if (rows.length) chapters.push({ ch: ch, rows: rows });
      });
      if (!chapters.length) return;
      const count = chapters.reduce(function (n, c) { return n + c.rows.length; }, 0);
      shown += count;
      const openVol = Subjects.academic(subject) ? (startStage || Subjects.specs[subject].start) : Subjects.biogeo(subject) ? (volumeRows().find(function(row){return D.tree[row[0]].grade <= 9;}) || [null])[0] : subject === 'chemistry' ? '九上' : subject === 'physics' ? '八上' : subject === 'english' ? '三上' : '一上';
      const seniorOpen = Subjects.science(subject) ? (volumeRows().find(function(row){return Subjects.stageCode(D.tree[row[0]].grade,subject) === 'h';}) || [null])[0] : subject === 'english' ? '必修一' : '高一';
      const juniorOpen = Subjects.science(subject) ? openVol : '七上';
      const det = h('details', { class: 'vol', open: !!q || (startStage === 'u' ? vv[0] === (Subjects.mixedScience(subject) ? (startCourse || Subjects.coursesFor(subject)[0].id) : '高等数学') : startStage === 'j' ? vv[0] === juniorOpen : startStage === 'h' ? vv[0] === seniorOpen : vv[0] === openVol) },
        h('summary', null, vv[1] + '（' + count + ' 个知识点）'));
      chapters.forEach(function (c) {
        const ch = c.ch;
        det.append(h('div', { class: 'chap' },
          h('div', { class: 'chap-head' },
            h('span', { class: 't', text: ch.label }),
            h('button', {
              class: 'primary', title: '把本章全部 ' + ch.topics.length + ' 个知识点一起作为目标',
              onclick: function () { startSession(ch.topics.map(function (x) { return x.t.id; }), ch.volumeLabel + ' ' + ch.label + '（整章）'); }
            }, '以整章为目标')),
          c.rows.map(function (x) {
            return h('div', { class: 'topic-row', title: x.t.description },
              h('span', { class: 'nm', text: x.t.name }),
              h('span', { class: 'sec', text: x.section }),
              h('button', { onclick: function () { startSession([x.t.id], x.t.name); } }, '选为目标'));
          })));
      });
      box.append(det);
    });
    if (!shown) box.append(h('p', { class: 'muted', text: '没有匹配的知识点。' }));
    const mc = document.getElementById('match-count');
    if (mc) mc.textContent = (q ? '找到 ' : Subjects.academic(subject) ? Subjects.unitLabel(subject) + '列表里有 ' : '册章列表里有 ') + shown + ' 个知识点';
    const browser = document.getElementById('chapter-browser');
    if (browser && q) browser.open = true;
  }

  /* ------------------------------------------------------------ 出题页 */
  function reasonFor(item) {
    const id = item.topicId;
    if ((Subjects.academic(subject) || Subjects.mixedScience(subject)) && item.attempt === 2) return '第一题未通过，用另一道题继续确认；两题均未通过才标为薄弱，第二题答对则标为「不稳」。';
    if (item.attempt === 2) return '第一题没答对，再出一道' + (item.question.difficulty === 'basic' ? '更基础' : '同级或更容易') + '的题确认：这一题也错才算薄弱，答对则标为「不稳」。';
    for (let i = session.answers.length - 1; i >= 0; i--) {
      const a = session.answers[i];
      if (a.result === 'correct') continue;
      const p = D.graph.prereqs[a.id].find(function (x) { return x.id === id; });
      if (p && E.statusOf(session, a.id) === 'weak') return '因为「' + nameOf(a.id) + '」两题都没通过，现在检查它的' + (p.strength === 'hard' ? '硬' : '软') + '先修知识点。';
    }
    if (session.mode === 'screen') return uiText('整体诊断：在所选范围内抽查知识点（离章末近的先测，答对会连带跳过它的先修）。');
    if (session.targets.length > 1) return '这是所选章节的知识点（离章末最近的先测，答对会连带跳过它的先修）。';
    return session.targets.indexOf(id) >= 0 ? '这是你选择的目标知识点，先从它开始测。' : '检查目标的先修知识点。';
  }

  function judgeAndGo(item) {
    const q = item.question;
    const val = ui.answer.trim();
    if (!val) { const el = document.getElementById('ans'); if (el) el.focus(); return; }
    const r = E.judgeQuestion(q, val);
    ui.verdict = r;
    ui.phase = r.verdict === 'manual' ? 'self' : 'auto';
    renderQuestion(item);
  }

  function displayChoices(q) {
    return window.ChoiceOrder.ordered(q, session ? session.seed : 'preview');
  }

  function answerText(q) {
    if (q.type === 'choice') {
      const c = displayChoices(q).find(function (x) { return x.key === q.answer; });
      return c ? c.label + '. ' + c.text : q.answer;
    }
    return q.answer;
  }

  function feedbackBlock(q) {
    return h('div', { class: 'feedback' },
      h('div', { class: 'refans' }, h('b', null, '参考答案：'), answerText(q)),
      q.explanation ? h('div', { class: 'explain', id: 'explain' }, h('b', null, '解析：'), q.explanation) : null);
  }

  function renderQuestion(item) {
    const id = item.topicId;
    const q = item.question;
    const t = D.graph.byId[id];
    const key = id + '#' + item.attempt;
    if (ui.key !== key) ui = { key: key, phase: 'ask', answer: '', verdict: null, picked: null };
    const n = session.answers.length;
    const card = h('div', { class: 'card card-question' });
    card.append(
      h('div', { class: 'row q-meta' },
        h('span', { class: 'q-target' }, '目标：' + sessionMeta.label),
        h('span', { class: 'grow' }),
        h('span', { class: 'q-count' }, '第 ' + (n + 1) + ' 题 / 上限 ' + session.limit)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': '答题进度', 'aria-valuemin': '0', 'aria-valuemax': String(session.limit), 'aria-valuenow': String(n) },
        h('i', { style: 'width:' + Math.round(n / session.limit * 100) + '%' })),
      h('p', { class: 'q-chapter', text: t.chapter }),
      h('h2', { class: 'q-title', text: t.name }),
      h('div', { class: 'row small q-tags' },
        h('span', { class: 'tag diff-' + q.difficulty, text: DIFF_LABEL[q.difficulty] || q.difficulty }),
        h('span', { class: 'tag', text: TYPE_LABEL[q.type] || q.type }),
        h('span', { class: 'tag', text: '本知识点第 ' + item.attempt + ' 题' })),
      h('div', { class: 'reason', text: reasonFor(item) }),
      h('div', { class: 'q-text', id: 'q-text', text: q.prompt }));
    if (t.textbook) card.append(h('p', {class:'muted small textbook-source'}, Subjects.reference(t), ' · 原创练习，', h('a',{href:'../sources.html?subject=' + subject + '#'+t.textbook.book,target:'_blank',rel:'noopener'},'查看来源')));
    if (subject === 'math' && /^cnm_ps\d+$/.test(t.id) && t.exam_scope) card.append(h('p',{class:'muted small probability-scope'},'知识语境：现代数学 · 备考方向：' + t.exam_scope.label + '。' + t.exam_scope.verification + '。', h('a',{href:'../sources.html?subject=math#math-probability',target:'_blank',rel:'noopener'},'范围说明')));
    const stemFig = figureEl(q.figure);
    if (stemFig) {
      const qt = card.querySelector('#q-text');
      if (qt) qt.insertAdjacentElement('afterend', stemFig);
    }

    if (ui.phase === 'ask') {
      if (q.type === 'choice') {
        card.append(h('div', { class: 'choices' + (q.hideChoiceText ? ' fig-icons' : ''), id: 'choices' }, displayChoices(q).map(function (c) {
          const hideName = !!(q.hideChoiceText && c.figure);
          const kids = [h('b', { class: 'choice-key', text: c.label })];
          if (!hideName) kids.push(h('span', { class: 'choice-text', text: c.text }));
          const fig = c.figure ? figureEl(c.figure) : null;
          if (fig) kids.push(fig);
          return h('button', {
            class: 'choice' + (c.figure ? ' fig-choice' : '') + (ui.picked === c.key ? ' picked' : ''),
            id: 'choice-' + c.key, 'data-key': c.key,
            'aria-label': hideName ? ('选项 ' + c.label) : null,
            onclick: function () { ui.picked = c.key; ui.answer = c.key; renderQuestion(item); }
          }, kids);
        })));
      } else if (q.type === 'self') {
        card.append(h('textarea', {
          class: 'ans-input', id: 'ans', rows: 3, placeholder: '开放题：可以写下自己的思路（不会自动判分），再点「看参考答案并自评」', value: ui.answer,
          oninput: function (e) { ui.answer = e.target.value; }
        }));
      } else {
        card.append(h('input', {
          type: 'text', class: 'ans-input', id: 'ans', autocomplete: 'off', placeholder: '在这里输入答案（数字、分数、多个答案用逗号或“和”分开）', value: ui.answer,
          oninput: function (e) { ui.answer = e.target.value; },
          onkeydown: function (e) { if (e.key === 'Enter' && !e.isComposing) judgeAndGo(item); }
        }));
      }
      card.append(h('div', { class: 'row q-actions' },
        q.type === 'self' ? null : h('button', { class: 'primary', id: 'btn-submit', onclick: function () { judgeAndGo(item); } }, '提交答案'),
        q.type === 'choice' ? null : h('button', { id: 'btn-peek', onclick: function () { ui.phase = 'self'; ui.verdict = null; renderQuestion(item); } }, '看参考答案并自评'),
        h('button', { id: 'btn-skip', onclick: function () { ui.phase = 'skip'; renderQuestion(item); } }, '不会')));
    } else if (ui.phase === 'auto') {
      const ok = ui.verdict.verdict === 'correct';
      card.append(
        h('div', { class: 'verdict ' + (ok ? 'ok' : 'no') }, ok ? '自动判定：正确' : '自动判定：不正确'),
        h('div', { class: 'muted your-answer' }, '你的答案：' + (q.type === 'choice' ? answerOfKey(q, ui.answer) : ui.answer)),
        feedbackBlock(q),
        h('div', { class: 'row q-actions' },
          h('button', { class: 'primary', id: 'btn-next', onclick: function () { commit(ok ? 'correct' : 'wrong'); } }, '下一题'),
          h('button', { id: 'btn-flip', onclick: function () { commit(ok ? 'wrong' : 'correct'); } }, ok ? '判错了，我其实没做对' : '判错了，我其实做对了'),
          h('button', { onclick: function () { ui.phase = 'ask'; renderQuestion(item); } }, '重新作答')));
    } else if (ui.phase === 'skip') {
      card.append(
        h('div', { class: 'muted your-answer' }, '你选择了「不会」。看一下答案和解析再继续：'),
        feedbackBlock(q),
        h('div', { class: 'row q-actions' }, h('button', { class: 'primary', id: 'btn-next', onclick: function () { commit('skip'); } }, '下一题')));
    } else {
      card.append(
        ui.answer ? h('div', { class: 'muted your-answer' }, '你的答案：' + ui.answer) : null,
        q.type === 'self' ? h('div', { class: 'muted your-answer' }, '开放题：请对照参考答案自己判断。')
          : (ui.verdict ? h('div', { class: 'muted your-answer' }, '这道题的答案无法被自动可靠地判定，请对照参考答案自己判断。') : null),
        feedbackBlock(q),
        h('div', { class: 'row q-actions' },
          h('button', { class: 'good', id: 'btn-right', onclick: function () { commit('correct'); } }, '对（我做对了）'),
          h('button', { class: 'bad', id: 'btn-wrong', onclick: function () { commit('wrong'); } }, '不对'),
          h('button', { id: 'btn-skip2', onclick: function () { commit('skip'); } }, '不会')));
    }

    card.append(h('div', { class: 'notice' }, Subjects.isAcademicTopic(t) ? '根据参考答案检查本次选择。答题记录中可以更正判定；知识解释与争议点请结合教材和教师指导核实。' : '提示：自动判题只是近似的（数字、分数、多个答案会做规范化后比较），一切以参考答案为准；判错了可以手动更正。'));
    card.append(h('div', { class: 'row no-print q-foot' },
      n > 0 ? h('button', { class: 'small', onclick: function () { rebuild(session.answers.slice(0, -1)); } }, '撤销上一题') : null,
      h('button', { class: 'small', onclick: function () { if (confirm(uiText('确定放弃当前诊断并回到开始页吗？'))) restart(); } }, '重新开始')));
    const page = h('div', { class: 'page page-question' });
    if (demo) page.append(demoBanner());
    page.append(card);
    show(page);
    const inp = document.getElementById('ans');
    if (inp && inp.setSelectionRange && inp.tagName === 'INPUT') { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    else if (inp) inp.focus();
  }

  function answerOfKey(q, key) {
    const c = displayChoices(q).find(function (x) { return x.key === key; });
    return c ? c.label + '. ' + c.text : key;
  }

  function demoBanner() {
    return h('div', { class: 'banner demo no-print' }, '演示模式：由程序模拟一位学生作答（不会保存进度）。',
      h('a', { href: withSubject('./index.html') }, '退出演示'));
  }

  /* ------------------------------------------------------------ 分享图 */
  function onShareKey(e) { if (e.key === 'Escape') closeShare(); }
  function closeShare() {
    shareToken++;
    document.removeEventListener('keydown', onShareKey);
    var modal = document.getElementById('share-modal');
    if (modal) modal.remove();
    document.body.classList.remove('share-open');
    if (shareBlobUrl) { URL.revokeObjectURL(shareBlobUrl); shareBlobUrl = null; }
  }
  function shareScopeText() {
    var raw = sessionMeta && sessionMeta.label ? String(sessionMeta.label) : uiText('本次诊断');
    raw = raw.replace(/（整体筛查）/g, '').replace(/（整章）/g, '').replace(/（旧编号已对应到小学知识点）/g, '');
    raw = raw.replace(/\s+/g, ' ').trim();
    return raw || uiText('本次诊断');
  }
  function buildShareModel(sum, chapters) {
    var subjectName = Subjects.names[subject];
    var spots = [];
    var spotKind = 'topic';
    if (chapters && chapters.length) {
      spotKind = 'chapter';
      var hot = chapters.filter(function (c) { return c.weak > 0 || c.shaky > 0; });
      if (!hot.length) hot = chapters.slice(0, 3);
      spots = hot.slice(0, 3).map(function (c) {
        return { title: c.label, detail: '薄弱 ' + c.weak + ' · 不稳 ' + c.shaky + ' · 未测 ' + c.untested };
      });
    } else {
      var seen = Object.create(null);
      var ids = [];
      var pushId = function (id) {
        if (!id || seen[id] || ids.length >= 3) return;
        seen[id] = true;
        ids.push(id);
      };
      sum.roots.forEach(function (r) { pushId(r.id); });
      sum.weak.forEach(pushId);
      sum.shaky.forEach(pushId);
      spots = ids.map(function (id) {
        return { title: nameOf(id), detail: STATUS_LABEL[E.statusOf(session, id)] || '' };
      });
    }
    var now = new Date();
    return {
      siteName: '学科知识图谱',
      subject: subjectName,
      scope: shareScopeText(),
      mastered: sum.mastered.length,
      shaky: sum.shaky.length,
      weak: sum.weak.length,
      untested: sum.untested.length,
      spotKind: spotKind,
      spots: spots,
      roots: sum.roots.slice(0, 2).map(function (r) { return nameOf(r.id); }),
      date: now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日'
    };
  }
  function mountShareModal(url) {
    var old = document.getElementById('share-modal');
    if (old) old.remove();
    var img = h('img', { id: 'share-preview', alt: uiText('诊断分享图'), src: url });
    var modal = h('div', {
      id: 'share-modal', class: 'share-modal no-print', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'share-title',
      onclick: function (e) { if (e.target === modal) closeShare(); }
    }, h('div', { class: 'share-panel', onclick: function (e) { e.stopPropagation(); } },
      h('div', { class: 'share-bar' },
        h('h2', { id: 'share-title', text: '分享图' }),
        h('button', { type: 'button', id: 'share-close', onclick: closeShare }, '关闭')),
      h('p', { id: 'share-hint', class: 'share-hint', text: '长按图片保存' }),
      h('div', { class: 'share-scroll' }, img),
      h('div', { class: 'share-actions' },
        h('a', { id: 'share-download', class: 'btn btn-primary', href: url, download: uiText('知识图谱诊断分享.png') }, '下载图片'))));
    document.body.classList.add('share-open');
    document.body.append(modal);
    document.addEventListener('keydown', onShareKey);
  }
  function openShare() {
    if (!window.ShareCard) {
      var host0 = document.getElementById('summary');
      if (host0) host0.append(h('p', { id: 'share-error', class: 'err', text: '分享图没有生成：组件没有加载' }));
      return;
    }
    var token = ++shareToken;
    var sum = E.summarize(D.graph, session);
    var chapters = session.mode === 'screen' ? E.chapterSummary(D.graph, session) : null;
    var model = buildShareModel(sum, chapters);
    window.__shareModel = model;
    var canvas = document.createElement('canvas');
    try { window.ShareCard.draw(canvas, model); }
    catch (err) {
      var host = document.getElementById('summary');
      if (host) host.append(h('p', { id: 'share-error', class: 'err', text: '分享图没有生成：' + (err && err.message ? err.message : err) }));
      return;
    }
    var finish = function (url) {
      if (token !== shareToken) {
        if (String(url).indexOf('blob:') === 0) URL.revokeObjectURL(url);
        return;
      }
      if (shareBlobUrl && shareBlobUrl !== url) URL.revokeObjectURL(shareBlobUrl);
      shareBlobUrl = String(url).indexOf('blob:') === 0 ? url : null;
      mountShareModal(url);
    };
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (token !== shareToken) return;
        if (!blob) { finish(canvas.toDataURL('image/png')); return; }
        finish(URL.createObjectURL(blob));
      }, 'image/png');
    } else finish(canvas.toDataURL('image/png'));
  }

  /* ------------------------------------------------------------ 结果页 */
  function standardsBlock(id) {
    const t = D.graph.byId[id];
    if (t.textbook) return h('div', {class:'textbook-source small'}, h('b',null,'教材依据：'), Subjects.reference(t), ' · ', h('a',{href:'../sources.html?subject=' + subject + '#'+t.textbook.book},'来源说明'));
    const list = t.standards || [];
    if (!list.length) return h('div', { class: 'muted small', text: t.external ? '小学阶段知识点，未对应第四学段课标条目。' : '没有对应的课标条目。' });
    return h('div', null, h('b', null, '课标条目：'), list.map(function (sd) {
      const item = D.stdById[sd.id];
      return h('div', { class: 'std' },
        h('code', { text: sd.id }), h('span', { class: 'conf', text: sd.confidence === 'exact' ? '直接对应' : '推断对应' }),
        h('div', { text: item ? item.text : '（课标文件中找不到该条目）' }),
        sd.note ? h('div', { class: 'muted small', text: '说明：' + sd.note }) : null);
    }));
  }

  function topicBody(id, extra) {
    const t = D.graph.byId[id];
    const body = h('div', { class: 'body' });
    body.append(h('div', { class: 'muted' }, (t.external ? uiText('小学先修知识点（无诊断题）') : t.chapter) + (t.domain ? ' · ' + t.domain : '')));
    body.append(h('div', { text: t.description }));
    if (t.mastery_criteria && t.mastery_criteria.length) {
      body.append(h('div', null, h('b', null, '掌握标准：'), h('ul', null, t.mastery_criteria.map(function (m) { return h('li', { text: m }); }))));
    }
    if (extra) body.append(extra);
    body.append(standardsBlock(id));
    return body;
  }

  function topicItem(id, tags, extra) {
    const t = D.graph.byId[id];
    return h('details', { class: 'topic' },
      h('summary', null, tags, h('span', { text: t.name }), ' ', h('span', { class: 'muted small', text: t.external ? '小学' : t.chapter })),
      topicBody(id, extra));
  }

  function tag(cls, text) { return h('span', { class: 'tag ' + cls, text: text }); }
  function statusTags(id, rootSet, targetSet) {
    const st = E.statusOf(session, id);
    const out = [];
    if (targetSet.has(id)) out.push(tag('target', '目标'));
    if (rootSet.has(id)) out.push(tag('root', '根因'));
    out.push(tag(st, STATUS_LABEL[st]));
    if (D.graph.byId[id].external) out.push(tag('ext', '小学'));
    return out;
  }

  function renderResult() {
    const sum = E.summarize(D.graph, session);
    const rootSet = new Set(sum.roots.map(function (r) { return r.id; }));
    const screen = session.mode === 'screen';
    const targetSet = new Set(screen ? [] : session.targets);
    const page = h('div', { class: 'page page-result' });
    if (demo) page.append(demoBanner());

    const targetsMastered = session.targets.every(function (id) { return E.statusOf(session, id) === 'mastered'; });
    const chapters = screen ? E.chapterSummary(D.graph, session) : null;
    const outOfScope = screen ? sum.roots.filter(function (r) { return r.outOfScopePrereqs.length; }) : [];
    let headline;
    if (screen) {
      if (!sum.weak.length && !sum.shaky.length) headline = sum.untested.length
        ? '已测到的知识点没有发现薄弱点，另有 ' + sum.untested.length + ' 个没测到。'
        : (Subjects.curriculum(subject) || Subjects.mixedScience(subject)) ? '本次抽查及先修推断中没有发现薄弱点。请结合实际答题记录继续复习。' : '范围内的知识点都已掌握，没有发现薄弱点。';
      else headline = '范围内共 ' + session.targets.length + ' 个知识点：薄弱 ' + sum.weak.length + '、不稳 ' + sum.shaky.length + '、未测 ' + sum.untested.length +
        '。先看下面的「按章汇总」，薄弱的章排在前面。';
    }
    else if (!sum.roots.length && !sum.shaky.length && targetsMastered) headline = (Subjects.curriculum(subject) || Subjects.mixedScience(subject)) ? uiText('本次目标知识点的题目作答正确，工具没有继续追问先修。这不代表完整掌握该课程。') : '目标知识点已掌握，没有发现需要补的先修。';
    else if (!sum.roots.length && !sum.shaky.length) headline = '没有判出薄弱点，但目标尚未全部测到。';
    else if (!sum.roots.length) headline = '没有判出薄弱点，但有 ' + sum.shaky.length + ' 个知识点「不稳」（第一题没答对、第二题答对），建议巩固。';
    else headline = '共发现 ' + sum.roots.length + ' 个薄弱根因' + (sum.shaky.length ? '、' + sum.shaky.length + ' 个不稳的知识点' : '') + '，按下面的学习路径从前往后补。';

    const more = screen ? 10 : 4;
    const summaryCard = h('div', { class: 'card card-summary', id: 'summary' },
      h('p', { class: 'eyebrow', text: uiText('诊断结果') + (screen ? (Subjects.curriculum(subject) ? ' · 整体测评' : ' · 整体筛查') : '') }),
      h('h1', { class: 'result-title', text: sessionMeta.label }),
      h('p', { class: 'result-headline' }, headline),
      (Subjects.curriculum(subject) || Subjects.mixedScience(subject)) ? h('p',{class:'muted small'},uiText('“已掌握”包括直接答对和依据先修关系推断的条目；展开下方列表可区分两者。这里只评价本次课程知识作答。')) : null,
      h('div', { class: 'stats' },
        stat('ask', sum.asked, '已答题数'),
        stat('bad', sum.weak.length, '薄弱'),
        stat('shaky', sum.shaky.length, '不稳'),
        stat('ok', sum.mastered.length, '已掌握'),
        stat('unk', sum.untested.length, '未测')),
      sum.unconfirmed.length ? h('p', { class: 'notice' }, '「' + sum.unconfirmed.map(nameOf).join('」「') + '」只答了第一题（答错）就到了题量上限，没来得及复测，暂按薄弱处理。') : null,
      sum.limitReached ? h('p', { class: 'notice' }, '已达到题量上限（' + sum.limit + '），剩余没测到的知识点标为「未测」。薄弱根因的先修里若有未测点，真正的根因可能更靠前。',
        session.limit >= 60 ? null : h('button', { class: 'no-print', style: 'margin-left:8px', onclick: function () { rebuild(session.answers, Math.min(session.limit + more, 60)); } }, '再多答 ' + Math.min(more, 60 - session.limit) + ' 题')) : null,
      h('p', { class: 'muted small' }, (Subjects.academic(subject) ? '答题记录里可以更正任何一题。生成时间：' : '自动判题只是近似的，答题记录里可以更正任何一题。生成时间：') + new Date().toLocaleString('zh-CN')),
      h('div', { class: 'row no-print result-actions' },
        h('button', { class: 'primary', id: 'btn-share', onclick: openShare }, '生成分享图'),
        h('button', { id: 'btn-export', onclick: exportJson }, '导出 JSON'),
        h('button', { id: 'btn-print', onclick: printPage }, '打印 / 另存为 PDF'),
        h('button', { onclick: function () { if (confirm('重新开始会清除当前进度，确定吗？')) restart(); } }, '重新开始'),
        session.answers.length ? h('button', { onclick: function () { rebuild(session.answers.slice(0, -1)); } }, '撤销上一题') : null));
    summaryCard.append(h('details',{class:'export-preview no-print',id:'export-preview',ontoggle:function(e){if(e.target.open)e.target.querySelector('pre').textContent=serializeExport();}},
      h('summary',null,'查看导出数据'),h('p',{class:'muted small'},'这里显示与下载相同的本次 JSON 数据。若浏览器未能下载，可选中并复制保存；包含选题种子与避题历史，便于复核。'),h('pre',{id:'export-json'})));
    page.append(summaryCard);
    // 宽屏两栏：左边是根因、不稳和学习路径，右边固定显示路径图；窄屏与打印时回到单栏。
    const main = h('div', { class: 'result-main' });
    const side = h('div', { class: 'result-side' });
    // 整体筛查的路径图节点多，单栏全宽显示更清楚。
    page.append(h('div', { class: 'result-grid' + (screen ? ' single' : '') }, main, side));
    if (screen) main.append(chaptersCard(chapters, outOfScope));

    main.append(h('div', { class: 'card', id: 'roots' },
      h('h2', { text: '薄弱的先修知识点（根因）' }),
      h('p', { class: 'muted small' }, '根因 = 被判为薄弱、且它的直接先修里没有薄弱点的知识点。点击展开看描述、掌握标准和来源依据。'),
      sum.roots.length ? sum.roots.map(function (r) {
        const notes = h('div');
        if (r.pendingPrereqs.length) notes.append(h('div', { class: 'notice', text: '它的先修「' + r.pendingPrereqs.map(nameOf).join('」「') + '」没来得及测（题量用完），真正的根因可能更靠前。' }));
        if (r.outOfScopePrereqs.length) notes.append(h('div', { class: 'notice', text: '它的先修「' + r.outOfScopePrereqs.map(nameOf).join('」「') + '」不在所选范围内，没有检查。' }));
        if (r.externalPrereqs.length) notes.append(h('div', { class: 'muted small', text: uiText('小学先修（无诊断题，未测）：') + r.externalPrereqs.map(nameOf).join('、') }));
        return topicItem(r.id, statusTags(r.id, rootSet, targetSet), notes);
      }) : h('p', { text: targetsMastered ? '没有。' : '暂未发现。' })));

    main.append(h('div', { class: 'card', id: 'shaky' },
      h('h2', { text: '不稳的知识点（' + sum.shaky.length + '）' }),
      h('p', { class: 'muted small' }, ((Subjects.academic(subject) || Subjects.mixedScience(subject)) ? '第一题未通过，第二题答对：本次表现不一致，需要结合题目内容继续确认。' : '第一题没答对，但第二题（同级或更容易）答对了：可能是粗心，也可能掌握得不牢。') + '它们会出现在学习路径里需要巩固，但工具没有继续向它们的先修回溯（只有两题都错才回溯）。'),
      sum.shaky.length ? sum.shaky.map(function (id) { return topicItem(id, statusTags(id, rootSet, targetSet)); }) : h('p', { text: '没有。' })));

    main.append(h('div', { class: 'card', id: 'path' },
      h('h2', { text: '推荐学习路径' }),
      h('p', { class: 'muted small' }, (Subjects.academic(subject) || Subjects.mixedScience(subject)) ? uiText('从薄弱根因和「不稳」的知识点通向目标，按先修拓扑顺序排列，跨课程的基础也会放在依赖它的知识点前面。「未测」项建议先自查。') : '从根因（和「不稳」的点）出发到目标之间、尚未判定为掌握的知识点，按年级从低到高排列（同一年级里先修在前），从上往下学。「不稳」「未测」的点也在路径上，建议先巩固 / 自查。'),
      sum.path.length ? h('ol', { class: 'path' }, sum.path.map(function (p) {
        return h('li', null, topicItem(p.id, statusTags(p.id, rootSet, targetSet)));
      })) : h('p', { text: (Subjects.curriculum(subject) || Subjects.mixedScience(subject)) ? '本次测评没有形成待补路径，可结合教材继续复习。' : '不需要补课。' })));

    side.append(h('div', { class: 'card', id: 'graph' },
      h('h2', { text: '路径图' }),
      h('p', { class: 'muted small' }, (Subjects.academic(subject) ? Subjects.names[subject] + '知识点以金色表示。' : '各学段使用不同颜色，大学内容为金色。') + '硬先修是实线，软先修是虚线，点线表示中间省略了没画出来的知识点。红框是薄弱根因，实心块是目标。名称太长会省略，悬停或点按可看全名。学习路径列表是完整学习顺序。'),
      h('ul', { class: 'legend' },
        !Subjects.academic(subject) ? h('li', null, h('i', { class: 'swatch sw-p' }), '小学') : null,
        !Subjects.academic(subject) ? h('li', null, h('i', { class: 'swatch sw-j' }), '初中') : null,
        !Subjects.academic(subject) ? h('li', null, h('i', { class: 'swatch sw-h' }), '高中') : null,
        Subjects.academic(subject) ? h('li', null, h('i', {class:'swatch sw-u'}), Subjects.names[subject]) : null,
        subject === 'math' || Subjects.mixedScience(subject) ? h('li', null, h('i', {class:'swatch sw-u'}), '大学') : null,
        h('li', null, h('i', { class: 'swatch sw-root' }), '薄弱根因'),
        h('li', null, h('i', { class: 'swatch sw-target' }), '目标'),
        h('li', null, h('i', { class: 'swatch line-hard' }), '硬先修（实线）'),
        h('li', null, h('i', { class: 'swatch line-soft' }), '软先修（虚线）'),
        h('li', null, h('i', { class: 'swatch line-skip' }), '中间省略（点线）')),
      h('div', { class: 'path-graph' },
        h('div', { id: 'path-cy', role: 'img', 'aria-label': '先修路径图' }),
        h('div', { id: 'node-tip', class: 'node-tip', role: 'tooltip', hidden: true }))));

    page.append(h('details', { class: 'card', id: 'mastered' },
      h('summary', null, h('b', null, '已掌握的知识点（' + sum.mastered.length + '）')),
      sum.mastered.map(function (id) {
        const src = session.status[id].src === 'direct' ? '答对' : '由后续知识点答对推断';
        return topicItem(id, [tag('mastered', src)].concat(D.graph.byId[id].external ? [tag('ext', '小学')] : []));
      })));

    page.append(h('details', { class: 'card', id: 'untested' },
      h('summary', null, h('b', null, '未测的知识点（' + sum.untested.length + '）')),
      h('p', { class: 'muted small' }, Subjects.academic(subject) ? '这些知识点本次尚未作答，也未由后续作答推定掌握；可再选它们进行检查。' : '题量用完，或不必再测，所以没问到的知识点。小学知识点同样会出题。'),
      sum.untested.map(function (id) { return topicItem(id, statusTags(id, rootSet, targetSet)); })));

    page.append(standardsCard(sum));
    page.append(logCard());
    show(page);
    mountPathGraph(sum);
  }

  function nameList(ids) { return ids.map(nameOf).join('、'); }

  function chaptersCard(chapters, outOfScope) {
    const seg = function (cls, n, total) { return n ? h('i', { class: cls, style: 'width:' + (n / total * 100) + '%' }) : null; };
    return h('div', { class: 'card', id: 'chapters' },
      h('h2', { text: '按章汇总' }),
      h('p', { class: 'muted small' }, '每章的知识点掌握情况，薄弱多的章排在前面；点开看具体是哪几个知识点。色条从左到右：掌握、不稳、薄弱、未测。'),
      outOfScope.length ? h('p', { class: 'notice', id: 'out-of-scope' }, '部分薄弱点的先修在所选范围之外，未检查（涉及 ' + outOfScope.length + ' 个薄弱点，如「' +
        outOfScope.slice(0, 3).map(function (r) { return nameOf(r.id); }).join('」「') + uiText('」）。可对这些知识点单独做诊断，沿先修继续往前查。')) : null,
      chapters.map(function (c) {
        return h('details', { class: 'topic chap-sum', open: c.weak > 0 || c.shaky > 0 },
          h('summary', null,
            h('span', { class: 'chap-name', text: c.label }),
            h('span', { class: 'chap-counts' },
              tag('mastered', '掌握 ' + c.mastered), tag('shaky', '不稳 ' + c.shaky), tag('weak', '薄弱 ' + c.weak), tag('unknown', '未测 ' + c.untested)),
            h('span', { class: 'chap-bar', 'aria-hidden': 'true' },
              seg('m', c.mastered, c.total), seg('s', c.shaky, c.total), seg('w', c.weak, c.total), seg('u', c.untested, c.total))),
          h('div', { class: 'body' },
            h('div', { class: 'muted small', text: '共 ' + c.total + ' 个知识点' }),
            c.weakIds.length ? h('div', { class: 'chap-names' }, tag('weak', '薄弱'), nameList(c.weakIds)) : null,
            c.shakyIds.length ? h('div', { class: 'chap-names' }, tag('shaky', '不稳'), nameList(c.shakyIds)) : null,
            !c.weakIds.length && !c.shakyIds.length ? h('div', { class: 'muted small', text: c.untested ? '没有发现薄弱或不稳的点，另有 ' + c.untested + ' 个没测到。' : '没有发现薄弱或不稳的点。' }) : null));
      }));
  }

  function stat(cls, n, label) { return h('div', { class: 'stat ' + cls }, h('b', { text: String(n) }), h('span', { class: 'stat-name', text: label })); }

  function standardsCard(sum) {
    const ids = new Set(session.mode === 'screen' ? [] : session.targets);
    sum.path.forEach(function (p) { ids.add(p.id); });
    if (subject === 'math' && session.targets.some(function(id){return /^cnm_ps\d+$/.test(id);})) return h('div',{class:'card',id:'standards'}, h('h2',{text:'教材复习出处'}), h('p',{class:'muted small'},'概率论与数理统计按教材章节定位，备考方向参考出版社公开目录；2027 年大纲全文尚未逐条核验。基础选择题只作抽查，不能代替证明、综合计算与整卷训练。'), h('p',null,h('a',{href:'../sources.html?subject=math#math-probability'},'查看教材版本与考研范围说明')), Array.from(ids).map(function(id){return h('p',null,h('b',null,nameOf(id)+'：'),standardsBlock(id));}));
    if (Subjects.science(subject) || Subjects.academic(subject)) return h('div', {class:'card',id:'standards'}, h('h2',{text:'教材复习出处'}), h('p',{class:'muted small'},(Subjects.academic(subject) || Subjects.mixedScience(subject)) ? '按各条来源说明回到教材或标准文档复习；专题关联与未核实的章节位置已单独注明。题目与先修关系已进行 AI 检查，尚未经教师审核。' : Subjects.biogeo(subject) ? '按教材册次、单元与章查找知识。已读目录、配套资料和可读正文的核验层级分别说明；已知更新但尚未取得的新目录与正文、图谱原创细分主题等边界见来源页；题目与先修关系已经 AI 检查，尚未经教师审核。' : '按教材章节回到原书复习；仅显示已核实的章节定位。题目与先修关系已进行 AI 检查，尚未经教师审核。'), Array.from(ids).map(function(id){return h('p',null,h('b',null,nameOf(id)+'：'),standardsBlock(id));}));
    const by = {};
    ids.forEach(function (id) {
      (D.graph.byId[id].standards || []).forEach(function (sd) { (by[sd.id] || (by[sd.id] = [])).push(id); });
    });
    const keys = Object.keys(by).sort();
    return h('div', { class: 'card', id: 'standards' },
      h('h2', { text: '相关课标条目' }),
      h('p', { class: 'muted small' }, subject === 'english'
        ? '目标与学习路径上的知识点对应的《义务教育英语课程标准（2022年版）》和《普通高中英语课程标准（2017年版2020年修订）》公开转述（一级、二级、三级，以及高中必修、选择性必修；未经逐页核对；映射由 AI 生成，未经专家审核）。'
        : '目标与学习路径上的知识点对应的《义务教育数学课程标准（2022年版）》内容要求（第一至第四学段；映射由 AI 生成，未经专家审核）。'),
      keys.length ? keys.map(function (k) {
        const item = D.stdById[k];
        return h('div', { class: 'std' }, h('code', { text: k }),
          h('div', { text: item ? item.text : '' }),
          h('div', { class: 'muted small', text: '对应知识点：' + by[k].map(nameOf).join('、') }));
      }) : h('p', { class: 'muted', text: '无。' }));
  }

  function logCard() {
    const rows = session.answers.map(function (a, i) {
      const q = E.questionById(D.graph, a.qid) || { prompt: '', answer: '' };
      const sel = h('select', {
        onchange: function (e) {
          const next = session.answers.map(function (x, j) { return j === i ? Object.assign({}, x, { result: e.target.value }) : x; });
          rebuild(next);
        }
      }, ['correct', 'wrong', 'skip'].map(function (r) { return h('option', { value: r, selected: r === a.result }, RESULT_LABEL[r]); }));
      return h('tr', null, h('td', { text: String(i + 1) }),
        h('td', null, nameOf(a.id), h('div', { class: 'muted small', text: q.prompt.length > 60 ? q.prompt.slice(0, 59) + '…' : q.prompt })),
        h('td', { class: 'muted', text: q.type === 'choice' && a.text ? answerOfKey(q, a.text) : (a.text || '') }),
        h('td', null, sel), h('td', { class: 'muted', text: answerText(q) }));
    });
    return h('div', { class: 'card', id: 'log' },
      h('h2', { text: '答题记录（可更正）' }),
      h('p', { class: 'muted small' }, uiText('自动判题可能判错。在这里改某一题的结果会重新计算整份诊断（后续是否还需要追问也会随之变化）。')),
      session.answers.length ? h('table', { class: 'log' },
        h('thead', null, h('tr', null, h('th', { text: '#' }), h('th', { text: '知识点 / 题目' }), h('th', { text: '你的答案' }), h('th', { text: '结果' }), h('th', { text: '参考答案' }))),
        h('tbody', null, rows)) : h('p', { class: 'muted', text: '还没有答题。' }));
  }

  /* ------------------------------------------------------------ 路径图（Cytoscape + dagre） */
  function hidePathTip() {
    const tip = document.getElementById('node-tip');
    if (tip) tip.hidden = true;
  }
  function showPathTip(node) {
    const tip = document.getElementById('node-tip');
    const stage = document.querySelector('.path-graph');
    if (!tip || !stage || !pathCy || !node || node.empty()) return;
    const text = node.data('full') || node.data('label') || '';
    if (!text) { tip.hidden = true; return; }
    tip.textContent = text;
    tip.hidden = false;
    const stageRect = stage.getBoundingClientRect();
    const cyRect = pathCy.container().getBoundingClientRect();
    const bb = node.renderedBoundingBox({ includeLabels: true });
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const cx = cyRect.left - stageRect.left + (bb.x1 + bb.x2) / 2;
    const top = cyRect.top - stageRect.top + bb.y1;
    let left = Math.max(8, Math.min(cx - tipW / 2, Math.max(8, stageRect.width - tipW - 8)));
    let y = top - tipH - 8;
    if (y < 4) y = cyRect.top - stageRect.top + bb.y2 + 8;
    if (y + tipH > stageRect.height - 4) y = Math.max(4, stageRect.height - tipH - 4);
    tip.style.left = left + 'px';
    tip.style.top = y + 'px';
  }
  function ensureDagre() {
    if (!window.cytoscape || !window.dagre || !window.cytoscapeDagre) throw new Error('图形库没有加载');
    if (!ensureDagre.ready) { window.cytoscape.use(window.cytoscapeDagre); ensureDagre.ready = true; }
  }
  function mountPathGraph(sum) {
    const token = ++pathToken;
    if (pathCy) { pathCy.destroy(); pathCy = null; window.__pathCy = null; }
    const cyEl = document.getElementById('path-cy');
    if (!cyEl) return;
    cyEl.dataset.ready = '0';
    hidePathTip();
    const lay = E.layout(D.graph, session, sum);
    requestAnimationFrame(function () {
      if (token !== pathToken || !document.body.contains(cyEl)) return;
      try {
        ensureDagre();
        const colors = theme();
        const narrow = labelLimit() <= 8;
        const textMax = narrow ? 104 : 126;
        const boxW = narrow ? 118 : 142;
        const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif';
        const elements = [];
        lay.nodes.forEach(function (n) {
          const topic = D.graph.byId[n.id];
          const grade = topic && typeof topic.grade === 'number' ? topic.grade : 7;
          const kind = Subjects.stageKind(grade, subject);
          const name = nameOf(n.id);
          const bits = [name];
          if (n.isRoot) bits.push('薄弱根因');
          if (n.isTarget) bits.push('目标');
          bits.push(STATUS_LABEL[n.status] || n.status);
          let bg = kind === 'primary' ? colors.primaryBg : kind === 'junior' ? colors.juniorBg : kind === 'university' ? colors.universityBg : colors.seniorBg;
          let border = kind === 'primary' ? colors.primary : kind === 'junior' ? colors.junior : kind === 'university' ? colors.university : colors.senior;
          let fg = colors.text;
          if (n.isTarget) { bg = colors.currentBg; border = colors.currentBorder; fg = colors.currentText; }
          if (n.isRoot) { bg = colors.badBg; border = colors.bad; fg = colors.text; }
          const classes = [kind];
          if (n.isRoot) classes.push('root');
          if (n.isTarget) classes.push('target', 'current');
          elements.push({
            data: { id: n.id, name: name, full: bits.join(' · '), label: clipLabel(name), bg: bg, border: border, color: fg },
            classes: classes.join(' ')
          });
        });
        lay.edges.forEach(function (e, i) {
          const soft = e.direct && e.strength === 'soft';
          const kind = !e.direct ? 'indirect' : (soft ? 'soft' : 'hard');
          const color = kind === 'hard' ? colors.edge : colors.edgeSoft;
          elements.push({
            data: { id: 'e' + i, source: e.from, target: e.to, color: color },
            classes: kind
          });
        });
        pathCy = window.cytoscape({
          container: cyEl,
          elements: elements,
          minZoom: 0.2,
          maxZoom: 2.8,
          wheelSensitivity: 0.28,
          boxSelectionEnabled: false,
          autoungrabify: true,
          userPanningEnabled: true,
          userZoomingEnabled: true,
          style: [
            { selector: 'node', style: {
              label: 'data(label)', 'text-wrap': 'ellipsis', 'text-max-width': textMax + 'px',
              'text-overflow-wrap': 'anywhere',
              'text-valign': 'center', 'text-halign': 'center',
              'font-size': 12.5, 'font-weight': 600, 'font-family': FONT, color: 'data(color)',
              'background-color': 'data(bg)', 'border-width': 1.5, 'border-color': 'data(border)',
              shape: 'round-rectangle', width: boxW, height: 36, padding: 0, 'corner-radius': 10,
              'overlay-shape': 'round-rectangle', 'overlay-corner-radius': 12, 'overlay-padding': 4
            } },
            { selector: 'node.current', style: {
              'border-width': 0, 'z-index': 8, 'font-weight': 700,
              'outline-width': 6, 'outline-color': colors.halo, 'outline-opacity': 0.13, 'outline-offset': 2
            } },
            { selector: 'node.root', style: {
              'background-color': colors.badBg, 'border-color': colors.bad, 'border-width': 2.5, 'z-index': 11,
              'outline-width': 5, 'outline-color': colors.bad, 'outline-opacity': 0.16, 'outline-offset': 2
            } },
            { selector: 'edge', style: {
              width: 1.25, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.75, 'line-style': 'solid'
            } },
            { selector: 'edge.soft', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 4], width: 1.2 } },
            { selector: 'edge.indirect', style: { 'line-style': 'dotted', width: 1.4 } }
          ]
        });
        window.__pathCy = pathCy;
        pathCy.on('mouseover', 'node', function (event) { showPathTip(event.target); });
        pathCy.on('mouseout', 'node', function () { if (!pathTipLock) hidePathTip(); });
        pathCy.on('tap', 'node', function (event) { pathTipLock = true; showPathTip(event.target); });
        pathCy.on('tap', function (event) {
          if (event.target === pathCy) { pathTipLock = false; hidePathTip(); }
        });
        const layout = pathCy.layout({
          name: 'dagre', rankDir: 'TB', rankSep: 64, nodeSep: 22, edgeSep: 10,
          padding: 16, animate: false, fit: true, nodeDimensionsIncludeLabels: false, spacingFactor: 1.05
        });
        layout.one('layoutstop', function () {
          if (token !== pathToken || !pathCy) return;
          requestAnimationFrame(function () {
            if (token !== pathToken || !pathCy) return;
            pathCy.resize();
            pathCy.fit(undefined, 24);
            cyEl.dataset.ready = '1';
          });
        });
        layout.run();
      } catch (error) {
        cyEl.dataset.ready = 'err';
        cyEl.append(h('p', { class: 'muted', text: '图没有画出来：' + (error && error.message ? error.message : error) }));
      }
    });
  }

  /* ------------------------------------------------------------ 导出 / 打印 */
  function buildExport() {
    const sum = E.summarize(D.graph, session);
    const stdIds = new Set();
    const brief = function (id) { return { id: id, name: nameOf(id) }; };
    sum.path.concat(session.mode === 'screen' ? [] : session.targets.map(function (id) { return { id: id }; })).forEach(function (p) {
      (D.graph.byId[p.id].standards || []).forEach(function (sd) { stdIds.add(sd.id); });
    });
    const chapters = session.mode === 'screen' ? E.chapterSummary(D.graph, session) : null;
    const out = {
      tool: 'cn-math-taxonomy/diagnose', version: 2, mode: session.mode || 'target', generatedAt: new Date().toISOString(),
      note: uiText('内容已经过 AI 审核，但尚未经教师审核。诊断只反映本次已答题目，不代表完整掌握程度或考试成绩。'),
      subject: subject,
      label: sessionMeta.label,
      targets: session.targets.map(brief),
      limit: session.limit, seed: session.seed, avoid: session.avoid, asked: sum.asked, finished: sum.finished, limitReached: sum.limitReached,
      answers: session.answers.map(function (a, i) {
        const q = E.questionById(D.graph, a.qid) || {};
        return {
          order: i + 1, topicId: a.id, name: nameOf(a.id), questionId: a.qid, difficulty: q.difficulty, type: q.type,
          prompt: q.prompt, userAnswer: a.text == null ? null : a.text, result: a.result,
          referenceAnswer: q.answer,
          userAnswerDisplay: a.text == null ? null : (q.type === 'choice' ? answerOfKey(q, a.text) : a.text),
          referenceAnswerDisplay: answerText(q),
          displayedChoices: q.type === 'choice' ? displayChoices(q) : undefined,
          explanation: q.explanation || ''
        };
      }),
      chapters: chapters ? chapters.map(function (c) {
        return {
          label: c.label, total: c.total, mastered: c.mastered, shaky: c.shaky, weak: c.weak, untested: c.untested,
          weakTopics: c.weakIds.map(brief), shakyTopics: c.shakyIds.map(brief), untestedTopics: c.untestedIds.map(brief)
        };
      }) : undefined,
      weakRoots: sum.roots.map(function (r) {
        return Object.assign(brief(r.id), {
          pendingPrereqs: r.pendingPrereqs, outOfScopePrereqs: r.outOfScopePrereqs, externalPrereqs: r.externalPrereqs,
          masteryCriteria: D.graph.byId[r.id].mastery_criteria || [],
          standards: (D.graph.byId[r.id].standards || []).map(function (sd) { return sd.id; })
        });
      }),
      path: sum.path.map(function (p, i) { return Object.assign({ order: i + 1 }, brief(p.id), { status: p.status, isRoot: p.isRoot, isTarget: p.isTarget }); }),
      weak: sum.weak.map(brief),
      shaky: sum.shaky.map(brief),
      mastered: sum.mastered.map(function (id) { return Object.assign(brief(id), { source: session.status[id].src }); }),
      untested: sum.untested.map(function (id) { return Object.assign(brief(id), { external: !!D.graph.byId[id].external }); }),
      standards: Array.from(stdIds).sort().map(function (k) { return { id: k, text: D.stdById[k] ? D.stdById[k].text : '' }; })
    };
    return out;
  }
  function serializeExport() {
    if (exportCache.session !== session || exportCache.label !== sessionMeta.label) exportCache={session:session,label:sessionMeta.label,text:JSON.stringify(buildExport(),null,2)};
    return exportCache.text;
  }
  function exportJson() {
    const blob = new Blob([serializeExport()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'diagnosis-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function printPage() { window.print(); }
  window.addEventListener('beforeprint', function () {
    document.querySelectorAll('details:not([open])').forEach(function (d) { d.setAttribute('open', ''); d.dataset.autoOpen = '1'; });
    if (pathCy) { pathCy.resize(); pathCy.fit(undefined, 20); }
  });
  window.addEventListener('afterprint', function () {
    document.querySelectorAll('details[data-auto-open]').forEach(function (d) { d.removeAttribute('open'); delete d.dataset.autoOpen; });
  });

  /* ------------------------------------------------------------ 启动 */
  function resolveTargets(params) {
    const t = params.get('target');
    if (t) {
      const raw = t.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      const ids = E.resolveTargets(raw, D.aliases);
      const bad = ids.filter(function (id) { return !D.graph.byId[id] || D.graph.byId[id].external; });
      if (bad.length) throw new Error('URL 参数 target 里有无效知识点：' + bad.join(', '));
      const aliased = raw.filter(function (id) { return D.aliases[id]; });
      let label = ids.map(nameOf).join('、');
      if (aliased.length) {
        label = aliased.map(function (id) { return (D.aliases[id].name || id); }).join('、') + '（旧编号已对应到小学知识点）';
        if (ids.length <= 6) label += '：' + ids.map(nameOf).join('、');
      }
      return { ids: ids, label: label };
    }
    const c = params.get('chapter');
    if (c) {
      const hit = [];
      volumeRows().forEach(function (vv) {
        ((D.tree[vv[0]] || {}).chapters || []).forEach(function (ch) { if (ch.key === c.trim()) hit.push(ch); });
      });
      if (!hit.length) throw new Error('URL 参数 chapter 没有匹配的章节：' + c + '（格式如 “七上 第一章”）');
      if (Subjects.merged(subject) && hit.length > 1) return {ids:Array.from(new Set(hit.flatMap(function(ch){return ch.topics.map(function(x){return x.t.id;});}))),label:hit[0].volumeLabel + ' ' + c.trim().split(' ').slice(1).join(' ') + '（全部已收录主题）'};
      return { ids: hit[0].topics.map(function (x) { return x.t.id; }), label: hit[0].volumeLabel + ' ' + hit[0].label + '（整章）' };
    }
    const grade = (params.get('grade') || '').trim();
    const volume = (params.get('volume') || '').trim();
    const requestedModule = params.get('module') || params.get('course');
    const courseScope = requestedModule || volume || grade;
    if (Subjects.academic(subject) || Subjects.mixedScience(subject) && (requestedModule || Subjects.courseFrom(courseScope,subject) || ['all','university','大学'].includes(courseScope))) {
      let requested = courseScope;
      if (requested === 'all' && Subjects.initialScope().member === 'herbal') requested='herbal';
      if (!requested) return null;
      const cs = scopeTargets(requested);
      if (!cs) throw new Error('无法识别 ' + Subjects.names[subject] + ' ' + Subjects.unitLabel(subject) + '：' + requested + '。可用 ' + Subjects.coursesFor(subject).map(function(c){return c.id;}).join('、') + ' 或 all。');
      return {ids:cs.ids,label:cs.label + (Subjects.curriculum(subject) ? '（整体测评）' : '（整体筛查）'),mode:'screen'};
    }
    if (grade || volume) {
      let scope = volume || grade;
      if (Subjects.biogeo(subject)) {
        const gradeMap = {'七':7,'七年级':7,'7':7,'八':8,'八年级':8,'8':8,'高一':10,'高一年级':10,'10':10,'高二':11,'高二年级':11,'11':11,'高三':12,'高三年级':12,'12':12};
        const requestedGrade = gradeMap[grade];
        if (volume && grade && !requestedGrade) throw new Error('无法识别年级：' + grade + '。可只使用 volume 指定教材册次。');
        if (requestedGrade < 10 && /^[上下]$/.test(volume)) scope = ({7:'七',8:'八'}[requestedGrade]) + volume;
        const direct = scopeTargets(scope);
        if (!direct) throw new Error('未找到本学科的年级或册次：' + scope + '。请从教材目录选择，或使用七上、八下、必修一等册次。');
        if (requestedGrade && volume && !direct.ids.every(function(id){return D.graph.byId[id].grade === requestedGrade;})) throw new Error('所选册次与该年级不一致。高中年级仅为建议编排，可只使用 volume 指定教材册次。');
        return {ids:direct.ids,label:direct.label + '（整体筛查）',mode:'screen'};
      }
      // 科学教材按本学科真实册次选取，不复用数学的「高一=必修一」编码。
      if (Subjects.science(subject)) {
        const requestedGrade = {'高一':10,'高二':11,'高三':12,'10':10,'11':11,'12':12}[grade];
        const direct = scopeTargets(scope);
        if (direct && (!requestedGrade || !volume || direct.ids.every(function(id){return D.graph.byId[id].grade === requestedGrade;}))) {
          return {ids:direct.ids,label:direct.label + '（整体筛查）',mode:'screen'};
        }
        if (requestedGrade && volume) throw new Error('所选册次不在该年级的建议编排中。可只使用 volume 指定教材册次。');
      }
      const seniorUrl = {
        '高一': '高一', '高一必修': '高一', '高二': '高二', '高二必修': '高二',
        '选必一': '选必一', '选择性必修第一册': '选必一',
        '选必二': '选必二', '选择性必修第二册': '选必二',
        '选必三': '选必三', '选择性必修第三册': '选必三',
        '选必四': '选必四', '选择性必修第四册': '选必四',
        '必修一': '必修一', '必修第一册': '必修一',
        '必修二': '必修二', '必修第二册': '必修二',
        '必修三': '必修三', '必修第三册': '必修三'
      };
      if (subject === 'math') Object.assign(seniorUrl, {'高等数学':'高等数学','线性代数':'线性代数','概率论与数理统计':'概率论与数理统计','15':'高等数学','16':'线性代数','17':'概率论与数理统计'});
      if (seniorUrl[grade]) {
        if (volume && volume !== '必修' && volume !== '整册' && volume !== '必修整册') {
          throw new Error(subject === 'english'
            ? '高中英语不拆上下册：' + grade + ' / ' + volume + '（用 grade=必修一 或 grade=选必一）'
            : '高中不拆上下册：' + grade + ' / ' + volume + '（用 grade=高一、grade=高二 或 grade=选必二）');
        }
        scope = seniorUrl[grade];
      } else if (grade && volume) {
        const gch = /^[一二三四五六七八九]$/.test(grade) ? grade : grade.charAt(0);
        scope = (volume === '全' || volume === '全一册') ? gch + '全' : (/^[上下]$/.test(volume) ? gch + volume : volume);
        if (scope.charAt(0) !== gch) throw new Error('URL 参数 grade 与 volume 不一致：' + grade + ' / ' + volume);
      }
      if (/^[一二三四五六七八九]$/.test(scope)) scope += '年级';
      const g = scopeTargets(scope);
      if (!g) throw new Error('URL 参数 grade / volume 无法识别：' + (volume || grade) + '（写法如 grade=七年级、volume=七上）');
      return { ids: g.ids, label: g.label + '（整体筛查）', mode: 'screen' };
    }
    return null;
  }

  async function init() {
    subject = detectSubject();
    applySubjectChrome();
    try { await loadData(); } catch (e) {
      clearRoot();
      root.append(h('div', { class: 'card' }, h('h2', { class: 'err', text: '数据加载失败' }),
        h('p', null, String(e.message || e)),
        h('p', null, '请完整解压下载包，不要只移动 HTML 文件；已部署的网页请确认数据资源完整，再刷新重试。')));
      return;
    }
    const params = new URLSearchParams(location.search);
    let resolved = null;
    try { resolved = resolveTargets(params); } catch (e) { renderStart(e.message); return; }
    if (params.get('seed')) seedParam = params.get('seed');
    const paramLimit = parseInt(params.get('limit'), 10);
    const limit = paramLimit > 0 ? paramLimit : undefined;
    if (resolved && params.get('demo')) {
      demo = { oracle: makeOracle(resolved.ids, resolved.mode) };
      session = E.createSession(D.graph, resolved.ids, {
        mode: resolved.mode, limit: limit || (resolved.mode === 'screen' ? getSettings().screenLimit : getSettings().limit),
        seed: seedParam == null ? 'demo' : seedParam
      });
      sessionMeta = { label: resolved.label };
      const step = parseInt(params.get('step'), 10);
      runDemo(step >= 0 ? step : Infinity);
      render();
      return;
    }
    if (resolved) {
      const saved = lsGet(sessionKey());
      const same = saved && JSON.stringify(saved.targets) === JSON.stringify(Array.from(new Set(resolved.ids))) &&
        (saved.mode || 'target') === (resolved.mode || 'target') && (seedParam == null || saved.seed === seedParam);
      if (same) { if (restoreSession(saved)) render(); else renderStart('当前进度不能按新图谱安全恢复，原记录已保留。请下载原记录后自行选择新目标。'); return; }
      startSession(resolved.ids, resolved.label, limit, resolved.mode);
      return;
    }
    renderStart();
  }

  if (window.matchMedia) {
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const relayout = function () {
      if (!session || !document.getElementById('path-cy')) return;
      mountPathGraph(E.summarize(D.graph, session));
    };
    window.addEventListener('themechange', relayout);
    if (scheme.addEventListener) scheme.addEventListener('change', relayout);
    const narrow = window.matchMedia('(max-width: 700px)');
    if (narrow.addEventListener) narrow.addEventListener('change', relayout);
  }

  init();
})();
