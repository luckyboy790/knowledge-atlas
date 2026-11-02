#!/usr/bin/env node
// Usage: node scripts/validate_biogeo_frontend.cjs [v15_baseline_directory]
// Portable runtime, routing and DOM contracts. Actual browser QA is separately recorded.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const BASE=process.argv[2]?path.resolve(process.argv[2]):null;
const REPORT=path.join(ROOT,'validation/biogeo-frontend-validation.json');
const subjects=['biology','geography'];
const files=subjects.flatMap(s=>['topics','questions','dependencies','sources','coverage'].map(k=>s+'-'+k+'.json'));
const changed=['assets/subjects.js','assets/home.js','assets/biogeo-sources.js','assets/explore.css','explore/app.js','explore/index.html','diagnose/app.js','diagnose/choice-order.js','diagnose/index.html','index.html','sources.html','scripts/build_runtime.py','scripts/validate_biogeo_frontend.cjs','scripts/check_biogeo_browser_exports.cjs','assets/data-manifest.js'];
const checks=[],skipped=[],actual={};
let preserved=null,enginePreserved=null,runtimeCount=null;
function read(rel,root=ROOT){return fs.readFileSync(path.join(root,rel),'utf8');}
function json(rel,root=ROOT){return JSON.parse(read(rel,root));}
function digest(rel,root=ROOT){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');}
function equal(a,b,msg){assert.equal(JSON.stringify(a),JSON.stringify(b),msg);}
async function check(name,fn){try{await fn();checks.push(name);}catch(e){e.checkName=name;throw e;}}
class Element {
  constructor(tag) { this.tagName = tag; this.nodeType = tag === '#text' ? 3 : 1; this.children = []; this.attrs = {}; this.events = {}; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(x => typeof x === 'string' ? x : x.textContent).join(''); }
  get childNodes() { return this.children; }
  append(...children) { this.children.push(...children.map(child => child instanceof Element ? child : String(child))); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  setAttribute(key, value) { this.attrs[key] = String(value); if (key === 'id') this.id = String(value); }
  getAttribute(key) { return this.attrs[key] || this[key] || null; }
  addEventListener(name, fn) { this.events[name] = fn; }
  remove() {}
  scrollIntoView() { this.scrolled = true; }
}
function walk(root) { return [root].concat(root.children.filter(x => x && typeof x === 'object').flatMap(walk)); }
function environment(root = ROOT, search = '', hash = '') {
  const dom = new Element('document');
  for (const id of ['root','detail','biology-books','biology-summary','biology-evidence','geography-books','geography-summary','geography-evidence']) {
    const element = new Element('div'); element.id = id; dom.append(element);
  }
  const document = {
    currentScript:{src:'https://example.test/nested/graph/assets/subjects.js'},
    createElement:tag => new Element(tag),
    createTextNode:text => { const el = new Element('#text'); el.textContent = text; return el; },
    getElementById:id => walk(dom).find(el => el.id === id) || null,
    querySelectorAll:() => [],
    documentElement:{style:{}},
    head:{}
  };
  const window = {addEventListener() {}, DiagChoice:require(path.join(root, 'diagnose/choice-order.js')), DiagEngine:require(path.join(root, 'diagnose/engine.js'))};
  const context = vm.createContext({window,document,location:{search,hash,pathname:'/nested/graph/explore/index.html'},URL,URLSearchParams,setTimeout,clearTimeout,console,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}}});
  vm.runInContext(read('assets/data-manifest.js', root), context);
  document.head.appendChild = script => {
    const url = new URL(script.src);
    assert(url.pathname.startsWith('/nested/graph/data/runtime/'), 'Runtime must support an HTTP deployment subpath');
    try {
      vm.runInContext(read('data/runtime/' + path.basename(url.pathname), root), context);
      script.onload();
    } catch (error) { if (script.onerror) script.onerror(error); else throw error; }
  };
  vm.runInContext(read('assets/subjects.js', root), context);
  context.Subjects = window.Subjects;
  return {context,window,document,dom,S:window.Subjects};
}
function diagnose(env, root = ROOT) {
  const code = read('diagnose/app.js', root);
  const marker = '\n  init();\n})();';
  assert(code.includes(marker), 'Diagnose instrumentation entry point changed');
  vm.runInContext(code.replace(marker, '\n  window.FrontendTest = {loadData,scopeTargets,resolveTargets,buildTree,volumeRows,standardsCard,gradeCard,sessionKey,detectSubject,setGrade:function(s){gradeSel=s;},setSubject:function(s){subject=s;},data:function(){return D;},setSession:function(s){session=s;}};\n})();'), env.context);
  return env.window.FrontendTest;
}
function explore(env, root = ROOT) {
  const code = read('explore/app.js', root);
  const marker = '\n  subject = readSubject();';
  assert.equal(code.split(marker).length, 2, 'Explore instrumentation entry point changed');
  const capture = `
  window.FrontendTest = {
    load:load,gradeWord:gradeWord,chapterOf:chapterOf,readSubject:readSubject,setSubject:function(s){subject=s;},
    runQuery:function(search,s){subject=s||'math';grade='';stage='';domain='';query='';book='';chapter='';location.search=search;applyQuery();return {grade:grade,stage:stage};},
    visible:function(){return topics.filter(passFilter).map(function(t){return t.id;});},
    detail:function(id){selected=id;renderDetail();}
  };
})();`;
  vm.runInContext(code.split(marker)[0] + capture, env.context);
  return env.window.FrontendTest;
}

