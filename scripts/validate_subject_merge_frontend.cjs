#!/usr/bin/env node
/* v17 UI data/routing checks with a small DOM test double; real browser steps are separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),BASE=process.argv[2]?path.resolve(process.argv[2]):null;
const E=require(path.join(ROOT,'diagnose/engine.js')),Compat=require(path.join(ROOT,'diagnose/session-compatibility.js'));
const reportPath=path.join(ROOT,'validation/subject-merge-frontend-validation.json');
const read=(f,r=ROOT)=>fs.readFileSync(path.join(r,f),'utf8'),json=(f,r=ROOT)=>JSON.parse(read(f,r));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
let assertions=0,current='setup';const checks=[],details={};
const equal=(a,b,msg)=>{assertions++;assert.equal(JSON.stringify(a),JSON.stringify(b),msg);};
const ok=(x,msg)=>{assertions++;assert.ok(x,msg);};
async function check(name,fn){current=name;await fn();checks.push(name);}
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.nodeType=tag==='#text'?3:1;this.children=[];this.attrs={};this.events={};this._text='';this.dataset={};this.style={};this.classList={add(){},remove(){},toggle(){}};}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 get childNodes(){return this.children;}get firstChild(){return this.children[0]||null;}get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
 append(...xs){for(let x of xs){if(!(x instanceof Element)){const n=new Element('#text');n.textContent=x;x=n;}x.parentElement=this;this.children.push(x);}}
 prepend(...xs){const n=this.children.slice();this.children=[];this.append(...xs,...n);}
 appendChild(x){this.append(x);return x;}removeChild(x){this.children=this.children.filter(n=>n!==x);}
 replaceChildren(...xs){this._text='';this.children=[];this.append(...xs);}remove(){this.parentElement?.removeChild(this);}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=String(v);if(k==='class')this.className=String(v);}
 getAttribute(k){return this.attrs[k]||this[k]||null;}removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,f){this.events[k]=f;}querySelectorAll(s){return walk(this).slice(1).filter(n=>matches(n,s));}querySelector(s){return this.querySelectorAll(s)[0]||null;}
 scrollIntoView(){}focus(){}click(){this.events.click?.({target:this});}
}
function walk(n){return[n].concat(n.children.flatMap(walk));}
function matches(n,s){if(s.startsWith('#'))return n.id===s.slice(1);if(s.startsWith('.'))return String(n.className||'').split(' ').includes(s.slice(1));return n.tagName===s.toUpperCase();}
function environment(search='',fragment='',root=ROOT){
 const dom=new Element('document');const ids=new Set(['root','detail','list','fGrade','fMember','fBook','fChapter','match-count']);
 for(const file of ['sources.html','explore/index.html'])for(const m of read(file,root).matchAll(/\bid="([^"]+)"/g))ids.add(m[1]);
 for(const id of ids){const n=new Element('div');n.id=id;dom.append(n);}
 const document={currentScript:{src:'https://example.test/nested/graph/assets/subjects.js'},createElement:t=>new Element(t),createElementNS:(_ns,t)=>new Element(t),createTextNode:t=>{const e=new Element('#text');e.textContent=t;return e;},getElementById:id=>walk(dom).find(n=>n.id===id)||null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},removeEventListener(){},documentElement:new Element('html'),head:{},body:new Element('body')};
 const storage=new Map(),window={addEventListener(){},scrollTo(){},DiagEngine:E,SessionCompatibility:Compat,ChoiceOrder:require(path.join(root,'diagnose/choice-order.js'))};
 const location={search,hash:fragment,pathname:'/nested/graph/diagnose/index.html'};
 const context=vm.createContext({window,document,location,URL,URLSearchParams,setTimeout,clearTimeout,console,Blob,SessionCompatibility:Compat,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},history:{replaceState(){}}});
 vm.runInContext(read('assets/data-manifest.js',root),context);
 document.head.appendChild=script=>{const u=new URL(script.src);ok(u.pathname.startsWith('/nested/graph/data/runtime/'),'nested deployment path');vm.runInContext(read('data/runtime/'+path.basename(u.pathname),root),context);script.onload();};
 vm.runInContext(read('assets/subjects.js',root),context);context.Subjects=window.Subjects;
 return {context,window,document,dom,storage,S:window.Subjects};
}
function diagnose(env,root=ROOT){
 const marker='\n  init();\n})();',code=read('diagnose/app.js',root);ok(code.includes(marker),'diagnose capture anchor');
 vm.runInContext(code.replace(marker,'\n window.F={loadData,scopeTargets,resolveTargets,buildTree,volumeRows,gradeCard,sessionKey,detectSubject,renderStart,restoreSession,applySubjectChrome,data:()=>D,setSubject:s=>subject=s,setGrade:(g,v)=>{gradeSel=g;volSel=v||"";},session:()=>session};\n})();'),env.context);return env.window.F;
}
function explore(env){
 const marker='\n  subject = readSubject();',code=read('explore/app.js');ok(code.includes(marker),'explore capture anchor');
 vm.runInContext(code.split(marker)[0]+'\n window.F={load,readSubject,gradeLabel,chapterOf,detail:id=>{selected=id;renderDetail();},setSubject:s=>subject=s,runQuery:(search,s)=>{subject=s;grade="";stage="";domain="";query="";book="";chapter="";member="";location.search=search;applyQuery();return {grade,stage,book,chapter,member};},visible:()=>topics.filter(passFilter).map(t=>t.id)};\n})();',env.context);return env.window.F;
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
async function main(){
 await check('changed JavaScript and all inline HTML scripts parse',()=>{
  const files=['assets/subjects.js','assets/home.js','assets/medical-ui.js','assets/medical-sources.js','assets/merged-sources.js','assets/school-science-sources.js','explore/app.js','diagnose/app.js','diagnose/session-compatibility.js'];
  for(const f of files)new vm.Script(read(f),{filename:f});
  for(const f of ['index.html','sources.html','explore/index.html','diagnose/index.html'])for(const m of read(f).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:f});
 });
 await check('nine navigation entries, grouped provenance and original anchors',()=>{
  for(const f of ['index.html','sources.html','explore/index.html','diagnose/index.html']){const html=read(f);equal((html.match(/data-subject=/g)||[]).length,9,f);ok(!/data-subject="(?:uphysics|uchemistry|herbal)"/.test(html),'no obsolete subject tab');}
  const html=read('sources.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);equal(new Set(ids).size,ids.length,'unique static source anchors');
  for(const id of ['physics','chemistry','tcm','tcm-core','herbal','uphysics','uchemistry','phys8a','phys8b','phys9','chem9a','chem9b'])ok(ids.includes(id),'preserved source anchor '+id);
  ok(html.includes('data/subject-bridge-sources.json'),'bridge source metadata linked');
 });
 for(const subject of ['physics','chemistry','tcm'])await check(subject+': all module, volume, chapter and original target routes select exact IDs',async()=>{
  const env=environment('?subject='+subject),F=diagnose(env);F.setSubject(subject);await F.loadData();const topics=F.data().topics;details[subject]={topics:topics.length,questions:Object.values(F.data().graph.bank).reduce((n,qs)=>n+qs.length,0),chapter_routes:0};
  const S=env.S;
  for(const c of S.coursesFor(subject)){
   const expected=topics.filter(t=>t.module===c.id).map(t=>t.id);equal(F.scopeTargets(c.id).ids,expected,c.id+' scope');
   for(const key of ['module','course','volume','grade'])equal(F.resolveTargets(new URLSearchParams({[key]:key==='grade'?String(c.grade):c.id})).ids,expected,key+' route '+c.id);
  }
  for(const ch of Object.values(F.data().tree).flatMap(v=>v.chapters)){const expected=Object.values(F.data().tree).flatMap(v=>v.chapters).filter(x=>x.key===ch.key).flatMap(x=>x.topics.map(y=>y.t.id));equal(F.resolveTargets(new URLSearchParams({chapter:ch.key})).ids,expected,'chapter '+ch.key);details[subject].chapter_routes++;}
  for(const member of S.members(subject)){const raw=json('data/'+member+'-topics.json');for(const t of [raw[0],raw[raw.length-1]])equal(F.resolveTargets(new URLSearchParams({target:t.id})).ids,[t.id],'old target '+t.id);}
  if(S.mixedScience(subject)){
   for(const grade of S.specs[subject].grades){const scope={8:'八年级',9:'九年级',10:'高一',11:'高二',12:'高三'}[grade];equal(F.scopeTargets(scope).ids,topics.filter(t=>t.grade===grade).map(t=>t.id),'school grade '+grade);}
   F.setGrade('university');const card=F.gradeCard();ok(card.textContent.includes('全部大学模块'),'university screening range');
   for(const c of S.coursesFor(subject)){F.setGrade('university',c.id);ok(F.gradeCard().textContent.includes(S.courseTargets(topics,c.id,subject).label),'module screening label');}
  }else{F.setGrade('all');ok(F.gradeCard().textContent.includes('213 个知识点'),'all ten courses in screen selector');}
  equal(F.sessionKey(),subject+'Diagnose.session.v17','separate canonical session key');
 });
 await check('legacy aliases default to the old university or herbal scope',async()=>{
  for(const [old,canonical] of [['uphysics','physics'],['uchemistry','chemistry'],['herbal','tcm']]){
   const env=environment('?subject='+old),F=diagnose(env);F.setSubject(F.detectSubject());F.applySubjectChrome();await F.loadData();
   const expected=json('data/'+old+'-topics.json').map(t=>t.id);
   equal(F.resolveTargets(new URLSearchParams({module:'all'})).ids,expected,old+' all route');
   const G=explore(env);G.setSubject(canonical);await G.load();G.runQuery('?subject='+old,canonical);equal(G.visible(),expected,old+' initial browse scope');
  }
 });
 await check('explore separates school stages, university modules and tcm source families',async()=>{
  for(const subject of ['physics','chemistry','tcm']){
   const env=environment('?subject='+subject),F=explore(env);F.setSubject(subject);await F.load();const all=(await(await env.S.fetch('data/'+subject+'-topics.json',subject)).json());
   for(const c of env.S.coursesFor(subject)){F.runQuery('?subject='+subject+'&module='+c.id,subject);equal(F.visible(),all.filter(t=>t.module===c.id).map(t=>t.id),'module '+c.id);}
   if(env.S.mixedScience(subject))for(const stage of ['j','h','u']){F.runQuery('?subject='+subject+'&stage='+stage,subject);equal(F.visible(),all.filter(t=>env.S.stageCode(t.grade,subject)===stage).map(t=>t.id),'stage '+subject+' '+stage);}
   if(subject==='tcm')for(const member of ['tcm','herbal']){F.runQuery('?subject=tcm&member='+member,subject);equal(F.visible(),all.filter(t=>env.S.rawOf(t)===member).map(t=>t.id),'family '+member);}
   const t=all.find(t=>env.S.isAcademicTopic(t)),c=env.S.computingChapter(t);F.runQuery('?subject='+subject+'&chapter='+encodeURIComponent(c.volume+' '+c.chapterNo),subject);equal(F.visible(),all.filter(x=>env.S.isAcademicTopic(x)&&env.S.computingChapter(x).volume===c.volume&&env.S.computingChapter(x).chapterNo===c.chapterNo).map(x=>x.id),'legacy academic chapter route');
   ok(F.gradeLabel(t).includes(env.S.courseName(t.module,subject)),'university/course label');ok(!F.gradeLabel(t).includes('建议'),'university not mislabeled as school arrangement');
  }
 });
 await check('source renderers load raw members exactly once while group totals use merged data',async()=>{
  const env=environment('?subject=tcm');
  for(const f of ['assets/medical-sources.js','assets/school-science-sources.js','assets/merged-sources.js'])vm.runInContext(read(f),env.context);
  await settle();
  for(const raw of ['tcm','herbal','uphysics','uchemistry']){
   const count=json('data/'+raw+'-topics.json').length,summary=env.document.getElementById(raw+'-summary');ok(summary.textContent.includes(' '+count+' 个'),'raw count '+raw);
   const books=json('data/'+raw+'-sources.json').books;equal(env.document.getElementById(raw+'-books').children.length,books.length,'one card per original book '+raw);
   for(const a of walk(env.document.getElementById(raw+'-books')).filter(n=>n.tagName==='A'&&String(n.href).includes('explore/')))ok(a.href.includes('subject='+env.S.canonical(raw)),'canonical source topic link');
  }
  for(const subject of ['physics','chemistry','tcm']){
   const count=env.S.members(subject).reduce((n,r)=>n+json('data/'+r+'-topics.json').length,0);ok(env.document.getElementById(subject+'-merged-summary').textContent.includes(' '+count+' 个'),'merged count '+subject);
  }
 });
 await check('legacy records are listed separately, safe recovery copies one and blocked recovery preserves it',async()=>{
  const env=environment('?subject=tcm'),F=diagnose(env);F.setSubject('tcm');await F.loadData();const graph=F.data().graph;
  function record(id){let session=E.createSession(graph,[id],{seed:'v17-safe-fixture',limit:16});const next=E.nextItem(graph,session);session=E.applyAnswer(graph,session,id,'wrong',{text:next.question.choices?.find(c=>c.key!==next.question.answer)?.key});return {v:2,targets:session.targets,answers:session.answers,limit:16,mode:'target',seed:session.seed,avoid:[],label:graph.byId[id].name};}
  const a=record('tcm_basics_001'),b=record('herbal_materia_001');env.storage.set('tcmDiagnose.session.v1',JSON.stringify(a));env.storage.set('herbalDiagnose.session.v1',JSON.stringify(b));const before=[...env.storage];F.renderStart();
  const shown=env.document.getElementById('root').textContent;ok(shown.includes('原中医')&&shown.includes('原中药'),'two independent labels');equal([...env.storage],before,'render does not write or clear');
  ok(F.restoreSession(b,'herbalDiagnose.session.v1'),'safe restore');equal(F.session().answers,b.answers,'only selected answers restored');equal(env.storage.get('tcmDiagnose.session.v1'),before[0][1],'other old record unchanged');equal(env.storage.get('herbalDiagnose.session.v1'),before[1][1],'selected old record unchanged');ok(env.storage.has('tcmDiagnose.session.v17'),'new storage key used');
  const broken=JSON.parse(JSON.stringify(a));broken.answers[0].qid='missing';env.storage.set('tcmDiagnose.session.v1',JSON.stringify(broken));const unsafe=env.storage.get('tcmDiagnose.session.v1');ok(!F.restoreSession(broken,'tcmDiagnose.session.v1'),'unsafe resume rejected');F.renderStart();ok(env.document.getElementById('root').textContent.includes('原记录保留'),'blocked record warning');equal(env.storage.get('tcmDiagnose.session.v1'),unsafe,'rejected record still present');
 });
 await check('corrected historical judgments resume while wrong question identities and out-of-scope answers are rejected',async()=>{
  const env=environment('?subject=physics'),F=diagnose(env);F.setSubject('physics');await F.loadData();const graph=F.data().graph;
  const target=F.data().topics.find(t=>graph.prereqs[t.id].length>0&&graph.prereqs[t.id].some(p=>E.pickQuestion(graph,E.createSession(graph,[t.id],{seed:'edited-record'}),p.id,1)));
  ok(target,'test target has testable prerequisites');let session=E.createSession(graph,[target.id],{seed:'edited-record',limit:16});
  for(let i=0;i<3;i++){const next=E.nextItem(graph,session);ok(next,'original sequence has a follow-up');session=E.applyAnswer(graph,session,next.topicId,'wrong');}
  const changed=session.answers.map((a,i)=>Object.assign({},a,{result:i===0?'correct':a.result}));
  const rebuilt=E.replay(graph,session.targets,changed,{seed:session.seed,limit:16,avoid:session.avoid});
  const saved={v:3,targets:rebuilt.targets,mode:'target',limit:16,seed:rebuilt.seed,avoid:rebuilt.avoid,answers:rebuilt.answers};
  const result=Compat.inspect(graph,saved,E);ok(result.ok,'app-produced edited record remains restorable');ok(result.orderChanged,'historical order deviation is reported');equal(result.session.answers,rebuilt.answers,'edited question identities preserved');
  const outside=F.data().topics.find(t=>!new Set(rebuilt.order).has(t.id));ok(outside,'out-of-scope topic exists');
  let foreign=E.createSession(graph,[outside.id],{seed:'edited-record'});const next=E.nextItem(graph,foreign);foreign=E.applyAnswer(graph,foreign,next.topicId,'wrong');
  const crossed=Object.assign({},saved,{answers:[foreign.answers[0]]});ok(!Compat.inspect(graph,crossed,E).ok,'target ancestor scope enforced');
  const screened=Object.assign({},saved,{mode:'screen'});ok(!Compat.inspect(graph,screened,E).ok,'screen excludes prerequisite outside explicit targets');
  const other=JSON.parse(JSON.stringify(saved));const q=E.questionById(graph,other.answers[0].qid);other.answers[0].qid=F.data().topics.flatMap(t=>[t.id+'_q1',t.id+'_q2']).find(id=>id!==q.id&&E.questionById(graph,id)?.topicId===q.topicId);ok(other.answers[0].qid,'alternate same-topic question exists');ok(!Compat.inspect(graph,other,E).ok,'valid bank qid that differs from reconstructed selection rejected');
  ok(!Compat.inspect(graph,Object.assign({},saved,{limit:1}),E).ok,'excess answers rejected');
 });
 await check('export retains the complete replay inputs including avoid history',()=>{const code=read('diagnose/app.js');ok(code.includes('limit: session.limit, seed: session.seed, avoid: session.avoid, asked:'),'export seed and avoidance list');ok(code.includes('SessionCompatibility.inspect(D.graph, saved, E)'),'restoration uses strict replay');ok(code.includes('new Blob([serializeExport()]'),'native download uses shared serialization');ok(code.includes("textContent=serializeExport()"),'visible preview uses same serialization');ok(code.includes("id:'export-preview'"),'visible export fallback exists');});
 if(BASE)await check('unaffected six disciplines keep their data, chapter routes and session storage keys',async()=>{
  for(const subject of ['math','english','biology','geography','cs408','med']){
   const env=environment('?subject='+subject),old=environment('?subject='+subject,'',BASE),F=diagnose(env),B=diagnose(old,BASE);F.setSubject(subject);B.setSubject(subject);await F.loadData();await B.loadData();
   equal(F.data().topics,B.data().topics,subject+' raw topics');equal(F.data().deps,B.data().deps,subject+' deps');equal(F.data().tree,B.data().tree,subject+' chapter tree');equal(F.sessionKey(),B.sessionKey(),subject+' storage key');
   const chapters=Object.values(F.data().tree).flatMap(v=>v.chapters);for(const c of [chapters[0],chapters[chapters.length-1]])equal(F.resolveTargets(new URLSearchParams({chapter:c.key})),B.resolveTargets(new URLSearchParams({chapter:c.key})),subject+' chapter route');
  }
 });
 return {status:'PASS',group_count:checks.length,groups:checks,assertions,details,bridge_count:json('data/subject-bridge-dependencies.json').length,scope:'JavaScript, exact UI route scopes, grouped source rendering and local record compatibility using DOM test doubles',limitations:['These checks do not assert browser layout or real clicks; those are recorded separately.','Original semantic validity and bridge review are independently validated by the root review.']};
}
main().then(result=>{result.checked_at=new Date().toISOString();result.input_sha256=Object.fromEntries(['assets/subjects.js','assets/home.js','explore/app.js','diagnose/app.js','diagnose/session-compatibility.js','sources.html','data/subject-bridge-dependencies.json'].map(f=>[f,sha(f)]));fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,groups:checks.length,assertions,bridge_count:result.bridge_count}));}).catch(error=>{fs.writeFileSync(reportPath,JSON.stringify({status:'FAIL',failed_group:current,error:error.stack,completed_groups:checks,assertions},null,2)+'\n');console.error(error.stack);process.exitCode=1;});
