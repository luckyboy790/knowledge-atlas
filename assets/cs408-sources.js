/* Source metadata is rendered from the same audited files as the graph. */
(function () {
  'use strict';
  function node(tag, text, cls) {
    var el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  function link(text, href, external) {
    var a = node('a',text); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  var host = document.getElementById('cs408-books');
  if (!host) return;
  Promise.all(['topics','questions','sources','coverage'].map(function(kind) {
    return Subjects.fetch('data/cs408-' + kind + '.json','cs408').then(function(r){return r.json();});
  })).then(function(values) {
    var topics = values[0], questions = values[1], sources = values[2];
    document.getElementById('cs408-summary').textContent = '已构建 ' + topics.length + ' 个核心知识点、' + questions.length + ' 道原创诊断题。每个知识点附教材或标准文档出处；课程分组不表示先修顺序。核验日期：2026-10-30。';
    var coverageHost = document.getElementById('cs408-course-coverage');
    Subjects.courses.forEach(function(c) {
      var list = topics.filter(function(t){return t.module === c.id;});
      var details = node('details');
      details.append(node('summary', c.name + ' · ' + list.length + ' 个知识点'));
      details.append(node('p',Array.from(new Set(list.map(function(t){return t.chapter;}))).join('；')));
      details.append(link('浏览课程','explore/index.html?subject=cs408&module=' + c.id),' · ',link('整门诊断','diagnose/index.html?subject=cs408&module=' + c.id));
      coverageHost.append(details);
    });
    (sources.books || []).forEach(function(b) {
      var list = topics.filter(function(t){return t.textbook && t.textbook.book === b.id;});
      var card = node('section',null,'source-card'); card.id = b.id;
      card.append(node('h2',b.title));
      var author = Array.isArray(b.authors) ? b.authors.join('、') : b.authors || b.author || '';
      var edition = typeof b.edition === 'number' ? '第'+b.edition+'版' : b.edition;
      card.append(node('p',[author,b.publisher,edition,b.publication_date ? '出版：'+b.publication_date : '',b.isbn ? 'ISBN '+b.isbn : ''].filter(Boolean).join(' · ')));
      var printingDate = b.observed_printing_date || b.listed_printing_date;
      if (printingDate) card.append(node('p','出版社页面所列印刷日期：'+printingDate+'；印次与版次分别记录。'));
      if (b.role) card.append(node('p',b.role));
      if (b.verification) card.append(node('p',typeof b.verification === 'string' ? b.verification : JSON.stringify(b.verification)));
      if (b.note) card.append(node('p',b.note));
      var links = node('p');
      if (/^https?:\/\//.test(b.source_url || '')) links.append(link('出版社 / 标准文档',b.source_url,true));
      if (b.catalog_url && b.catalog_url !== b.source_url) links.append(' · ',link('已核验的目录',b.catalog_url,true));
      card.append(links);
      if (list.length) {
        var details = node('details'); details.append(node('summary','查看 ' + list.length + ' 个知识点及出处'));
        var ul = node('ul',null,'source-topics');
        list.forEach(function(t) {
          var li=node('li');
          li.append(link(t.name,'explore/index.html?subject=cs408#' + t.id),node('span',[t.textbook.chapter,t.textbook.section].filter(Boolean).join(' · ')));
          ul.append(li);
        });
        details.append(ul); card.append(details);
      }
      host.append(card);
    });
    var id = decodeURIComponent(location.hash.slice(1));
    if (id && document.getElementById(id)) document.getElementById(id).scrollIntoView();
  }).catch(function(error) {
    document.getElementById('cs408-summary').textContent = '408 来源数据未能加载：' + error.message + '。请完整保留数据资源后刷新。';
  });
})();
