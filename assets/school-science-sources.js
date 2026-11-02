/* School book cards remain a raw source view, inside the merged physics/chemistry groups. */
(function(){
  'use strict';
  function node(tag,text,cls){var n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
  ['physics','chemistry'].forEach(function(subject){
    var host=document.getElementById(subject+'-highschool-books');if(!host)return;
    Subjects.fetchRaw('data/'+subject+'-topics.json').then(function(r){return r.json();}).then(function(topics){
      host.replaceChildren();
      var books=new Map();
      topics.filter(function(t){return t.grade>=10&&t.grade<=12&&t.textbook;}).forEach(function(t){var key=t.textbook.book;if(!books.has(key))books.set(key,[]);books.get(key).push(t);});
      books.forEach(function(list,key){
        var first=list[0],b=first.textbook,card=node('section',null,'source-card');card.id=key;
        card.append(node('h2',b.title||('人教版 · '+Subjects.names[subject]+' · '+Subjects.bookLabel(first))));
        card.append(node('p','已整理 '+list.length+' 个知识点。按教材章、节定位；知识摘要和诊断题为原创整理。'));
        if(b.verification)card.append(node('p',typeof b.verification==='string'?b.verification:'具体核验范围见本学科来源记录。'));
        var links=node('p');
        if(/^https:\/\//.test(b.source_url||'')){var a=node('a','打开教材依据');a.href=b.source_url;a.target='_blank';a.rel='noopener noreferrer';links.append(a,' · ');}
        var record=node('a','完整来源记录');record.href='data/'+subject+'-sources.json';links.append(record);card.append(links);
        var details=node('details');details.append(node('summary','查看本册知识点与章节'));var ul=node('ul',null,'source-topics');
        list.forEach(function(t){var li=node('li'),a=node('a',t.name);a.href=Subjects.link('explore/index.html#'+t.id,subject);li.append(a,node('span',[t.textbook.chapter,t.textbook.section].filter(Boolean).join(' · ')));ul.append(li);});
        details.append(ul);card.append(details);host.append(card);
      });
      if(!host.children.length)host.append(node('p','高中教材条目暂未载入，请完整保留数据文件后刷新。','muted'));
      var id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){id='';}if(id&&document.getElementById(id))document.getElementById(id).scrollIntoView();
    }).catch(function(error){host.replaceChildren(node('p','高中教材覆盖范围未能载入：'+error.message+'。','muted'));});
  });
})();