async function main(){
  assert(process.argv.length<=3,'Usage: node scripts/validate_biogeo_frontend.cjs [v15_baseline_directory]');
  if(BASE)assert(fs.statSync(BASE).isDirectory(),'Baseline directory exists');
  await check('changed JavaScript and all four HTML inline scripts parse',()=>{
    for(const rel of changed.filter(x=>x.endsWith('.js')))new vm.Script(read(rel),{filename:rel});
    for(const rel of ['index.html','explore/index.html','diagnose/index.html','sources.html'])for(const m of read(rel).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:rel});
  });
  const current=environment(),S=current.S,Choice=require(path.join(ROOT,'diagnose/choice-order.js'));
  await check('twelve identities, new prefix inference and four page navigations are complete',()=>{
    assert.equal(Object.keys(S.names).length,12);
    for(const [subject,prefix] of [['biology','cnb_'],['geography','cng_']]){
      for(const env of [environment(ROOT,'?target='+prefix+'001'),environment(ROOT,'','#'+prefix+'001')]){
        assert.equal(env.S.read(),subject);assert.equal(diagnose(env).detectSubject(),subject);if(env.context.location.hash)assert.equal(explore(env).readSubject(),subject);
      }
      assert.equal(S.of({id:prefix+'001'}),subject);assert(S.science(subject));assert(S.biogeo(subject));assert(!S.academic(subject));
      for(const kind of ['topics','questions','dependencies'])assert.equal(S.data(kind+'.json',subject),subject+'-'+kind+'.json');
    }
    for(const rel of ['index.html','explore/index.html','diagnose/index.html','sources.html']){
      const html=read(rel);assert.equal((html.match(/data-subject="/g)||[]).length,12,rel);
      for(const s of Object.keys(S.names))assert.equal((html.match(new RegExp('data-subject="'+s+'"','g'))||[]).length,1,rel+' '+s);
    }
  });
  await check('legacy homepage hashes preserve all prior routes and infer biology or geography',()=>{
    const redirect=[...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(s=>s.includes('var id = location.hash'));
    const ids=['cnm_001','cnm_ps001','cne_001','cnp_001','cnc_001','cs408_ds_001','med_anatomy_001','tcm_basics_001','herbal_materia_001','uphy_mechanics_001','uch_structure_001','cnb_001','cng_001'];
    for(const id of ids){
      let actual='';vm.runInNewContext(redirect,{location:{hash:'#'+id,replace:v=>actual=v},document:{documentElement:{style:{}}}});
      assert(actual.endsWith('#'+id),id);
      if(/^cn[bg]_/.test(id))assert(actual.includes('subject='+S.of({id})),id);
      else if(BASE){let old='';const code=[...read('index.html',BASE).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(s=>s.includes('var id = location.hash'));vm.runInNewContext(code,{location:{hash:'#'+id,replace:v=>old=v},document:{documentElement:{style:{}}}});assert.equal(actual,old,id);}
    }
  });
  if(BASE){
    const old=environment(BASE),B=old.S;
    await check('all ten existing configurations, every original topic normalization and references equal v15',()=>{
      assert.equal(Object.keys(B.names).length,10);
      for(const subject of Object.keys(B.names)){
        assert.equal(S.names[subject],B.names[subject]);equal(S.coursesFor(subject),B.coursesFor(subject));equal(S.specs[subject],B.specs[subject]);
        for(const method of ['academic','curriculum','medical','science','universityScience','unitLabel'])equal(S[method](subject),B[method](subject));
        for(const text of ['诊断这个知识点','按课程整体诊断','诊断课程','普通文本'])assert.equal(S.assessment(text,subject),B.assessment(text,subject));
      }
      for(const file of fs.readdirSync(path.join(BASE,'data')).filter(n=>n==='topics.json'||n.endsWith('-topics.json')))for(const t of json('data/'+file,BASE)){
        equal(S.engineTopics([t]),B.engineTopics([t]),t.id);assert.equal(S.reference(t),B.reference(t),t.id);assert.equal(S.of(t),B.of(t),t.id);
      }
    });
    await check('all 54 pre-existing JSON and diagnose engine remain byte-identical to v15',()=>{
      const names=fs.readdirSync(path.join(BASE,'data')).filter(n=>n.endsWith('.json'));assert.equal(names.length,54);
      for(const name of names)assert.equal(digest('data/'+name),digest('data/'+name,BASE),name);
      assert.equal(digest('diagnose/engine.js'),digest('diagnose/engine.js',BASE));preserved=names.length;enginePreserved=true;
    });
    await check('every original question retains its seeded choice display and scoring keys',()=>{
      const oldChoice=require(path.join(BASE,'diagnose/choice-order.js'));
      for(const file of fs.readdirSync(path.join(BASE,'data')).filter(n=>n==='questions.json'||n.endsWith('-questions.json')))for(const q of json('data/'+file,BASE))for(const seed of ['v16-regression','second-seed'])equal(Choice.ordered(q,seed),oldChoice.ordered(q,seed),q.id);
    });
    await check('all ten original subjects load the same data, chapter tree, scope routes and session keys',async()=>{
      for(const subject of Object.keys(B.names)){
        const nowEnv=environment(ROOT,'?subject='+subject),oldEnv=environment(BASE,'?subject='+subject),now=diagnose(nowEnv),was=diagnose(oldEnv,BASE);
        now.setSubject(subject);was.setSubject(subject);await now.loadData();await was.loadData();
        equal(now.data().topics,was.data().topics,subject+' topics');equal(now.data().deps,was.data().deps,subject+' deps');equal(now.data().tree,was.data().tree,subject+' tree');equal(now.volumeRows(),was.volumeRows(),subject+' volumes');assert.equal(now.sessionKey(),was.sessionKey(),subject);
        const first=now.data().topics.find(t=>!t.external);equal(now.resolveTargets(new URLSearchParams({target:first.id})),was.resolveTargets(new URLSearchParams({target:first.id})),subject+' target');
        const chapters=Object.values(now.data().tree).flatMap(v=>v.chapters);
        for(const ch of [chapters[0],chapters[chapters.length-1]])if(ch)equal(now.resolveTargets(new URLSearchParams({chapter:ch.key})),was.resolveTargets(new URLSearchParams({chapter:ch.key})),subject+' chapter');
      }
    });
  }else skipped.push('No v15 baseline supplied: exact legacy data, engine and behavior preservation were not checked.');
  await check('new choice shuffling is reproducible, changes display only and keeps input immutable',()=>{
    for(const subject of subjects){
      const prefix=subject==='biology'?'cnb_':'cng_',q={id:prefix+'001_q1',topicId:prefix+'001',answer:'C',choices:['A','B','C','D'].map(key=>({key,text:'option '+key}))};
      let shuffled=false;
      for(let seed=1;seed<=24;seed++){const a=Choice.ordered(q,seed);equal(a,Choice.ordered(q,seed));equal(a.map(x=>x.key).sort(),['A','B','C','D']);equal(a.map(x=>x.label),['A','B','C','D']);assert.equal(a.find(x=>x.key===q.answer).text,'option C');if(a.some((x,i)=>x.key!==q.choices[i].key))shuffled=true;}
      assert(shuffled);assert(!('label' in q.choices[0]));
    }
  });
  const absent=files.filter(name=>!fs.existsSync(path.join(ROOT,'data',name)));
  if(absent.length){skipped.push('Final biology/geography data unavailable: '+absent.join(', '));return 'WAITING_FOR_DATA';}
  await check('ten new runtime payloads match the JSON and all 53 original payload names remain stable',async()=>{
    for(const file of files){const filename=current.window.ToyDataFiles[file];assert(filename,'Run scripts/build_runtime.py: missing '+file);assert(filename.includes(digest('data/runtime/'+filename).slice(0,12)));equal(await(await S.fetch('data/'+file,file.split('-')[0])).json(),json('data/'+file));}
    if(BASE)for(const [file,name] of Object.entries(environment(BASE).window.ToyDataFiles))assert.equal(current.window.ToyDataFiles[file],name,'Old payload '+file);
    runtimeCount=Object.keys(current.window.ToyDataFiles).length;assert.equal(runtimeCount,63);
  });
  await check('all mathematics extensions still merge with independent read objects',async()=>{
    for(const part of ['topics','questions','dependencies']){
      const expected=json('data/'+part+'.json').concat(json('data/math-university-'+part+'.json'),json('data/math-probability-'+part+'.json'));
      const got=await(await S.fetch('data/'+part+'.json','math')).json();equal(got,expected);got[0].testMutation=true;assert(!(await(await S.fetch('data/'+part+'.json','math')).json())[0].testMutation);
    }
  });
  const sessionKeys=[];
  for(const subject of subjects){
    const topics=json('data/'+subject+'-topics.json'),questions=json('data/'+subject+'-questions.json'),sources=json('data/'+subject+'-sources.json');
    const env=environment(ROOT,'?subject='+subject),D=diagnose(env),E=env.window.DiagEngine;D.setSubject(subject);await D.loadData();sessionKeys.push(D.sessionKey());
    actual[subject]={topics:topics.length,questions:questions.length,books:sources.books.length,chapters:Object.values(D.data().tree).reduce((n,v)=>n+v.chapters.length,0)};
    await check(subject+': all nine books, original unit metadata and unique chapter keys survive loading',()=>{
      equal(D.data().topics,topics);assert.equal(sources.books.length,9);assert.equal(D.volumeRows().length,9);
      const rawKeys=new Map(),routeKeys=new Set();
      for(const t of topics){
        const normalized=D.data().graph.byId[t.id],b=t.textbook,c=S.scienceChapter(t),parsed=E.parseChapter(normalized.chapter);
        equal(normalized.textbook,b);assert.equal(parsed.chapterNo,c.chapterNo,t.id);assert.equal(parsed.chapterName,c.chapterName.replace(/\s+/g,'·'),t.id);
        assert.equal(parsed.volume,S.bookLabel(t).replace(/\s+/g,'·'),t.id);assert(S.reference(t).includes(b.chapter));if(b.unit)assert(S.reference(t).includes(b.unit));
        const route=c.volume+' '+c.chapterNo,raw=[b.book,b.unit||'',b.chapter].join('|');if(rawKeys.has(route))assert.equal(rawKeys.get(route),raw,'Chapter collision '+route);else rawKeys.set(route,raw);routeKeys.add(route);
      }
      assert.equal(routeKeys.size,actual[subject].chapters);
      for(const book of sources.books){assert(D.data().tree[book.id],book.id);assert.equal(D.data().tree[book.id].label,book.volume);}
    });
    await check(subject+': every book and chapter route resolves exact topic membership, including unit restarts',()=>{
      for(const b of sources.books){
        const expected=topics.filter(t=>t.textbook.book===b.id).map(t=>t.id);
        for(const volume of [b.id,b.volume,b.title]){const got=D.resolveTargets(new URLSearchParams({volume}));equal(got.ids,expected,b.id);assert.equal(got.mode,'screen');}
        for(const ch of D.data().tree[b.id].chapters)equal(D.resolveTargets(new URLSearchParams({chapter:ch.key})).ids,ch.topics.map(x=>x.t.id),ch.key);
        const sample=topics.find(t=>t.textbook.book===b.id);equal(D.resolveTargets(new URLSearchParams({target:sample.id})).ids,[sample.id]);
      }
      for(const [grade,label] of [[7,'七'],[8,'八'],[10,'高一'],[11,'高二'],[12,'高三']]){
        const expected=topics.filter(t=>t.grade===grade).map(t=>t.id);if(!expected.length)continue;
        for(const alias of [String(grade),label])equal(D.resolveTargets(new URLSearchParams({grade:alias})).ids,expected);
        if(grade<=8)for(const half of ['上','下'])equal(D.resolveTargets(new URLSearchParams({grade:label,volume:half})).ids,topics.filter(t=>t.grade===grade&&t.semester===half).map(t=>t.id));
        else assert(D.resolveTargets(new URLSearchParams({grade:label})).label.includes('建议'));
      }
      for(const [alias,pattern] of [['必修一',/必修第?一|必修1/],['必修二',/必修第?二|必修2/],['选必一',/选择性必修第?一|选择性必修1/],['选必二',/选择性必修第?二|选择性必修2/],['选必三',/选择性必修第?三|选择性必修3/]]){
        const b=sources.books.find(b=>pattern.test(b.volume.replace(/\s+/g,''))&&!((alias==='必修一'||alias==='必修二')&&b.volume.includes('选择性')));assert(b,alias);equal(D.scopeTargets(alias).ids,topics.filter(t=>t.textbook.book===b.id).map(t=>t.id));
      }
      assert.throws(()=>D.resolveTargets(new URLSearchParams({grade:'九'})));assert.throws(()=>D.resolveTargets(new URLSearchParams({grade:'八',volume:sources.books.find(b=>b.grade===7).id})));
      equal(D.scopeTargets('all').ids,topics.map(t=>t.id));
    });
    await check(subject+': grade chooser, exact engine chapter summaries and textbook evidence render without null artifacts',()=>{
      for(const grade of ['七','八','高一','高二','高三']){D.setGrade(grade);const text=D.gradeCard().textContent;assert(!text.includes('null'));assert(text.includes('建议学习编排'));}
      for(const b of sources.books){const ids=topics.filter(t=>t.textbook.book===b.id).map(t=>t.id),session=E.createSession(D.data().graph,ids,{mode:'screen',seed:'chapter-qa',limit:20}),chapters=E.chapterSummary(D.data().graph,session);assert.equal(chapters.length,D.data().tree[b.id].chapters.length);assert.equal(chapters.reduce((n,c)=>n+c.total,0),ids.length);}
      D.setSession({mode:'target',targets:[topics[0].id]});const card=D.standardsCard({path:[]});assert(card.textContent.includes('教材复习出处'));assert(card.textContent.includes('尚未经教师审核'));assert(card.textContent.includes(topics[0].textbook.chapter));
      assert.equal(D.sessionKey(),subject+'Diagnose.session.v1');
    });
    const xEnv=environment(ROOT,'?subject='+subject),X=explore(xEnv);X.setSubject(subject);await X.load();
    await check(subject+': explorer filters, unit labels and direct assessment/source links match real books',()=>{
      for(const grade of [7,8,10,11,12]){X.runQuery('?grade='+grade,subject);equal(X.visible(),topics.filter(t=>t.grade===grade).map(t=>t.id));assert.equal(X.gradeWord(grade),S.scienceGrade(grade));}
      X.runQuery('?stage=j',subject);equal(X.visible(),topics.filter(t=>t.grade<=9).map(t=>t.id));X.runQuery('?stage=h',subject);equal(X.visible(),topics.filter(t=>t.grade>=10).map(t=>t.id));
      for(const b of sources.books){X.runQuery('?volume='+encodeURIComponent(b.id),subject);equal(X.visible(),topics.filter(t=>t.textbook.book===b.id).map(t=>t.id));for(const ch of D.data().tree[b.id].chapters){X.runQuery('?chapter='+encodeURIComponent(ch.key),subject);equal(X.visible(),ch.topics.map(x=>x.t.id));}}
      for(const topic of [topics[0],topics.find(t=>t.grade>=10)]){
        X.detail(topic.id);const detail=xEnv.document.getElementById('detail'),elements=walk(detail),links=elements.filter(n=>n.tagName==='a').map(n=>n.getAttribute('href'));assert(detail.textContent.includes(subject==='biology'?'现代生物学':'现代地理学'));
        const c=S.scienceChapter(topic);assert(links.includes(S.link('../diagnose/index.html?target='+topic.id,subject)));assert(links.includes(S.link('../diagnose/index.html?volume='+encodeURIComponent(c.volume),subject)));assert(links.includes(S.link('../diagnose/index.html?chapter='+encodeURIComponent(c.volume+' '+c.chapterNo),subject)));assert(links.includes('../sources.html?subject='+subject+'#'+topic.textbook.book));
        if(topic.textbook.unit)assert(detail.textContent.includes(topic.textbook.unit));assert(detail.textContent.includes(topic.textbook.verification));
      }
    });
  }
  await check('biology, geography and mathematics have distinct saved-session keys',()=>{const env=environment(),D=diagnose(env);D.setSubject('math');sessionKeys.push(D.sessionKey());assert.equal(new Set(sessionKeys).size,3);});
  await check('both source cards render real book counts, chapter links and separated evidence / companion bibliography',async()=>{
    const env=environment(ROOT,'?subject=biology');vm.runInContext(read('assets/biogeo-sources.js'),env.context);await new Promise(resolve=>setImmediate(resolve));
    for(const subject of subjects){
      const source=json('data/'+subject+'-sources.json'),summary=env.document.getElementById(subject+'-summary').textContent,host=env.document.getElementById(subject+'-books');assert(summary.includes(actual[subject].topics+' 个核心知识点'));assert(summary.includes(actual[subject].questions+' 道原创练习'));assert(summary.includes('9 册教材'));assert(!summary.includes('未能载入'));assert.equal(host.children.length,9);
      const evidence=env.document.getElementById(subject+'-evidence').textContent;assert(evidence.includes('尚未经教师审核'));assert(evidence.includes('高中年级仅为建议'));
      for(const ref of source.curriculum_references||[]){
        for(const k of ['title','publisher','date','short_evidence','data_reference_date','limitations'])if(ref[k])assert(evidence.includes(typeof ref[k]==='string'?ref[k]:ref[k].join('；')),subject+' reference '+k);
        const links=walk(env.document.getElementById(subject+'-evidence')).filter(n=>n.tagName==='a').map(n=>n.getAttribute('href'));
        for(const href of [ref.source_url||ref.url,ref.landing_url,ref.official_pdf_url])if(href)assert(links.includes(href),subject+' reference link');
      }
      for(const b of source.books){
        const card=env.document.getElementById(b.id);assert(card,b.id);assert(card.textContent.includes(b.title));assert(card.textContent.includes(b.verification));
        if(b.verified_update)assert(card.textContent.includes(typeof b.verified_update==='object'?b.verified_update.label:b.verified_update));
        if(b.current_curriculum_standard)assert(card.textContent.includes(b.current_curriculum_standard));
        if(b.curriculum_reference_url)assert(walk(card).some(n=>n.tagName==='a'&&n.getAttribute('href')===b.curriculum_reference_url));
        if(b.curriculum_current_evidence){
          const c=b.curriculum_current_evidence,links=walk(card).filter(n=>n.tagName==='a').map(n=>n.getAttribute('href'));
          for(const k of ['title','repost_publisher','read_printed_pages','access','limitation'])if(c[k])assert(card.textContent.includes(c[k]),b.id+' curriculum '+k);
          for(const k of ['publish_url','read_url'])if(c[k])assert(links.includes(c[k]),b.id+' curriculum link '+k);
        }
        if(b.chapter_title_variants)for(const v of b.chapter_title_variants){assert(card.textContent.includes(v.display));assert(card.textContent.includes(v.variant));assert(card.textContent.includes(v.evidence));}
        if(b.companion_atlas){assert(card.textContent.includes('与主教材分列'));if(b.companion_atlas.isbn)assert(card.textContent.includes('图册 ISBN：'+b.companion_atlas.isbn));}assert(!card.textContent.includes('：null'));
      }
      const links=walk(host).filter(n=>n.tagName==='a').map(n=>n.getAttribute('href'));assert.equal(links.filter(h=>h&&h.startsWith('diagnose/')&&h.includes('&chapter=')).length,actual[subject].chapters);assert.equal(links.filter(h=>h&&h.startsWith('diagnose/')&&h.includes('&volume=')).length,9);assert.equal(links.filter(h=>h&&h.startsWith('explore/')&&h.includes('&chapter=')).length,actual[subject].chapters);assert.equal(links.filter(h=>h&&h.startsWith('explore/')&&h.includes('&volume=')).length,9);
    }
  });
  return BASE?'PASS':'PASS_WITHOUT_BASELINE';
}
function report(status,error){
  const data={schema_version:1,checked_on:new Date().toISOString(),reviewer:'/root/biogeo_frontend',status,scope:'Portable author-side syntax, offline runtime, exact chapter and volume routing, legacy behavior, and minimal DOM contract checks. Actual browser layout and exports are recorded separately.',baseline_path:BASE,existing_json_preserved:preserved,core_engine_unchanged:enginePreserved,runtime_files_verified:runtimeCount,actual,checks,check_groups:checks.length,skipped_checks:skipped,remaining_limits:['实际浏览器交互、恢复进度、窄屏布局和真实导出由单独浏览器验收覆盖。','生物与地理内容准确性、教材目录与版本证据由独立内容审查记录覆盖。'],changed_file_sha256:Object.fromEntries(changed.filter(rel=>fs.existsSync(path.join(ROOT,rel))).map(rel=>[rel,digest(rel)])),new_data_sha256:Object.fromEntries(files.filter(f=>fs.existsSync(path.join(ROOT,'data',f))).map(f=>[f,digest('data/'+f)]))};
  if(error)data.failure={check:error.checkName||null,message:error.message};fs.mkdirSync(path.dirname(REPORT),{recursive:true});fs.writeFileSync(REPORT,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({status,check_groups:checks.length,existing_json_preserved:preserved,runtime_files_verified:runtimeCount,actual,report:path.relative(ROOT,REPORT),...(error?{failure:data.failure}:{})}));
}
main().then(status=>{report(status);if(status==='WAITING_FOR_DATA')process.exitCode=2;}).catch(error=>{report('FAIL',error);process.exitCode=1;});
