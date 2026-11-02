/* Render book provenance and curriculum coverage from the graph's own data. */
(function () {
  'use strict';
  function node(tag, text, cls) {
    var n=document.createElement(tag);
    if (text) n.textContent=text;
    if (cls) n.className=cls;
    return n;
  }
  function link(text, url, external) {
    var a=node('a',text); a.href=url;
    if (external) { a.target='_blank'; a.rel='noopener noreferrer'; }
    return a;
  }
  function readable(value) {
    if (Array.isArray(value)) return value.map(readable).join('；');
    if (value && typeof value==='object') return Object.entries(value).map(function(e){return e[0]+'：'+readable(e[1]);}).join('；');
    return value == null ? '' : String(value);
  }
  ['med','tcm','herbal','uphysics','uchemistry'].forEach(function(subject) {
    var host=document.getElementById(subject+'-books');
    if (!host) return;
    Promise.all(['topics','questions','sources','coverage'].map(function(kind) {
      return Subjects.fetchRaw('data/'+subject+'-'+kind+'.json').then(function(r){return r.json();});
    })).then(function(values) {
      var topics=values[0], questions=values[1], sources=values[2];
      document.getElementById(subject+'-summary').textContent='已收录 '+topics.length+' 个核心知识点、'+questions.length+(Subjects.universityScience(subject) ? ' 道原创知识测评题，每个知识点两题。' : ' 道原创课程测评题，每个知识点两题。')+'自编学习单元与教材原书位置分别记录。版本核验截至 2026-10-31。';
      var coverage=document.getElementById(subject+'-coverage');
      Subjects.rawCoursesFor(subject).forEach(function(c) {
        var list=topics.filter(function(t){return t.module===c.id;});
        var details=node('details');
        details.append(node('summary',c.name+' · '+list.length+' 个核心知识点'));
        details.append(node('p',Array.from(new Set(list.map(function(t){return t.chapter;}))).join('；')));
        details.append(link('浏览'+Subjects.unitLabel(subject),Subjects.link('explore/index.html?module='+c.id,subject)),' · ',link(Subjects.unitLabel(subject)+'知识测评',Subjects.link('diagnose/index.html?module='+c.id,subject)));
        coverage.append(details);
      });
      coverage.append(node('p','本范围是核心节点集，未承诺逐章、逐节覆盖教材全部内容。'));
      coverage.append(link('完整'+Subjects.unitLabel(subject)+'映射','data/'+subject+'-coverage.json'),' · ',link('完整来源记录','data/'+subject+'-sources.json'));
      (sources.books || []).forEach(function(b) {
        var list=topics.filter(function(t){return t.textbook && t.textbook.book===b.id;});
        var card=node('section',null,'source-card'); card.id=b.id;
        card.append(node('h2',b.title));
        var authors=Array.isArray(b.authors) ? b.authors.join('、') : b.authors || b.author || '';
        var edition=typeof b.edition==='number' ? '第'+b.edition+'版' : b.edition;
        card.append(node('p',[authors,b.publisher,edition,b.publication_date ? '出版：'+b.publication_date : '',b.isbn ? 'ISBN '+b.isbn : ''].filter(Boolean).join(' · ')));
        if (b.latest_printing_date || b.latest_printing) card.append(node('p','最新印次：'+readable(b.latest_printing_date || b.latest_printing)));
        if (b.official_series) card.append(node('p',readable(b.official_series)));
        if (b.verification) card.append(node('p','核验范围：'+readable(b.verification)));
        var extraNote=readable(b.note || b.notes);
        if (extraNote && extraNote!==readable(b.verification)) card.append(node('p',extraNote));
        if (b.publication_date_note) card.append(node('p','日期说明：'+readable(b.publication_date_note)));
        card.append(node('p',b.full_text_verified===true ? '已核对的正文范围见来源记录。' : '未逐页核对教材全文。学习摘要、题目与先修建议为原创整理，仍需结合原书和课堂核实。'));
        var links=node('p');
        if (/^https?:\/\//.test(b.source_url || '')) links.append(link('出版 / 书目依据',b.source_url,true));
        if (/^https?:\/\//.test(b.catalog_url || '') && b.catalog_url!==b.source_url) links.append(' · ',link('补充书目 / 目录依据',b.catalog_url,true));
        var extras=[b.secondary_source_url,b.conflicting_source_url,b.supporting_url,b.metadata_crosscheck_url].concat(b.metadata_crosscheck_urls || []);
        Array.from(new Set(extras)).filter(function(url){return /^https?:\/\//.test(url || '') && url!==b.source_url && url!==b.catalog_url;}).forEach(function(url,i){links.append(' · ',link('交叉核验 '+(i+1),url,true));});
        card.append(links);
        if (list.length) {
          var details=node('details'); details.append(node('summary','查看 '+list.length+' 个知识点及教材定位'));
          var ul=node('ul',null,'source-topics');
          list.forEach(function(t) {
            var li=node('li');
            li.append(link(t.name,Subjects.link('explore/index.html#'+t.id,subject)),node('span',[t.textbook.chapter,t.textbook.section].filter(Boolean).join(' · ')));
            ul.append(li);
          });
          details.append(ul); card.append(details);
        }
        host.append(card);
      });
      var id;
      try { id=decodeURIComponent(location.hash.slice(1)); } catch (_) { id=''; }
      if (id && document.getElementById(id)) document.getElementById(id).scrollIntoView();
    }).catch(function(error) {
      document.getElementById(subject+'-summary').textContent=Subjects.rawNames[subject]+'来源数据未能加载：'+error.message+'。请完整解压数据文件后刷新。';
    });
  });
})();
