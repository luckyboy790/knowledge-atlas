/* Structural checks and real-engine simulations. Semantic review is recorded separately. */
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), baseline=process.argv[2] && path.resolve(process.argv[2]);
const read=(name)=>JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
const E=require(path.join(root,'diagnose/engine.js')), C=require(path.join(root,'diagnose/choice-order.js'));
let checks=0; const check=(x,msg)=>{checks++;assert.ok(x,msg);};
const ctx={window:{},URL,URLSearchParams,location:{search:'?subject=cs408',hash:''},setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/data-manifest.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),ctx);
const S=ctx.window.Subjects;
const topics=read('cs408-topics.json'), qs=read('cs408-questions.json'), deps=read('cs408-dependencies.json');
const sources=read('cs408-sources.json'), coverage=read('cs408-coverage.json');
const byId=new Map(topics.map(t=>[t.id,t])), byQ=new Map(qs.map(q=>[q.id,q]));
const bookIds=new Set(sources.books.map(b=>b.id));
const courseIds=['ds','co','os','cn'];
const expectedUnits={ds:7,co:7,os:5,cn:6};
check(byId.size===topics.length,'Duplicate topic IDs');
check(byQ.size===qs.length,'Duplicate question IDs');
check(topics.length>0,'No 408 topics');
for (const course of courseIds) {
  const own=topics.filter(t=>t.module===course);
  check(own.length>0,'Missing course '+course);
  check(new Set(own.map(t=>t.chapter)).size===expectedUnits[course],course+' incomplete learning units');
  check(coverage.modules.some(m=>m.module===course),course+' missing course coverage');
}
check(sources.official_outline.full_text_verified===false,'Unsupported latest-outline full-text claim');
let judgeChecks=0, shuffledChecks=0;
for (const t of topics) {
  check(/^cs408_(ds|co|os|cn)_\d{3}$/.test(t.id),t.id+' malformed ID');
  check(t.subject==='cs408' && courseIds.includes(t.module),t.id+' subject/course mismatch');
  check(t.id.split('_')[1]===t.module,t.id+' course code mismatch');
  check(t.grade===17+courseIds.indexOf(t.module),t.id+' UI course encoding mismatch');
  check(t.description && t.description.length>=20,t.id+' missing description');
  check(t.mastery_criteria?.length>=2,t.id+' missing mastery criteria');
  check(!t.external,t.id+' must be a testable node');
  check(t.textbook && bookIds.has(t.textbook.book),t.id+' unknown book/source');
  check(t.textbook.chapter && t.textbook.section,t.id+' missing chapter/topic locator');
  check(/^https:\/\//.test(t.textbook.source_url||''),t.id+' missing source URL');
  check(!/undefined|\[object Object\]/.test(S.reference(t)),t.id+' malformed displayed source');
  check(t.exam_scope?.unit && t.exam_scope?.point,t.id+' missing scope mapping');
  const own=qs.filter(q=>q.topicId===t.id);
  check(own.length===2,t.id+' expected exactly two diagnostics');
  check(own.some(q=>q.difficulty==='basic') && own.some(q=>q.difficulty==='standard'),t.id+' missing diagnostic difficulty pair');
  check(t.diagnostic_question?.question && t.diagnostic_question?.answer,t.id+' missing browser sample');
}
for (const q of qs) {
  check(byId.has(q.topicId),q.id+' dangling question');
  check(q.type==='choice' && q.choices?.length===4,q.id+' expected four choices');
  check(q.prompt && q.explanation && q.explanation.length>=12,q.id+' empty prompt/explanation');
  check(q.origin && q.origin.includes('原创'),q.id+' missing originality label');
  check(q.textbook?.book===byId.get(q.topicId).textbook.book,q.id+' source mismatch');
  check(q.choices.map(c=>c.key).sort().join('')==='ABCD',q.id+' invalid choice keys');
  check(new Set(q.choices.map(c=>c.text.trim())).size===4,q.id+' duplicate choice text');
  check(q.choices.filter(c=>c.key===q.answer).length===1,q.id+' invalid answer key');
  for (const c of q.choices) { check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' grading error');judgeChecks++; }
  for (const seed of ['408-a','408-b','408-c','408-d','408-e']) {
    const ordered=C.ordered(q,seed);
    check(JSON.stringify(ordered)===JSON.stringify(C.ordered(q,seed)),q.id+' unstable shuffle');
    check(ordered.map(c=>c.label).join('')==='ABCD',q.id+' invalid display labels');
    check(new Set(ordered.map(c=>c.key)).size===4,q.id+' shuffle lost choice');
    for(const c of ordered) {check(E.judgeQuestion(q,c.key).verdict===(c.key===q.answer?'correct':'wrong'),q.id+' shuffled grading error');shuffledChecks++;}
  }
}
const indegree=new Map(topics.map(t=>[t.id,0])), next=new Map(topics.map(t=>[t.id,[]])), edgeKeys=new Set();
for(const e of deps) {
  check(byId.has(e.topicId) && byId.has(e.prerequisiteId),'Dangling edge '+JSON.stringify(e));
  check(e.topicId!==e.prerequisiteId,'Self-loop '+e.topicId);
  const k=e.prerequisiteId+'->'+e.topicId;
  check(!edgeKeys.has(k),'Duplicate edge '+k);edgeKeys.add(k);
  check(['hard','soft'].includes(e.strength),'Invalid strength '+k);
  check(e.reason?.length>=8,'Missing pedagogical reason '+k);
  indegree.set(e.topicId,indegree.get(e.topicId)+1);next.get(e.prerequisiteId).push(e.topicId);
}
const ready=topics.filter(t=>!indegree.get(t.id)).map(t=>t.id), order=[];
while(ready.length){const id=ready.shift();order.push(id);for(const n of next.get(id)){indegree.set(n,indegree.get(n)-1);if(!indegree.get(n))ready.push(n);}}
check(order.length===topics.length,'Prerequisite graph contains a cycle');
const bridge=deps.filter(e=>byId.get(e.topicId).module!==byId.get(e.prerequisiteId).module);
check(bridge.length>0,'No cross-course prerequisite connections');
const mapped=[];
function walk(v){if(!v || typeof v!=='object')return;if(Array.isArray(v)){v.forEach(walk);return;}for(const[k,x]of Object.entries(v)){if(['topicIds','topic_ids'].includes(k)&&Array.isArray(x))mapped.push(...x);else walk(x);}}
walk(coverage);const covered=new Set(mapped);
for(const id of mapped)check(byId.has(id),'Unknown coverage topic '+id);
for(const t of topics)check(covered.has(t.id),t.id+' missing coverage mapping');
const graph=E.buildGraph(S.engineTopics(topics),deps,qs);
check(graph.topics.every(t=>t.grade===17),'Courses must share an engine stage for topological ordering');
let targetSessions=0,screenSessions=0;
function simulate(ids,response,mode,limit) {
  const allowed=new Set(ids);
  let s=E.createSession(graph,ids,{mode,limit,seed:'408-independent-engine-audit'}),i=0,item;
  while((item=E.nextItem(graph,s))) {
    check(i++<limit+1,'Diagnosis did not terminate');
    if(mode==='screen')check(allowed.has(item.topicId),'Screening escaped selected course');
    const result=response==='mixed'?(i%2?'wrong':'correct'):response;
    s=E.applyAnswer(graph,s,item.topicId,result);
  }
  const sum=E.summarize(graph,s),layout=E.layout(graph,s,sum);
  check(sum.finished,'Session not finished');
  check(sum.asked<=limit,'Question limit exceeded');
  check(sum.path.every(p=>byId.has(p.id)),'Unknown path node');
  check(layout.nodes.every(n=>byId.has(n.id)),'Unknown graph node');
  const pathIndex=new Map(sum.path.map((p,i)=>[p.id,i]));
  for(const e of deps)if(pathIndex.has(e.topicId)&&pathIndex.has(e.prerequisiteId))check(pathIndex.get(e.prerequisiteId)<pathIndex.get(e.topicId),'Path violates prerequisite order '+e.prerequisiteId+'->'+e.topicId);
  const replay=E.replay(graph,s.targets,s.answers,{mode,seed:s.seed,limit:s.limit});
  check(JSON.stringify(replay.status)===JSON.stringify(s.status),'Restored status mismatch');
  if(mode==='screen') {
    const chapters=E.chapterSummary(graph,s);
    check(chapters.reduce((n,c)=>n+c.total,0)===ids.length,'Chapter summary total mismatch');
    for(const c of chapters)check(c.volume && c.chapterNo && c.chapterName,'Empty chapter label');
  } else {
    if(response==='correct')check(sum.mastered.includes(ids[0]),'Correct target not mastered');
    if(response==='wrong'||response==='skip')check(sum.weak.includes(ids[0]),'Repeated wrong/skip not weak');
  }
}
for(const t of topics)for(const response of ['correct','wrong','skip','mixed']){simulate([t.id],response,'target',20);targetSessions++;}
for(const course of [...courseIds,'all'])for(const response of ['correct','wrong','skip','mixed']){simulate(topics.filter(t=>course==='all'||t.module===course).map(t=>t.id),response,'screen',30);screenSessions++;}
let runtimeFiles=0;
for(const[file,asset]of Object.entries(ctx.window.ToyDataFiles)) {
  let key,raw;
  vm.runInNewContext(fs.readFileSync(path.join(root,'data/runtime',asset),'utf8'),{window:{ToyData:{register:(k,r)=>{key=k;raw=r;}}}});
  check(key===file && raw===fs.readFileSync(path.join(root,'data',file),'utf8'),file+' runtime drift');runtimeFiles++;
}
const preserved=[];
if(baseline) {
  for(const file of fs.readdirSync(path.join(baseline,'data')).filter(f=>f.endsWith('.json'))) {
    check(fs.readFileSync(path.join(root,'data',file)).equals(fs.readFileSync(path.join(baseline,'data',file))),'Existing subject source changed '+file);preserved.push(file);
  }
  check(fs.readFileSync(path.join(root,'diagnose/engine.js')).equals(fs.readFileSync(path.join(baseline,'diagnose/engine.js'))),'Core engine changed');
}
const report={date:'2026-10-30',result:'PASS',topics:topics.length,questions:qs.length,dependencies:deps.length,cross_course_dependencies:bridge.length,courses:courseIds.map(module=>({module,topics:topics.filter(t=>t.module===module).length,questions:qs.filter(q=>byId.get(q.topicId).module===module).length,learning_units:new Set(topics.filter(t=>t.module===module).map(t=>t.chapter)).size})),coverage_topics:covered.size,judge_checks:judgeChecks,shuffled_choice_checks:shuffledChecks,target_sessions:targetSessions,screen_sessions:screenSessions,runtime_files:runtimeFiles,preserved_existing_json:preserved,assertions:checks,limitations:['脚本检查引用、结构、判分实现与诊断终止性，不证明教材知识和答案语义正确。','内容交叉审阅与独立计算核验、真实页面交互另列记录。']};
fs.writeFileSync(path.join(root,'validation/cs408-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
