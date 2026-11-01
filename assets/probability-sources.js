/* Probability is the third university mathematics course; provenance is separate from the exam outline. */
(function () {
  'use strict';
  var host = document.getElementById('math-probability-books');
  if (!host) return;
  var modules = ['events','univariate','multivariate','moments','limits','sampling','estimation','testing'];
  function node(tag, text, cls) {
    var element = document.createElement(tag);
    if (text) element.textContent = text;
    if (cls) element.className = cls;
    return element;
  }
  function link(text, url, external) {
    var element = node('a', text);
    element.href = url;
    if (external) { element.target = '_blank'; element.rel = 'noopener noreferrer'; }
    return element;
  }
  function readable(value) {
    if (Array.isArray(value)) return value.map(readable).join('；');
    if (value && typeof value === 'object') return Object.entries(value).map(function(entry) { return entry[0] + '：' + readable(entry[1]); }).join('；');
    return value == null ? '' : String(value);
  }
  function officialLink(record, label) {
    var url = record.source_url || record.url;
    return /^https?:\/\//.test(url || '') ? link(label, url, true) : null;
  }
  function bibliography(record) {
    return [record.institution, readable(record.authors || record.author || record.issuer), record.publisher,
      record.publication_date || record.published ? '出版：' + (record.publication_date || record.published) : '',
      record.isbn ? 'ISBN ' + record.isbn : ''].filter(Boolean).join(' · ');
  }
  Promise.all(['topics','questions','sources','coverage'].map(function(kind) {
    return Subjects.fetch('data/math-probability-' + kind + '.json', 'math').then(function(response) { return response.json(); });
  })).then(function(values) {
    var topics = values[0], questions = values[1], sources = values[2], mapping = values[3];
    if (!Array.isArray(topics) || !Array.isArray(questions)) throw new Error('课程数据格式不正确');
    var checked = sources.checked_on || sources.checked_date || sources.verified_on || sources.verification_date;
    document.getElementById('math-probability-summary').textContent = '已收录 ' + topics.length + ' 个核心知识点、' + questions.length + ' 道原创练习，按八章组织。每个知识点各设基础题与标准题一题。' + (checked ? '来源核验日期：' + checked + '。' : '');
    var scope = document.getElementById('math-probability-scope');
    scope.replaceChildren();
    var counts = {shared:0, math1:0, supplement:0};
    topics.forEach(function(topic) { var track = (topic.exam_scope || {}).track; if (Object.prototype.hasOwnProperty.call(counts, track)) counts[track]++; });
    scope.append(node('p', '复习方向标记：数一/数三共用基础 ' + counts.shared + ' 个，数一方向 ' + counts.math1 + ' 个，辅助理解 ' + counts.supplement + ' 个。整门课程包含全部方向；请结合报考类别选择复习内容。'));
    var exam = sources.exam_basis || {};
    scope.append(node('p', sources.scope_note || exam.scope_note || mapping.scope_note || '方向标签依据出版社公开备考目录整理，2027 年官方考试大纲全文尚未取得，未完成逐条考试范围核验。'));
    scope.append(node('p', '数学二不纳入本模块，依据为出版社公开备考目录。估计量评价、区间估计与假设检验的“数一方向”参考较早年份的目录，仍需用 2027 年大纲正文复核。'));
    var coverage = document.getElementById('math-probability-coverage');
    coverage.replaceChildren();
    modules.forEach(function(module) {
      var list = topics.filter(function(topic) { return topic.module === module; });
      if (!list.length) return;
      var match = /^(\S+) (第\S+章) (\S+?)(?: \S+)?$/.exec(list[0].chapter || '');
      var title = match ? match[2] + ' ' + match[3] : list[0].chapter;
      var chapterKey = match ? match[1] + ' ' + match[2] : '';
      var details = node('details');
      details.append(node('summary', title + ' · ' + list.length + ' 个知识点'));
      var intro = node('p');
      intro.append(link('浏览本章', 'explore/index.html?grade=17#' + list[0].id));
      if (chapterKey) intro.append(' · ', link('以整章为测评目标', 'diagnose/index.html?chapter=' + encodeURIComponent(chapterKey)));
      details.append(intro);
      var listNode = node('ul', null, 'source-topics');
      list.forEach(function(topic) {
        var item = node('li');
        item.append(link(topic.name, 'explore/index.html?grade=17#' + topic.id));
        item.append(node('span', [topic.textbook && topic.textbook.section, topic.exam_scope && topic.exam_scope.label].filter(Boolean).join(' · ')));
        listNode.append(item);
      });
      details.append(listNode);
      coverage.append(details);
    });
    coverage.append(node('p', '章节映射保留教材原书位置。前八章中的所有小节并非都属于统考要求；本课程是核心节点集，未完整覆盖教材的定理证明、计算题与拓展内容。'));
    coverage.append(link('完整章节映射', 'data/math-probability-coverage.json'), ' · ', link('完整来源记录', 'data/math-probability-sources.json'));
    host.replaceChildren();
    (sources.books || (sources.book ? [sources.book] : [])).forEach(function(book) {
      var card = node('section', null, 'source-card'); card.id = book.id;
      card.append(node('h2', book.title), node('p', bibliography(book)));
      if (book.revisers) card.append(node('p', '修订：' + readable(book.revisers)));
      if (book.latest_printing_date || book.latest_printing) card.append(node('p', '最新印次：' + readable(book.latest_printing_date || book.latest_printing) + '；版次与印次分别记录。'));
      if (book.verification || book.evidence) card.append(node('p', '核验范围：' + readable(book.verification || book.evidence)));
      if (book.publication_date_note || book.date_note) card.append(node('p', readable(book.publication_date_note || book.date_note)));
      card.append(node('p', '已核对出版社公开书目与目录，未逐页核对教材全文；知识摘要、题目与先修建议为原创整理。仅使用已确认的章、节定位，不推测纸书页码。'));
      var sourceLink = officialLink(book, '出版社教材书目与目录');
      if (sourceLink) card.append(sourceLink);
      host.append(card);
    });
    if (exam.title) {
      var examCard = node('section', null, 'source-card'); examCard.id = exam.id || 'math-probability-exam';
      examCard.append(node('h2', exam.title), node('p', bibliography(exam)));
      examCard.append(node('p', '已核验年度大纲的官方出版书目。公开页面未提供可读的大纲全文，因此尚未逐条核验 2027 年数学一、数学三的考试要求。'));
      if (exam.scope_note) examCard.append(node('p', exam.scope_note));
      var examLink = officialLink(exam, '查看官方大纲书目');
      if (examLink) examCard.append(examLink);
      host.append(examCard);
    }
    var supporting = sources.scope_references || sources.scope_supporting_sources || [];
    if (supporting.length) {
      var supportCard = node('section', null, 'source-card'); supportCard.id = 'math-probability-scope-evidence';
      supportCard.append(node('h2', '备考方向的补充依据'));
      supporting.forEach(function(record) {
        var item = node('details'); item.id = record.id;
        item.append(node('summary', record.title), node('p', bibliography(record)));
        if (record.claim_supported || record.supports || record.scope_note) item.append(node('p', readable(record.claim_supported || record.supports || record.scope_note)));
        if (record.not_supported || record.limitations) item.append(node('p', '适用边界：' + readable(record.not_supported || record.limitations)));
        var recordLink = officialLink(record, '查看出版社公开目录');
        if (recordLink) item.append(recordLink);
        supportCard.append(item);
      });
      host.append(supportCard);
    }
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { id = ''; }
    var target = id && document.getElementById(id);
    if (target) target.scrollIntoView();
  }).catch(function(error) {
    document.getElementById('math-probability-summary').textContent = '概率统计来源数据未能加载：' + error.message + '。请完整解压数据文件后刷新。';
  });
})();
