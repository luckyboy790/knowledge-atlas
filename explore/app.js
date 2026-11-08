/* 知识图谱浏览：搜索、筛选，以及选中知识点的局部先修图。 */
(function () {
  'use strict';
  function uiText(text) { return Subjects.assessment(text, subject); }

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif';
  var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var TYPE_ZH = {
    conceptual: '概念理解', procedural: '程序性技能', reasoning: '推理证明',
    application: '应用', modeling: '建模'
  };
  var DOMAIN_ORDER = ['数与代数', '图形与几何', '统计与概率', '综合与实践'];

  var topics = [];
  var deps = [];
  var aliases = {};
  var byId = new Map();
  var indexOf = new Map();
  var pre = new Map();
  var post = new Map();
  var stdById = new Map();
  var selected = null;
  var currentAlias = null;
  var stage = '';
  var grade = '';
  var book = '';
  var chapter = '';
  var member = '';
  var domain = '';
  var query = '';
  var aliasHitIds = new Set();
  var subject = 'math';
  var upDepth = 2;
  var ancestorsOpen = false;
  var tipFromTap = false;
  var cy = null;
  var graphToken = 0;
  var dagreReady = false;
  var FOLD_AT = 40;
  var questionsByTopic = new Map();

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (key) {
      var value = a[key];
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (item) { append(node, item); }); return; }
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  function figureEl(svg) {
    if (typeof svg !== 'string' || svg.indexOf('<svg') !== 0) return null;
    if (/<\s*script|foreignObject|<\s*image\b|https?:\/\//i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"', ''))) return null;
    var wrap = el('div', { class: 'q-figure' });
    wrap.innerHTML = svg;
    var node = wrap.querySelector('svg');
    if (!node) return null;
    node.setAttribute('role', 'img');
    node.setAttribute('aria-hidden', 'true');
    node.setAttribute('focusable', 'false');
    return wrap;
  }
  function sampleFigureNodes(topic) {
    var list = questionsByTopic.get(topic.id) || [];
    var q1 = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === topic.id + '_q1') q1 = list[i];
    }
    if (!q1) return [];
    var nodes = [];
    var stem = q1.figure ? figureEl(q1.figure) : null;
    if (stem) nodes.push(stem);
    var choices = q1.choices || [];
    var anyFig = choices.some(function (c) { return c && c.figure; });
    if (!anyFig && !Subjects.isAcademicTopic(topic)) return nodes;
    var box = el('div', { class: 'sample-choices' + (q1.hideChoiceText ? ' fig-icons' : '') });
    choices.forEach(function (c) {
      var hideName = !!(q1.hideChoiceText && c.figure);
      var item = el('div', { class: 'sample-choice' });
      item.append(el('b', { text: hideName ? c.key : (c.key + '.') }));
      if (!hideName) item.append(document.createTextNode(' ' + c.text));
      if (c.figure) {
        var fig = figureEl(c.figure);
        if (fig) item.append(fig);
      }
      box.append(item);
    });
    nodes.push(box);
    return nodes;
  }

  function stageKind(grade) { return Subjects.stageKind(grade, subject); }
  function stageLabel(grade) { return {primary:'小学',junior:'初中',senior:'高中',university:Subjects.academic(subject) ? Subjects.names[subject] : '大学'}[stageKind(grade)]; }
  var EN_BOOK = {
    10: ['必修一', '必修一 · 必修第一册'],
    11: ['必修二', '必修二 · 必修第二册'],
    12: ['必修三', '必修三 · 必修第三册'],
    13: ['选必一', '选必一 · 选择性必修第一册'],
    14: ['选必二', '选必二 · 选择性必修第二册'],
    15: ['选必三', '选必三 · 选择性必修第三册'],
    16: ['选必四', '选必四 · 选择性必修第四册']
  };
  function gradeWord(grade) {
    if (Subjects.academic(subject) || Subjects.mixedScience(subject) && grade >= 50) return Subjects.courseName(grade, subject);
    if (Subjects.science(subject)) return Subjects.scienceGrade(grade);
    if (subject === 'math' && grade >= 15) return {15:'高等数学',16:'线性代数',17:'概率论与数理统计'}[grade] || String(grade);
    if (subject === 'english' && EN_BOOK[grade]) return EN_BOOK[grade][0];
    if (grade === 10) return '高一';
    if (grade === 11) return '高二';
    if (grade === 12) return '选必一';
    if (grade === 13) return '选必二';
    if (grade === 14) return '选必三';
    return CN[grade] + '年级';
  }
  function gradeLabel(topic) {
    if (topic.k12) return Subjects.bookLabel(topic);
    if (Subjects.isAcademicTopic(topic)) return (Subjects.isUniversityTopic(topic) ? '大学' : Subjects.names[subject]) + ' · ' + Subjects.courseName(topic.module || topic.grade, subject);
    if (Subjects.science(subject) && topic.grade >= 10) return Subjects.scienceGrade(topic.grade) + '（建议） · ' + Subjects.bookLabel(topic);
    if (subject === 'math' && topic.grade >= 15) return '大学 · ' + gradeWord(topic.grade);
    if (subject === 'english' && EN_BOOK[topic.grade]) return EN_BOOK[topic.grade][1];
    if (topic.grade === 10) return '高一 · 必修第一册';
    if (topic.grade === 11) return '高二 · 必修第二册';
    if (topic.grade === 12) return '选必一 · 选择性必修第一册';
    if (topic.grade === 13) return '选必二 · 选择性必修第二册';
    if (topic.grade === 14) return '选必三 · 选择性必修第三册';
    if (topic.semester === '全') return CN[topic.grade] + '年级全一册';
    return CN[topic.grade] + '年级' + topic.semester + '册';
  }
  function paint(grade, colors) {
    if (grade <= 6) return { bg: colors.primaryBg, border: colors.primary, cls: 'primary' };
    if (grade <= 9) return { bg: colors.juniorBg, border: colors.junior, cls: 'junior' };
    if (stageKind(grade) === 'university') return {bg:colors.universityBg, border:colors.university, cls:'university'};
    return { bg: colors.seniorBg, border: colors.senior, cls: 'senior' };
  }

  function chapterOf(topic) {
    if (topic.k12) return topic.textbook.chapter;
    if (Subjects.isAcademicTopic(topic)) { var c = Subjects.computingChapter(topic); return c.chapterNo + ' ' + c.chapterName; }
    if (Subjects.biogeo(subject) && topic.textbook) return [topic.textbook.unit, topic.textbook.chapter].filter(Boolean).join(' · ');
    if (Subjects.science(subject) && topic.grade >= 10 && topic.textbook && topic.textbook.chapter) return topic.textbook.chapter;
    var text = topic.chapter || '未分章';
    var primary = /^[一二三四五六七八九]年级[上下全]册\s+(.+)$/.exec(text);
    if (primary) return primary[1];
    var enHs = /^(?:必修第[一二三]册|选择性必修第[一二三四]册) ((?:欢迎单元|第\d+单元) .+)$/.exec(text);
    if (enHs) return enHs[1];
    var model = /^(高[一二]|选必[一二三]) (数学建模|数学探究) (\S+)$/.exec(text);
    if (model) return model[2] + ' ' + model[3];
    var junior = /^\S+\s+(第\S+章)\s+(.+)$/.exec(text);
    if (junior) return junior[1] + ' ' + junior[2].replace(/\s+\d+(?:\.\d+)*$/, '');
    return text;
  }

  function readHash() {
    var hash = location.hash.replace(/^#/, '');
    if (!hash) return '';
    try { hash = decodeURIComponent(hash); } catch (error) { /* 保持原样 */ }
    return hash;
  }

  function resolveId(raw) {
    if (!raw) return null;
    if (byId.has(raw)) return { id: raw, alias: null };
    var spec = aliases[raw];
    if (spec && Array.isArray(spec.targets) && spec.targets.length && byId.has(spec.targets[0])) {
      return {
        id: spec.targets[0],
        alias: { id: raw, name: spec.name || raw, targets: spec.targets.slice() }
      };
    }
    return null;
  }

  function writeHash(id) {
    if (readHash() === id) return;
    history.replaceState(null, '', location.pathname + location.search + '#' + id);
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function theme() {
    return {
      primary: cssVar('--node-primary'),
      primaryBg: cssVar('--node-primary-bg'),
      junior: cssVar('--node-junior'),
      juniorBg: cssVar('--node-junior-bg'),
      university: cssVar('--node-university'), universityBg: cssVar('--node-university-bg'),
      senior: cssVar('--node-senior'),
      seniorBg: cssVar('--node-senior-bg'),
      currentBg: cssVar('--node-current-bg'),
      currentBorder: cssVar('--node-current-border'),
      currentText: cssVar('--node-current-text') || cssVar('--node-text'),
      halo: cssVar('--node-halo') || cssVar('--node-current-border'),
      text: cssVar('--node-text'),
      edge: cssVar('--edge'),
      edgeSoft: cssVar('--edge-soft'),
      edgeNear: cssVar('--edge-near') || cssVar('--edge')
    };
  }

  function restoreDepth() {
    try {
      var saved = sessionStorage.getItem('cnmExplore.depth');
      if (saved === '1' || saved === '2' || saved === '3') upDepth = parseInt(saved, 10);
      else if (saved === 'all') upDepth = 'all';
    } catch (error) { /* 隐私模式 */ }
  }

  function syncControls() {
    document.querySelectorAll('#stage-tabs [data-stage]').forEach(function (button) {
      var on = button.getAttribute('data-stage') === stage;
      button.classList.toggle('on', on);
      button.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('fGrade').value = grade;
    var domainSelect = $('fDomain');
    if (Array.prototype.some.call(domainSelect.options, function (option) { return option.value === domain; })) {
      domainSelect.value = domain;
    }
    if (schoolBookFilters()) { $('fBook').value = book; $('fChapter').value = chapter; }
    syncDepthButtons();
  }

  function syncDepthButtons() {
    var current = upDepth === 'all' ? 'all' : String(upDepth);
    document.querySelectorAll('#depth-switch [data-depth]').forEach(function (button) {
      var on = button.getAttribute('data-depth') === current;
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function closeDrawerIfMobile() {
    if (!window.matchMedia('(max-width: 900px)').matches) return;
    $('side').classList.remove('open');
    var toggle = $('list-toggle');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '知识点目录';
  }

  function recomputeAliasHits() {
    aliasHitIds = new Set();
    if (query.length < 2) return;
    Object.keys(aliases).forEach(function (id) {
      var spec = aliases[id];
      var name = ((spec && spec.name) || '').toLowerCase();
      if (id.toLowerCase().indexOf(query) >= 0 || name.indexOf(query) >= 0) {
        ((spec && spec.targets) || []).forEach(function (target) { aliasHitIds.add(target); });
      }
    });
  }

  function isEnglishTopic(topic) {
    return !!(topic && (topic.subject === 'english' || String(topic.id || '').indexOf('cne_') === 0));
  }

  function withSubject(href) {
    return Subjects.link(href, subject);
  }

  function passFilter(topic) {
    if (stage && Subjects.stageCode(topic.grade, subject) !== stage) return false;
    if (member && Subjects.rawOf(topic) !== member) return false;
    if (grade && String(topic.grade) !== grade) return false;
    if (book && (!topic.textbook || topic.textbook.book !== book)) return false;
    if (chapter) {
      const unit = Subjects.isAcademicTopic(topic) ? Subjects.computingChapter(topic) :
        topic.k12 || subject === 'geography' ? Subjects.scienceChapter(topic) : null;
      if (!unit || unit.volume + ' ' + unit.chapterNo !== chapter) return false;
    }
    if (domain && topic.domain !== domain) return false;
    if (query) {
      var blob = (topic.name + '\n' + topic.description + '\n' + (topic.chapter || '') + '\n' + topic.id + '\n' + topic.domain + (topic.k12 ? '\n' + topic.k12.sourceId + '\n' + Subjects.k12Text(topic.k12.fields.aliases) : '')).toLowerCase();
      if (blob.indexOf(query) < 0 && !aliasHitIds.has(topic.id)) return false;
    }
    return true;
  }

  function renderList() {
    recomputeAliasHits();
    var volumes = [];
    var volumeMap = new Map();
    topics.forEach(function (topic) {
      if (!passFilter(topic)) return;
      var key = Subjects.isAcademicTopic(topic) ? topic.module : Subjects.science(subject) && topic.textbook ? topic.textbook.book : topic.grade + topic.semester;
      var volume = volumeMap.get(key);
      if (!volume) {
        volume = { label: gradeLabel(topic), grade: topic.grade, semester: topic.semester, chapters: [], chapterMap: new Map() };
        volumeMap.set(key, volume);
        volumes.push(volume);
      }
      var chapterKey = chapterOf(topic);
      var chapter = volume.chapterMap.get(chapterKey);
      if (!chapter) {
        chapter = { label: chapterKey, topics: [] };
        volume.chapterMap.set(chapterKey, chapter);
        volume.chapters.push(chapter);
      }
      chapter.topics.push(topic);
    });
    volumes.sort(function (a, b) {
      return a.grade - b.grade || (a.semester === b.semester ? 0 : a.semester === '上' ? -1 : 1);
    });

    var shown = 0;
    var box = $('list');
    box.replaceChildren();
    var filtering = !!(query || grade || stage || domain || book || chapter || member);
    volumes.forEach(function (volume) {
      var count = volume.chapters.reduce(function (sum, chapter) { return sum + chapter.topics.length; }, 0);
      shown += count;
      var volumeHas = volume.chapters.some(function (chapter) {
        return chapter.topics.some(function (topic) { return topic.id === selected; });
      });
      var details = el('details', { class: 'vol tone-' + stageKind(volume.grade) });
      details.open = filtering || volumeHas;
      details.append(el('summary', null,
        el('span', { class: 'vol-dot', 'aria-hidden': 'true' }),
        el('span', { class: 'vol-name', text: volume.label }),
        el('span', { class: 'count-pill', text: ' ' + count })));
      volume.chapters.forEach(function (chapter) {
        var chapterHas = chapter.topics.some(function (topic) { return topic.id === selected; });
        var chapterDetails = el('details', { class: 'chap' });
        chapterDetails.open = !!query || chapterHas;
        chapterDetails.append(el('summary', { text: chapter.label }));
        chapter.topics.forEach(function (topic) {
          chapterDetails.append(el('button', {
            type: 'button',
            class: 'topic-item tone-' + stageKind(topic.grade) + (topic.id === selected ? ' sel' : ''),
            'data-jump': topic.id
          }, el('span', { class: 'nm', text: topic.name }), el('span', { class: 'meta', text: topic.domain })));
        });
        details.append(chapterDetails);
      });
      box.append(details);
    });
    if (!shown) box.append(el('p', { class: 'muted', text: '没有匹配的知识点。', style: 'padding:12px' }));
    $('count').textContent = '显示 ' + shown + ' / ' + topics.length;
  }

  function sideVisible() {
    var side = $('side');
    return side.offsetParent !== null && side.getBoundingClientRect().height > 0;
  }

  function highlight(scroll) {
    document.querySelectorAll('#list .topic-item').forEach(function (button) {
      var on = button.getAttribute('data-jump') === selected;
      button.classList.toggle('sel', on);
      if (on) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    var current = document.querySelector('#list .topic-item.sel');
    if (!current) return;
    var parent = current.parentElement;
    while (parent && parent.id !== 'list') {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
    if (scroll && sideVisible()) current.scrollIntoView({ block: 'nearest' });
  }

  function countReach(map, id) {
    var seen = new Set();
    var stack = [id];
    while (stack.length) {
      var current = stack.pop();
      (map.get(current) || []).forEach(function (edge) {
        if (!seen.has(edge.id)) { seen.add(edge.id); stack.push(edge.id); }
      });
    }
    return seen.size;
  }

  function badge(strength) {
    var hard = strength === 'hard';
    return el('span', { class: 'badge ' + (hard ? 'hard' : 'soft'), text: hard ? '硬先修' : '软先修' });
  }

  function relButton(edge) {
    var other = byId.get(edge.id);
    return el('button', { type: 'button', class: 'rel-row', 'data-jump': edge.id },
      edge.source === 'K12-KGraph' ? el('span',{class:'badge hard',text:'直接先修'}) : badge(edge.strength),
      el('span', { class: 'rel-name', text: other ? other.name : edge.id }),
      el('span', { class: 'rel-where', text: other ? gradeLabel(other) : '' }),
      edge.reason ? el('span', { class: 'why', text: edge.reason }) : null);
  }

  function metaItem(label, value, wide) {
    return el('div', { class: wide ? 'span-2' : '' }, el('dt', { text: label }), el('dd', { text: value || '—' }));
  }

  function renderDetail() {
    var box = $('detail');
    if (!selected || !byId.has(selected)) {
      box.replaceChildren(el('div', { class: 'detail-empty' },
        el('h1', { text: '选择一个知识点' }),
        el('p', { text: Subjects.academic(subject) ? uiText('可以搜索，也可以按课程、学习单元展开。选中之后，中间显示附近的先修关系，包括跨课程的基础知识。') : '可以搜索，也可以按年级、册、章展开。选中之后，中间只画它附近的先修，以及后面一层会用到它的知识点。' })));
      document.title = '知识图谱 · ' + Subjects.names[subject];
      return;
    }
    var topic = byId.get(selected);
    var kind = stageKind(topic.grade);
    var parts = [];
    if (currentAlias) {
      parts.push(el('div', { class: 'alias-note' },
        '旧编号 ', el('code', { text: currentAlias.id }),
        '（' + (currentAlias.name || '未命名') + uiText('）已对应到这个知识点。用该旧编号开始诊断时，会包含映射中的全部 ') + currentAlias.targets.length + ' 个小学知识点。 ',
        el('a', { href: '../diagnose/index.html?target=' + encodeURIComponent(currentAlias.id) }, uiText('按旧编号诊断'))));
    }
    parts.push(el('h1', { class: 'detail-title', text: topic.name }));
    parts.push(el('div', { class: 'pills' },
      el('span', { class: 'pill pill-' + (kind === 'primary' ? 'p' : kind === 'junior' ? 'j' : kind === 'university' ? 'u' : 'h'), text: stageLabel(topic.grade) }),
      el('code', { class: 'id-code', text: topic.id })));
    var diagHref = '../diagnose/index.html?target=' + encodeURIComponent(topic.id);
    if (subject === 'english') diagHref = '../diagnose/index.html?subject=english&target=' + encodeURIComponent(topic.id);
    parts.push(el('a', {
      class: 'btn btn-primary btn-lg diag-btn',
      href: withSubject(diagHref)
    }, uiText('诊断这个知识点')));
    if (!topic.external) parts.push(el('a', {class:'btn diag-btn', href:withSubject('../diagnose/index.html?practice=focus&target=' + encodeURIComponent(topic.id))}, '专项练习'));
    if (subject === 'math' && /^cnm_ps\d+$/.test(topic.id)) {
      var probabilityChapter = /^(\S+ 第\S+章)/.exec(topic.chapter || '');
      parts.push(el('p', {class:'small'},
        probabilityChapter ? el('a',{href:'../diagnose/index.html?chapter=' + encodeURIComponent(probabilityChapter[1])},'以本章为目标') : null,
        probabilityChapter ? ' · ' : '',
        el('a',{href:'../diagnose/index.html?grade=17'},'测评完整课程（含数一方向内容）')));
    }
    if (Subjects.isAcademicTopic(topic)) {
      var unit = Subjects.computingChapter(topic);
      parts.push(el('p',{class:'small'}, el('a',{href:withSubject('../diagnose/index.html?chapter=' + encodeURIComponent(unit.volume + ' ' + unit.chapterNo))},'以本学习单元为目标'), ' · ', el('a',{href:withSubject('../diagnose/index.html?module=' + encodeURIComponent(unit.volume))},'测评本' + Subjects.unitLabel(subject))));
    }
    if ((topic.k12 || Subjects.biogeo(subject)) && topic.textbook) {
      var schoolChapter = Subjects.scienceChapter(topic);
      parts.push(el('p', {class:'small'},
        el('a',{href:withSubject('../diagnose/index.html?chapter=' + encodeURIComponent(schoolChapter.volume + ' ' + schoolChapter.chapterNo))},'以本章为目标'), ' · ',
        el('a',{href:withSubject('../diagnose/index.html?volume=' + encodeURIComponent(topic.textbook.book))},'测评本册已收录知识')));
    }
    parts.push(el('dl', { class: 'meta-grid' },
      metaItem(Subjects.isAcademicTopic(topic) ? Subjects.unitLabel(subject) : '年级册次', gradeLabel(topic)),
      metaItem(topic.k12 ? '教材主题' : '领域', topic.domain),
      metaItem('类型', TYPE_ZH[topic.type] || topic.type),
      metaItem(Subjects.isAcademicTopic(topic) ? '学习单元' : '章节', topic.chapter, true)));
    if (topic.description) parts.push(el('p', { class: 'desc', text: topic.description }));
    if ((Subjects.isAcademicTopic(topic) || Subjects.biogeo(subject) || subject === 'math' && /^cnm_ps\d+$/.test(topic.id)) && topic.epistemic_status) {
      var context = {modern_biomedicine:'现代医学基础',traditional_tcm_theory:'中医药传统理论',modern_pharmaceutical_science:'现代药学与质量科学',evidence_methodology:'证据评价方法',educational_method_in_tcm_context:'中医药课程的学习与辨析方法',historical_philosophical_framework:'传统哲学与历史理论框架',historical_and_evidence_method:'学术史与证据评价方法',historical_traditional_classification:'历史与传统分类体系',modern_physics:'现代物理学',modern_chemistry:'现代化学',modern_mathematics:'现代数学',modern_biology:'现代生物学',modern_geography:'现代地理学'}[topic.epistemic_status];
      if (context) parts.push(el('p',{class:'muted small',text:'知识语境：' + context}));
    }
    if (subject === 'math' && /^cnm_ps\d+$/.test(topic.id) && topic.exam_scope) {
      parts.push(el('section',{class:'textbook-source probability-scope'},
        el('h2',{text:'考研范围说明'}),
        el('p',{text:'备考方向：' + topic.exam_scope.label}),
        el('p',{class:'muted small',text:topic.exam_scope.verification}),
        el('p',{class:'muted small',text:'本课程显示全部已收录知识点，包含数一方向内容；方向标签不等于对 2027 年大纲逐条确认。'}),
        el('a',{href:'../sources.html?subject=math#math-probability'},'查看教材版本、考试依据与范围边界')));
    }
    if (topic.root_reason) parts.push(el('p', { class: 'root-reason', text: topic.root_reason }));

    if (topic.mastery_criteria && topic.mastery_criteria.length) {
      parts.push(el('section', null,
        el('h2', { text: '掌握标准' }),
        el('ul', { class: 'plain' }, topic.mastery_criteria.map(function (item) { return el('li', { text: item }); }))));
    }

    var standards = topic.standards || [];
    var standardNodes = standards.length ? standards.map(function (entry) {
      var item = stdById.get(entry.id);
      return el('div', { class: 'std' },
        el('div', { class: 'std-id' }, el('code', { text: entry.id }), ' · ' + (entry.confidence === 'exact' ? '直接对应' : '推断对应')),
        el('p', { text: item ? item.text : '（课标文件中找不到该条目）' }),
        entry.note ? el('p', { class: 'muted', text: '说明：' + entry.note }) : null);
    }) : [el('p', { class: 'muted', text: '没有对应的课标条目。' })];
    if (topic.k12) {
      const data = topic.k12, fields = data.fields;
      const section = el('section',{class:'textbook-source'},el('h2',{text:'图谱来源'}),
        el('p',{text:Subjects.reference(topic)}), el('p',{class:'muted small',text:'K12-KGraph · ' + data.sourceId}),
        el('a',{href:'../sources.html?subject='+subject+'#k12-kgraph'},'查看人工核验说明与数据许可'));
      if (data.locations.length > 1) section.append(el('details',null,el('summary',{text:'本册收录位置（'+data.locations.length+'）'}),
        data.locations.map(row => el('p',{text:[row[1],row[2]].filter(Boolean).join(' · ')}))));
      for (const [key,label] of [['formula','公式'],['examples','例子'],['phenomena','实验现象'],['conclusion','实验结论']]) {
        if (fields[key]) section.append(el('details',null,el('summary',{text:label}),el('p',{text:Subjects.k12Text(fields[key])})));
      }
      parts.push(section);
      if (data.links.length) {
        const labels = {is_a:['属于','包含'],relates_to:['关联','关联'],verifies:['验证','可由实验验证'],
          cycle:['原图先修指向（循环）','原图先修来自（循环）']};
        parts.push(el('details',null,el('summary',{text:'其他图谱关系（'+data.links.length+'）'}),
          data.links.map(link => el('button',{type:'button',class:'rel-row','data-jump':link.id},
            el('span',{text:labels[link.type][link.out ? 0 : 1]}),el('strong',{text:byId.get(link.id).name})))));
      }
    } else if (topic.textbook) {
      parts.push(el('section', {class:'textbook-source'}, el('h2', {text:'教材依据'}), el('p', {text:Subjects.reference(topic)}), el('a', {href:'../sources.html?subject=' + subject + '#' + topic.textbook.book}, '来源与核对说明'), el('p', {class:'muted',text:'知识摘要与题目为原创整理；先修关系是 AI 提出的学习建议，未经教师审核。'}), Subjects.biogeo(subject) ? el('p',{class:'muted small',text:typeof topic.textbook.verification === 'string' ? topic.textbook.verification : '逐册核验范围及尚未取得的材料见来源页。'}) : null));
    } else parts.push(el('section', null, el('h2', { text: '课标条目' }), standardNodes));

    if (topic.diagnostic_question && topic.diagnostic_question.question) {
      var answer = el('details', { class: 'ans' });
      answer.append(el('summary', { text: '查看答案' }), el('p', { text: topic.diagnostic_question.answer || '' }));
      parts.push(el('section', null,
        el('h2', { text: '样题' }),
        el('p', { class: 'sample-q', text: topic.diagnostic_question.question }),
        sampleFigureNodes(topic),
        answer));
    }

    var pres = pre.get(topic.id) || [];
    parts.push(el('section', null,
      el('h2', { text: '先修' }),
      el('p', { class: 'muted', text: '直接 ' + pres.length + ' 个，全部上游 ' + countReach(pre, topic.id) + ' 个。图上默认只画向上 2 层；选「全部」且超过 ' + FOLD_AT + ' 个时先按' + (Subjects.academic(subject) ? Subjects.unitLabel(subject) : '年级') + '收起。' }),
      pres.length ? pres.map(relButton) : el('p', { text: topic.k12 ? 'K12-KGraph 未列出可用于诊断的直接先修。' : '这是起点，没有更早的先修。' })));

    var posts = post.get(topic.id) || [];
    parts.push(el('section', null,
      el('h2', { text: '被哪些知识点依赖' }),
      el('p', { class: 'muted', text: '直接 ' + posts.length + ' 个，全部下游 ' + countReach(post, topic.id) + ' 个。图上只画向下 1 层。' }),
      posts.length ? posts.map(relButton) : el('p', { text: '还没有后续知识点依赖它。' })));

    box.replaceChildren.apply(box, parts);
    document.title = topic.name + ' · 知识图谱';
  }

  function upstream(id, depth) {
    var seen = new Set([id]);
    var frontier = [id];
    var limit = depth === Infinity ? 10000 : depth;
    for (var step = 0; step < limit; step++) {
      var next = [];
      frontier.forEach(function (current) {
        (pre.get(current) || []).forEach(function (edge) {
          if (!seen.has(edge.id)) { seen.add(edge.id); next.push(edge.id); }
        });
      });
      if (!next.length) break;
      frontier = next;
    }
    return seen;
  }

  function labelLimit() {
    return window.matchMedia('(max-width: 700px)').matches ? 8 : 10;
  }

  function clipLabel(name) {
    var chars = Array.from(name || '');
    var limit = labelLimit();
    if (chars.length <= limit) return name || '';
    return chars.slice(0, limit - 1).join('') + '…';
  }

  function hideTip() {
    var tip = $('node-tip');
    if (tip) tip.hidden = true;
  }

  function showTip(node) {
    var tip = $('node-tip');
    var stage = $('graph-stage');
    if (!tip || !stage || !cy || !node || node.empty()) return;
    var text = node.data('full') || node.data('label') || '';
    if (!text) { tip.hidden = true; return; }
    tip.textContent = text;
    tip.hidden = false;
    var stageRect = stage.getBoundingClientRect();
    var cyRect = cy.container().getBoundingClientRect();
    var bb = node.renderedBoundingBox({ includeLabels: true });
    var tipW = tip.offsetWidth;
    var tipH = tip.offsetHeight;
    var cx = cyRect.left - stageRect.left + (bb.x1 + bb.x2) / 2;
    var top = cyRect.top - stageRect.top + bb.y1;
    var left = Math.max(8, Math.min(cx - tipW / 2, Math.max(8, stageRect.width - tipW - 8)));
    var y = top - tipH - 8;
    if (y < 4) y = cyRect.top - stageRect.top + bb.y2 + 8;
    if (y + tipH > stageRect.height - 4) y = Math.max(4, stageRect.height - tipH - 4);
    tip.style.left = left + 'px';
    tip.style.top = y + 'px';
  }

  function ensureDagre() {
    if (dagreReady) return;
    if (!window.cytoscape || !window.dagre || !window.cytoscapeDagre) {
      throw new Error('图形库没有加载');
    }
    window.cytoscape.use(window.cytoscapeDagre);
    dagreReady = true;
  }

  function topicElement(id, colors) {
    var topic = byId.get(id);
    var tone = paint(topic.grade, colors);
    var current = id === selected;
    var name = topic.name;
    return {
      data: {
        id: id,
        name: name,
        full: name,
        label: clipLabel(name),
        bg: current ? colors.currentBg : tone.bg,
        border: current ? colors.currentBorder : tone.border,
        color: current ? colors.currentText : colors.text
      },
      classes: tone.cls + (current ? ' current' : '')
    };
  }

  function edgeElement(id, source, target, soft, colors) {
    return {
      data: {
        id: id,
        source: source,
        target: target,
        color: soft ? colors.edgeSoft : colors.edge
      },
      classes: soft ? 'soft' : 'hard'
    };
  }

  function updateFold(total, folded) {
    var box = $('graph-fold');
    if (upDepth !== 'all' || total <= FOLD_AT) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    box.hidden = false;
    if (folded) {
      box.replaceChildren(
        document.createTextNode('祖先较多，已按' + (Subjects.academic(subject) ? Subjects.unitLabel(subject) : '年级') + '收起。'),
        el('button', { type: 'button', id: 'btn-expand-all', 'data-total': String(total), text: '共 ' + total + ' 个，点此展开全部' })
      );
    } else {
      box.replaceChildren(
        document.createTextNode('已展开全部 ' + total + ' 个知识点。'),
        el('button', { type: 'button', id: 'btn-collapse-all', text: Subjects.academic(subject) ? '按' + Subjects.unitLabel(subject) + '收起' : '按年级收起' })
      );
    }
  }

  function buildFoldedElements(nodeSet, colors) {
    var downIds = {};
    (post.get(selected) || []).forEach(function (edge) { downIds[edge.id] = edge.strength; });
    var gradeMembers = new Map();
    nodeSet.forEach(function (id) {
      if (id === selected || downIds[id]) return;
      var grade = byId.get(id).grade;
      if (!gradeMembers.has(grade)) gradeMembers.set(grade, []);
      gradeMembers.get(grade).push(id);
    });
    var gradeOf = new Map();
    var elements = [];
    gradeMembers.forEach(function (ids, grade) {
      var tone = paint(grade, colors);
      var word = gradeWord(grade);
      var name = word + '·' + ids.length + '个';
      ids.forEach(function (id) { gradeOf.set(id, grade); });
      elements.push({
        data: {
          id: 'grade-' + grade,
          name: name,
          full: word + '的 ' + ids.length + ' 个先修',
          label: clipLabel(name),
          bg: tone.bg,
          border: tone.border,
          color: colors.text
        },
        classes: tone.cls + ' grade'
      });
    });
    elements.push(topicElement(selected, colors));
    Object.keys(downIds).forEach(function (id) {
      if (nodeSet.has(id)) elements.push(topicElement(id, colors));
    });
    var between = new Map();
    deps.forEach(function (edge) {
      var fromG = gradeOf.get(edge.prerequisiteId);
      var toG = gradeOf.get(edge.topicId);
      if (fromG == null || toG == null || fromG === toG) return;
      var key = fromG + '>' + toG;
      if (edge.strength !== 'soft') between.set(key, 'hard');
      else if (!between.has(key)) between.set(key, 'soft');
    });
    between.forEach(function (kind, key) {
      var parts = key.split('>');
      elements.push(edgeElement('g-' + parts[0] + '-' + parts[1], 'grade-' + parts[0], 'grade-' + parts[1], kind === 'soft', colors));
    });
    var into = new Map();
    (pre.get(selected) || []).forEach(function (edge) {
      var grade = gradeOf.get(edge.id);
      if (grade == null) return;
      if (edge.strength !== 'soft') into.set(grade, 'hard');
      else if (!into.has(grade)) into.set(grade, 'soft');
    });
    into.forEach(function (kind, grade) {
      elements.push(edgeElement('gs' + grade, 'grade-' + grade, selected, kind === 'soft', colors));
    });
    Object.keys(downIds).forEach(function (id) {
      if (!nodeSet.has(id)) return;
      elements.push(edgeElement('sd-' + id, selected, id, downIds[id] === 'soft', colors));
    });
    return elements;
  }

  function buildFullElements(nodeSet, colors) {
    var elements = [];
    nodeSet.forEach(function (id) { elements.push(topicElement(id, colors)); });
    deps.forEach(function (edge, edgeIndex) {
      if (!nodeSet.has(edge.topicId) || !nodeSet.has(edge.prerequisiteId)) return;
      elements.push(edgeElement('e' + edgeIndex, edge.prerequisiteId, edge.topicId, edge.strength === 'soft', colors));
    });
    return elements;
  }

  function renderGraph() {
    var token = ++graphToken;
    tipFromTap = false;
    hideTip();
    if (cy) { cy.destroy(); cy = null; window.__cy = null; }
    var cyEl = $('cy');
    var emptyEl = $('graph-empty');
    var meta = $('graph-meta');
    if (!selected || !byId.has(selected)) {
      cyEl.hidden = true;
      cyEl.dataset.ready = '0';
      cyEl.dataset.mode = '';
      cyEl.dataset.total = '';
      emptyEl.hidden = false;
      meta.textContent = '';
      updateFold(0, false);
      return;
    }
    var depth = upDepth === 'all' ? Infinity : upDepth;
    var upSet = upstream(selected, depth);
    var nodeSet = new Set(upSet);
    (post.get(selected) || []).forEach(function (edge) { nodeSet.add(edge.id); });
    var total = nodeSet.size;
    var folded = upDepth === 'all' && total > FOLD_AT && !ancestorsOpen;
    var edgeCount = 0;
    if (!folded) {
      deps.forEach(function (edge) {
        if (nodeSet.has(edge.topicId) && nodeSet.has(edge.prerequisiteId)) edgeCount++;
      });
    }
    var depthLabel = upDepth === 'all' ? '全部祖先' : (upDepth + ' 层');
    var note = '长名称会省略，悬停或点按可看全名。';
    if (folded) meta.textContent = '已按' + (Subjects.academic(subject) ? Subjects.unitLabel(subject) : '年级') + '收起，全部 ' + total + ' 个知识点。向上 ' + depthLabel + '，向下 1 层。' + note;
    else meta.textContent = '局部图 ' + total + ' 个知识点、' + edgeCount + ' 条先修。向上 ' + depthLabel + '，向下 1 层。' + note;
    updateFold(total, folded);
    cyEl.hidden = false;
    emptyEl.hidden = true;
    cyEl.dataset.ready = '0';
    cyEl.dataset.mode = folded ? 'grade' : 'full';
    cyEl.dataset.total = String(total);
    var heavy = !folded && total > 80;
    if (heavy) meta.textContent = '正在排列全部 ' + total + ' 个知识点…';

    var kick = heavy ? function (fn) { setTimeout(fn, 40); } : requestAnimationFrame;
    kick(function () {
      if (token !== graphToken) return;
      try {
        ensureDagre();
        if (cyEl.clientHeight < 40) cyEl.style.minHeight = '420px';
        var colors = theme();
        var narrow = labelLimit() <= 8;
        var textMax = narrow ? 104 : 126;
        var boxW = narrow ? 118 : 142;
        var elements = folded ? buildFoldedElements(nodeSet, colors) : buildFullElements(nodeSet, colors);
        var dense = heavy;
        var cyOptions = {
          container: cyEl,
          elements: elements,
          // 大图若缩到能塞进一屏，节点只剩几个像素，Cytoscape 会改画整图贴图，画面基本是空的。
          minZoom: heavy ? 0.5 : 0.05,
          maxZoom: 2.8,
          wheelSensitivity: 0.28,
          boxSelectionEnabled: false,
          autoungrabify: true,
          userPanningEnabled: true,
          userZoomingEnabled: true
        };
        cyOptions.style = [
          { selector: 'node', style: {
            label: 'data(label)', 'text-wrap': 'ellipsis', 'text-max-width': textMax + 'px',
            'text-overflow-wrap': 'anywhere',
            'text-valign': 'center', 'text-halign': 'center',
            'font-size': 12.5, 'font-weight': 600, 'font-family': FONT, color: 'data(color)',
            'background-color': 'data(bg)', 'border-width': 1.5, 'border-color': 'data(border)',
            shape: 'round-rectangle', width: boxW, height: 36, padding: 0, 'corner-radius': 10,
            'overlay-shape': 'round-rectangle', 'overlay-corner-radius': 12, 'overlay-padding': 4
          } },
          { selector: 'node.grade', style: { 'border-style': 'dashed' } },
          { selector: 'node.current', style: {
            'border-width': 0, 'z-index': 10, 'font-weight': 700,
            'outline-width': 6, 'outline-color': colors.halo, 'outline-opacity': 0.13, 'outline-offset': 2
          } },
          { selector: 'edge', style: {
            width: 1.25, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle', 'curve-style': dense ? 'straight' : 'bezier',
            'arrow-scale': 0.75, 'line-style': 'solid'
          } },
          { selector: 'edge.soft', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 4], width: 1.2 } },
          { selector: 'edge.near', style: { width: 1.7, 'line-color': colors.edgeNear, 'target-arrow-color': colors.edgeNear, 'z-index': 5 } }
        ];
        cy = window.cytoscape(cyOptions);
        window.__cy = cy;
        var focusNode = cy.getElementById(selected);
        if (focusNode && !focusNode.empty()) focusNode.connectedEdges().addClass('near');
        cy.on('mouseover', 'node', function (event) { showTip(event.target); cy.container().style.cursor = 'pointer'; });
        cy.on('mouseout', 'node', function () { cy.container().style.cursor = ''; if (!tipFromTap) hideTip(); });
        cy.on('tap', 'node', function (event) {
          var id = event.target.id();
          tipFromTap = true;
          showTip(event.target);
          if (!id || String(id).indexOf('grade-') === 0 || id === selected) return;
          select(id, 'user');
        });
        cy.on('tap', function (event) {
          if (event.target === cy) { tipFromTap = false; hideTip(); }
        });
        var layout = cy.layout({
          name: 'dagre', rankDir: 'TB',
          rankSep: dense ? 48 : 64,
          nodeSep: dense ? 18 : 26,
          edgeSep: dense ? 8 : 12,
          ranker: dense ? 'longest-path' : 'network-simplex',
          padding: 16, animate: false, fit: true,
          nodeDimensionsIncludeLabels: false, spacingFactor: dense ? 1.02 : 1.05
        });
        layout.one('layoutstop', function () {
          if (token !== graphToken) return;
          requestAnimationFrame(function () {
            if (token !== graphToken || !cy) return;
            cy.resize();
            cy.fit(undefined, dense ? 24 : 28);
            var framed = false;
            if (heavy && cy.zoom() < 0.72) {
              cy.zoom(0.85);
              var focus = cy.getElementById(selected);
              if (focus && !focus.empty()) cy.center(focus);
              framed = true;
            }
            if (!folded) {
              meta.textContent = '局部图 ' + total + ' 个知识点、' + edgeCount + ' 条先修。向上 ' + depthLabel + '，向下 1 层。'
                + (framed ? '已对准当前知识点，可拖动查看其余节点。' : '')
                + note;
            }
            cyEl.dataset.ready = '1';
          });
        });
        layout.run();
      } catch (error) {
        cyEl.dataset.ready = 'err';
        meta.textContent = '图没有画出来：' + (error && error.message ? error.message : error);
      }
    });
  }

  function select(raw, source) {
    var hit = resolveId(raw);
    if (!hit) {
      if (source === 'hash') {
        $('detail').replaceChildren(el('div', { class: 'detail-empty' },
          el('h1', { text: '没有这个知识点' }),
          el('p', { text: '编号「' + raw + '」不在图谱里，也不是已登记的旧编号。' })));
      }
      return;
    }
    var same = hit.id === selected && !currentAlias && !hit.alias;
    if (hit.id !== selected) ancestorsOpen = false;
    selected = hit.id;
    currentAlias = source === 'user' ? null : hit.alias;
    if (source === 'user') {
      writeHash(selected);
      closeDrawerIfMobile();
    }
    highlight(true);
    renderDetail();
    if (!same) renderGraph();
  }

  function zoomBy(factor) {
    if (!cy) return;
    var rect = cy.container().getBoundingClientRect();
    cy.zoom({
      level: Math.max(cy.minZoom(), Math.min(cy.maxZoom(), cy.zoom() * factor)),
      renderedPosition: { x: rect.width / 2, y: rect.height / 2 }
    });
  }

  function showLoadError(message) {
    $('count').textContent = '';
    $('list').replaceChildren(el('p', { class: 'muted', text: message, style: 'padding:12px' }));
    $('detail').replaceChildren(el('div', { class: 'detail-empty' },
      el('h1', { text: '数据没有加载成功' }),
      el('p', { text: message })));
    $('graph-meta').textContent = '';
  }

  function fillDomain() {
    var seen = {};
    topics.forEach(function (topic) { if (topic.domain) seen[topic.domain] = true; });
    var names = DOMAIN_ORDER.filter(function (name) { return seen[name]; });
    Object.keys(seen).forEach(function (name) { if (names.indexOf(name) < 0) names.push(name); });
    var select = $('fDomain');
    names.forEach(function (name) { select.append(el('option', { value: name, text: name })); });
    if (domain && !seen[domain]) domain = '';
  }

  function schoolBookFilters() { return Subjects.usesK12(subject) || subject === 'geography'; }
  function fillBookFilters() {
    if (!schoolBookFilters()) return;
    var books = new Map();
    topics.forEach(function(t){ if ((t.k12 || subject === 'geography') && !books.has(t.textbook.book)) books.set(t.textbook.book, Subjects.bookLabel(t)); });
    var select = $('fBook');
    select.replaceChildren(el('option',{value:'',text:'全部教材册次'}));
    books.forEach(function(label,id){ select.append(el('option',{value:id,text:label})); });
    if (book && !books.has(book)) book = '';
    var chapters = new Map();
    topics.forEach(function(t){
      if (!book || !t.textbook || t.textbook.book !== book) return;
      var c = Subjects.scienceChapter(t), key = c.volume + ' ' + c.chapterNo;
      if (!chapters.has(key)) chapters.set(key,[t.textbook.unit,t.textbook.chapter].filter(Boolean).join(' · '));
    });
    var chapterSelect = $('fChapter');
    chapterSelect.replaceChildren(el('option',{value:'',text:book ? '全部章节' : '先选教材册次'}));
    chapters.forEach(function(label,key){ chapterSelect.append(el('option',{value:key,text:label})); });
    if (book && chapter && !chapters.has(chapter)) chapter = '';
    chapterSelect.disabled = !book;
    select.value = book; chapterSelect.value = chapter;
  }

  function readSubject() { return Subjects.read(); }

  function configureSubject() {
    if (subject === 'tcm') {
      var family = el('select', {id:'fMember','aria-label':'中医药课程组'}, el('option',{value:'',text:'中医药全部课程'}), el('option',{value:'tcm',text:'中医四门基础课程'}), el('option',{value:'herbal',text:'中药六门核心课程'}));
      $('fGrade').parentElement.append(family);
      family.addEventListener('change',function(){member=family.value;grade='';$('fGrade').value='';renderList();highlight(false);});
    }
    document.querySelectorAll('.university-legend').forEach(function(e){e.hidden = subject !== 'math' && !Subjects.academic(subject) && !Subjects.mixedScience(subject); if (Subjects.academic(subject)) { e.replaceChildren(el('i',{class:'swatch sw-u'}), document.createTextNode(Subjects.names[subject])); } });
    document.body.classList.toggle('subject-english', subject === 'english');
    document.querySelectorAll('.site-nav a:not(.subject-link), a.brand, .site-footer a[href="../sources.html"]').forEach(function (link) {
      var href = link.getAttribute('href');
      var next = withSubject(href);
      if (next && next !== href) link.setAttribute('href', next);
    });
    document.querySelectorAll('.subject-link').forEach(function (link) {
      var on = link.getAttribute('data-subject') === subject;
      link.classList.toggle('on', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (schoolBookFilters()) $('book-filter-row').hidden = false;
    if (Subjects.academic(subject)) {
      document.title = '知识图谱 · ' + Subjects.names[subject];
      $('stage-tabs').setAttribute('aria-label',Subjects.unitLabel(subject));
      document.querySelectorAll('#stage-tabs [data-stage]').forEach(function(b) { b.hidden = b.dataset.stage !== ''; if (!b.hidden) b.textContent = Subjects.names[subject] + ' 全部' + Subjects.unitLabel(subject); });
      document.querySelectorAll('.legend .swatch:not(.sw-u)').forEach(function(i) { if (i.parentElement) i.parentElement.hidden = true; });
      var csSelect = $('fGrade');
      csSelect.setAttribute('aria-label', Subjects.unitLabel(subject));
      csSelect.replaceChildren(el('option',{value:'',text:'全部'+Subjects.unitLabel(subject)}));
      Subjects.coursesFor(subject).forEach(function(c) { csSelect.append(el('option',{value:String(c.grade),text:c.name})); });
      $('q').placeholder = Subjects.specs[subject].search;
      $('pick-sample').textContent = '先看看「' + Subjects.specs[subject].demoName + '」';
      return;
    }
    if (Subjects.science(subject)) {
      document.title = '知识图谱 · ' + Subjects.names[subject];
      document.querySelectorAll('#stage-tabs [data-stage]').forEach(function(b){b.hidden = b.dataset.stage !== '' && b.dataset.stage !== 'j' && b.dataset.stage !== 'h' && !(Subjects.mixedScience(subject) && b.dataset.stage === 'u');});
      var gs = $('fGrade');
      gs.replaceChildren(el('option',{value:'',text:Subjects.mixedScience(subject) ? '全部年级与大学模块' : '全部年级'}));
      Subjects.specs[subject].grades.forEach(function(g){gs.append(el('option',{value:String(g),text:Subjects.scienceGrade(g) + (g >= 10 ? '（建议编排）' : '')}));});
      Subjects.coursesFor(subject).forEach(function(c){gs.append(el('option',{value:String(c.grade),text:'大学 · ' + c.name}));});
      $('q').placeholder = Subjects.specs[subject].search;
      $('pick-sample').textContent = '先看看「' + Subjects.specs[subject].demoName + '」';

      return;
    }
    if (subject !== 'english') return;
    var tabs = document.querySelectorAll('#stage-tabs [data-stage]');
    var spec = [['', '全部'], ['p', '小学'], ['j', '初中'], ['h', '高中']];
    tabs.forEach(function (button, index) {
      if (index < spec.length) {
        button.setAttribute('data-stage', spec[index][0]);
        button.textContent = spec[index][1];
        button.hidden = false;
      } else {
        button.hidden = true;
      }
    });
    $('stage-tabs').setAttribute('aria-label', '学段');
    var gradeSelect = $('fGrade');
    gradeSelect.replaceChildren();
    gradeSelect.append(el('option', { value: '', text: '全部年级' }));
    [3, 4, 5, 6, 7, 8, 9].forEach(function (g) {
      gradeSelect.append(el('option', { value: String(g), text: CN[g] + '年级' }));
    });
    [
      [10, '必修第一册'], [11, '必修第二册'], [12, '必修第三册'],
      [13, '选择性必修第一册'], [14, '选择性必修第二册'],
      [15, '选择性必修第三册'], [16, '选择性必修第四册']
    ].forEach(function (row) {
      gradeSelect.append(el('option', { value: String(row[0]), text: row[1] }));
    });
    var sample = $('pick-sample');
    if (sample) sample.textContent = '先看看「现在进行时」';
    document.title = '知识图谱 · 英语';
  }

  function applyQuery() {
    var params = new URLSearchParams(location.search), initial = Subjects.initialScope();
    member = subject === 'tcm' && ['tcm','herbal'].indexOf(params.get('member')) >= 0 ? params.get('member') : initial.member;
    if ($('fMember')) $('fMember').value = member;
    if (schoolBookFilters()) {
      chapter = params.get('chapter') || '';
      book = params.get('volume') || (chapter ? chapter.split(' ')[0] : '');
    }
    if (Subjects.academic(subject) || Subjects.mixedScience(subject)) chapter = params.get('chapter') || '';
    var requestedCourse = params.get('module') || params.get('course') || params.get('volume') || params.get('grade') || (chapter ? chapter.split(' ')[0] : '');
    var course = Subjects.courseFrom(requestedCourse, subject);
    if (Subjects.mixedScience(subject) && (params.get('module') === 'all' || params.get('course') === 'all')) stage='u';
    if (course && (Subjects.academic(subject) || Subjects.mixedScience(subject))) {
      book = '';
      grade = String(course.grade);
      member = ''; if ($('fMember')) $('fMember').value='';
      if (Subjects.mixedScience(subject)) stage = 'u';
    } else if (Subjects.academic(subject)) grade = '';
    else {
      var gradeValue = params.get('grade') || '';
      var valid = subject === 'english' ? /^(?:[3-9]|1[0-6])$/ : subject === 'math' ? /^(?:[1-9]|1[0-7])$/ : /^(?:[7-9]|1[0-2])$/;
      if (valid.test(gradeValue)) grade = gradeValue;
      if (Subjects.science(subject) && grade && !Subjects.specs[subject].grades.map(String).includes(grade)) grade = '';
    }
    var stageValue = params.get('stage') || initial.stage;
    if (['p','j','h','u'].indexOf(stageValue) >= 0 && !Subjects.academic(subject)) stage = stageValue;
    if (Subjects.science(subject) && stage !== 'j' && stage !== 'h' && !(Subjects.mixedScience(subject) && stage === 'u')) stage = '';
    if (subject === 'english' && stage === 'u') stage = '';
    domain = params.get('domain') || '';
  }

  function bootSelection() {
    var hash = readHash() || new URLSearchParams(location.search).get('target');
    if (hash && resolveId(hash)) { select(hash, 'hash'); return; }
    if (hash && Subjects.usesK12(subject)) {
      renderDetail();
      $('detail').prepend(el('p',{class:'alias-note',text:'当前图谱找不到此编号。请按知识点名称搜索，或从教材册次重新选择。'}));
      renderGraph();
      return;
    }
    if (grade || book || chapter) {
      var first = topics.filter(passFilter)[0];
      if (first) { select(first.id, 'user'); return; }
    }
    renderDetail();
    renderGraph();
  }

  function bind() {
    $('q').addEventListener('input', function () {
      query = $('q').value.trim().toLowerCase();
      renderList();
      highlight(false);
    });
    $('stage-tabs').addEventListener('click', function (event) {
      var button = event.target.closest('[data-stage]');
      if (!button || button.hidden) return;
      stage = button.getAttribute('data-stage');
      if (!schoolBookFilters()) chapter='';
      if (schoolBookFilters()) { book = ''; chapter = ''; fillBookFilters(); }
      if (subject === 'english') {
        var enGrade = parseInt(grade, 10);
        if (stage === 'p' && enGrade >= 7) grade = '';
        if (stage === 'j' && (enGrade <= 6 || enGrade >= 10)) grade = '';
        if (stage === 'h' && enGrade > 0 && enGrade <= 9) grade = '';
        syncControls();
        renderList();
        highlight(false);
        return;
      }
      var gradeNumber = parseInt(grade, 10);
      if (stage === 'p' && gradeNumber >= 7) grade = '';
      if (stage === 'j' && (gradeNumber <= 6 || gradeNumber >= 10)) grade = '';
      if (stage === 'h' && (gradeNumber <= 9 || gradeNumber >= 15)) grade = '';
      if (stage === 'u' && gradeNumber < 15) grade = '';
      syncControls();
      renderList();
      highlight(false);
    });
    $('fGrade').addEventListener('change', function () {
      grade = $('fGrade').value;
      if (!schoolBookFilters()) chapter='';
      if (grade && member) { member=''; if ($('fMember')) $('fMember').value=''; }
      if (schoolBookFilters()) { book = ''; chapter = ''; fillBookFilters(); }
      if (subject === 'english') {
        var enGrade = parseInt(grade, 10);
        if (enGrade >= 3 && enGrade <= 6 && (stage === 'j' || stage === 'h')) stage = 'p';
        if (enGrade >= 7 && enGrade <= 9 && (stage === 'p' || stage === 'h')) stage = 'j';
        if (enGrade >= 10 && (stage === 'p' || stage === 'j')) stage = 'h';
        syncControls();
        renderList();
        highlight(false);
        return;
      }
      var gradeNumber = parseInt(grade, 10);
      if (gradeNumber >= 1 && gradeNumber <= 6 && stage) stage = 'p';
      if (gradeNumber >= 7 && gradeNumber <= 9 && stage) stage = 'j';
      if (gradeNumber >= 10 && gradeNumber <= 14 && stage) stage = 'h';
      if (Subjects.stageKind(gradeNumber, subject) === 'university' && gradeNumber && stage) stage = 'u';
      syncControls();
      renderList();
      highlight(false);
    });
    $('fDomain').addEventListener('change', function () {
      domain = $('fDomain').value;
      renderList();
      highlight(false);
    });
    if (schoolBookFilters()) {
      $('fBook').addEventListener('change', function(){
        book = $('fBook').value; chapter = ''; grade = ''; stage = '';
        fillBookFilters(); syncControls(); renderList(); highlight(false);
      });
      $('fChapter').addEventListener('change', function(){
        chapter = $('fChapter').value; renderList(); highlight(false);
      });
    }
    $('depth-switch').addEventListener('click', function (event) {
      var button = event.target.closest('[data-depth]');
      if (!button) return;
      var value = button.getAttribute('data-depth');
      upDepth = value === 'all' ? 'all' : parseInt(value, 10);
      ancestorsOpen = false;
      try { sessionStorage.setItem('cnmExplore.depth', value); } catch (error) { /* 忽略 */ }
      syncDepthButtons();
      renderGraph();
    });
    $('graph-fold').addEventListener('click', function (event) {
      if (event.target.closest('#btn-expand-all')) ancestorsOpen = true;
      else if (event.target.closest('#btn-collapse-all')) ancestorsOpen = false;
      else return;
      renderGraph();
    });
    $('list-toggle').addEventListener('click', function () {
      var open = $('side').classList.toggle('open');
      $('list-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
      $('list-toggle').textContent = open ? '收起目录' : '知识点目录';
    });
    $('btn-fit').addEventListener('click', function () {
      if (!cy) return;
      cy.resize();
      var many = cy.nodes().length > 80;
      if (many) cy.minZoom(0.5);
      cy.fit(undefined, 36);
      if (many && cy.zoom() < 0.5) {
        cy.zoom(0.5);
        cy.center();
      }
    });
    $('btn-zoom-in').addEventListener('click', function () { zoomBy(1.25); });
    $('btn-zoom-out').addEventListener('click', function () { zoomBy(0.8); });
    $('pick-sample').addEventListener('click', function () {
      if (Subjects.science(subject) || Subjects.academic(subject)) { select(Subjects.specs[subject].demo, 'user'); return; }
      if (subject === 'english') {
        var hit = topics.find(function (topic) { return String(topic.name).indexOf('现在进行时') >= 0; });
        if (hit) select(hit.id, 'user');
        return;
      }
      select('cnm_221', 'user');
    });
    document.body.addEventListener('click', function (event) {
      var jump = event.target.closest('[data-jump]');
      if (!jump) return;
      select(jump.getAttribute('data-jump'), 'user');
    });
    window.addEventListener('hashchange', function () {
      var hash = readHash();
      if (hash) select(hash, 'hash');
    });
    if (window.ResizeObserver) {
      new ResizeObserver(function () { if (cy) cy.resize(); }).observe($('cy'));
    }
    window.addEventListener('themechange', function () { if (selected) renderGraph(); });
    var colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (colorScheme.addEventListener) {
      colorScheme.addEventListener('change', function () { if (selected) renderGraph(); });
    }
    var narrow = window.matchMedia('(max-width: 700px)');
    if (narrow.addEventListener) {
      narrow.addEventListener('change', function () { if (selected) renderGraph(); });
    }
  }

  async function loadQuestions() {
    questionsByTopic = new Map();
    try {
      var response = await Subjects.fetch('../data/' + Subjects.data('questions.json', subject), subject);
      if (!response.ok) return;
      var rows = await response.json();
      if (!Array.isArray(rows)) return;
      rows.forEach(function (q) {
        if (!q || !q.topicId) return;
        var bucket = questionsByTopic.get(q.topicId);
        if (!bucket) questionsByTopic.set(q.topicId, bucket = []);
        bucket.push(q);
      });
    } catch (e) { /* 题库读不到时，样题只显示原来的文字 */ }
  }

  async function load() {
    var files = ['topics.json', 'dependencies.json', 'id-aliases.json', 'cn-curriculum-standards.json'];
    var responses = await Promise.all(files.map(function (file) { return Subjects.fetch('../data/' + Subjects.data(file, subject), subject); }));
    responses.forEach(function (response, responseIndex) {
      if (!response.ok) throw new Error(files[responseIndex] + ' HTTP ' + response.status);
    });
    var json = await Promise.all(responses.map(function (response) { return response.json(); }));
    topics = json[0].filter(function (topic) { return Subjects.of(topic) === subject; });
    var allow = {};
    topics.forEach(function (topic) { allow[topic.id] = true; });
    deps = json[1].filter(function (edge) { return allow[edge.topicId] && allow[edge.prerequisiteId]; });
    aliases = (json[2] && json[2].aliases) || {};
    (json[3].items || []).forEach(function (item) { stdById.set(item.id, item); });
    topics.forEach(function (topic, topicIndex) {
      byId.set(topic.id, topic);
      indexOf.set(topic.id, topicIndex);
      pre.set(topic.id, []);
      post.set(topic.id, []);
    });
    deps.forEach(function (edge) {
      if (!pre.has(edge.topicId) || !post.has(edge.prerequisiteId)) return;
      pre.get(edge.topicId).push({ id: edge.prerequisiteId, strength: edge.strength, source:edge.source, reason: edge.reason || '' });
      post.get(edge.prerequisiteId).push({ id: edge.topicId, strength: edge.strength, source:edge.source, reason: edge.reason || '' });
    });
    pre.forEach(function (list) {
      list.sort(function (a, b) {
        return ((a.strength === 'hard' ? 0 : 1) - (b.strength === 'hard' ? 0 : 1)) || ((indexOf.get(a.id) || 0) - (indexOf.get(b.id) || 0));
      });
    });
    post.forEach(function (list) {
      list.sort(function (a, b) { return (indexOf.get(a.id) || 0) - (indexOf.get(b.id) || 0); });
    });
  }

  subject = readSubject();
  configureSubject();
  restoreDepth();
  syncDepthButtons();
  applyQuery();
  bind();
  load().then(function () { return loadQuestions(); }).then(function () {
    fillDomain();
    fillBookFilters();
    syncControls();
    renderList();
    bootSelection();
  }).catch(function (error) {
    showLoadError('无法读取数据（' + (error && error.message ? error.message : error) + '）。请完整解压下载包，不要只移动 HTML 文件；已部署的网页请确认数据资源完整，再刷新重试。');
  });
})();
