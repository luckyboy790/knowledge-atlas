#!/usr/bin/env node
/* Structural, provenance-binding and assessment checks for the two new subjects.
 * Usage: node scripts/validate_biogeo.cjs [v15-baseline] [--require-reviewed]
 * Scientific correctness is assessed by separate independent content reviews.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const baselineArg=args.find(x=>!x.startsWith('--'));
const baseline=baselineArg?path.resolve(baselineArg):null;
const reviewed=args.includes('--require-reviewed');
const reportFile=path.join(root,'validation/biogeo-validation.json');
const E=require(path.join(root,'diagnose/engine.js'));
const Choice=require(path.join(root,'diagnose/choice-order.js'));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sum=a=>a.reduce((x,y)=>x+y,0);
const subjects=['biology','geography'],prefixes={biology:'cnb_',geography:'cng_'};
const parts=['topics','questions','dependencies','sources','coverage'];
let assertions=0,group='startup';
const groups=[],resultSubjects={},hashes={};
function check(value,message){assertions++;assert.ok(value,message);}
function equal(a,b,message){assertions++;assert.deepEqual(a,b,message);}
function start(name){group=name;groups.push(name);}
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
function semantic(item){return sha(Buffer.from(stable(Object.fromEntries(Object.entries(item).filter(([k])=>!['review_status','review_record'].includes(k))))));}
function groupKey(book,unit,chapter){return [book,unit||'',chapter].join('|');}
function dag(topics,deps){
 const by=new Map(topics.map(t=>[t.id,t])),incoming=new Map(topics.map(t=>[t.id,0])),out=new Map(topics.map(t=>[t.id,[]]));
 for(const e of deps){check(by.has(e.topicId)&&by.has(e.prerequisiteId),'all edge endpoints exist');incoming.set(e.topicId,incoming.get(e.topicId)+1);out.get(e.prerequisiteId).push(e.topicId);}
 const queue=topics.filter(t=>incoming.get(t.id)===0).map(t=>t.id);let visited=0;
 for(let i=0;i<queue.length;i++){visited++;for(const id of out.get(queue[i])){incoming.set(id,incoming.get(id)-1);if(incoming.get(id)===0)queue.push(id);}}
 equal(visited,topics.length,'directed graph must be acyclic');
}
function runSession(graph,ids,mode,policy,seed){
 let session=E.createSession(graph,ids,{mode,limit:20,seed}),record=[];
 const targets=new Set(ids);let safety=0;
 while(!E.summarize(graph,session).finished){
  const item=E.nextItem(graph,session);check(item,'unfinished session has next item');
  if(mode==='screen')check(targets.has(item.topicId),'screen stays inside its selected scope');
  const verdict=policy==='correct'?'correct':policy==='wrong'?'wrong':policy==='skip'?'skip':(record.length%3===0?'correct':record.length%3===1?'wrong':'skip');
  record.push({topicId:item.topicId,questionId:item.question.id,verdict});
  session=E.applyAnswer(graph,session,item.topicId,verdict,{text:verdict==='skip'?null:'synthetic validation'});
  check(++safety<=20,'question cap is enforced');
 }
 const summary=E.summarize(graph,session);
 check(summary.asked<=20&&summary.finished,'session terminates at or before cap');
 for(const k of ['weak','shaky','mastered','untested'])check(summary[k].every(id=>session.order.includes(id)),k+' is inside evaluated scope');
 let replay=E.createSession(graph,ids,{mode,limit:20,seed});
 for(const event of record){
  const next=E.nextItem(graph,replay);equal(next.question.id,event.questionId,'seeded replay presents same question');
  replay=E.applyAnswer(graph,replay,event.topicId,event.verdict,{text:event.verdict==='skip'?null:'synthetic validation'});
 }
 equal(E.summarize(graph,replay),summary,'event replay reproduces result');
 const order=new Map(summary.path.map((x,i)=>[x.id,i]));
 for(const d of graph.topics.flatMap(t=>graph.prereqs[t.id].map(e=>({topicId:t.id,prerequisiteId:e.id})))){
  if(order.has(d.topicId)&&order.has(d.prerequisiteId))check(order.get(d.prerequisiteId)<order.get(d.topicId),'learning path respects prerequisite order');
 }
 const chapters=E.chapterSummary(graph,session);
 equal(sum(chapters.map(c=>c.total)),session.order.filter(id=>!graph.byId[id].external).length,'chapter result totals cover the actual session scope');
 return record.length;
}
async function main(){
 try{
  start('subject definitions and independent runtime loading');
  const context={window:{},URL,URLSearchParams,location:{search:'?subject=biology',hash:''},setTimeout,clearTimeout};
  const realm=vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/data-manifest.js'),'utf8'),realm);
  context.document={currentScript:{src:'https://example.test/atlas/assets/subjects.js'},createElement(){return {remove(){}};},head:{appendChild(script){
   const u=new URL(script.src);const name=path.basename(u.pathname);check(!name.includes('..'),'safe runtime basename');
   vm.runInContext(fs.readFileSync(path.join(root,'data/runtime',name),'utf8'),realm);script.onload();
  }}};
  vm.runInContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),realm);
  const S=context.window.Subjects;
  equal(Object.keys(S.names).sort(),['math','english','physics','chemistry','cs408','med','tcm','herbal','uphysics','uchemistry',...subjects].sort(),'twelve subject identities');
  const allTopicFiles=fs.readdirSync(path.join(root,'data')).filter(f=>/(?:^|-)topics\.json$/.test(f));
  const allQuestionFiles=fs.readdirSync(path.join(root,'data')).filter(f=>/(?:^|-)questions\.json$/.test(f));
  const allDependencyFiles=fs.readdirSync(path.join(root,'data')).filter(f=>/(?:^|-)dependencies\.json$/.test(f));
  const allTopics=allTopicFiles.flatMap(f=>read('data/'+f)),allQuestions=allQuestionFiles.flatMap(f=>read('data/'+f)),allDeps=allDependencyFiles.flatMap(f=>read('data/'+f));
  equal(new Set(allTopics.map(t=>t.id)).size,allTopics.length,'globally unique topic IDs');
  equal(new Set(allQuestions.map(q=>q.id)).size,allQuestions.length,'globally unique question IDs');
  let targetSessions=0,screenSessions=0,gradingCases=0,shuffledCases=0;
  for(const subject of subjects){
   start(subject+' source, coverage and item integrity');
   const d=Object.fromEntries(parts.map(part=>[part,read('data/'+subject+'-'+part+'.json')]));
   const {topics,questions,dependencies,sources,coverage}=d;
   for(const part of parts){const file=subject+'-'+part+'.json';hashes[file]=sha(fs.readFileSync(path.join(root,'data',file)));}
   check(Array.isArray(topics)&&topics.length>0,'nonempty topic array');equal(questions.length,topics.length*2,'two questions for every topic');
   equal(sources.subject,subject,'source subject');equal(coverage.subject,subject,'coverage subject');
   equal(sources.checked_date,'2026-11-01','source check date');
   equal(sources.books.length,9,'four junior and five senior textbook volumes');
   const books=new Map(sources.books.map(b=>[b.id,b]));equal(books.size,9,'unique book IDs');
   equal(new Set(sources.books.map(b=>b.volume)).size,9,'unique book labels within subject');
   equal(sources.books.filter(b=>b.grade<=9).length,4,'four junior books');
   equal(sources.books.filter(b=>b.curriculum_level==='必修').length,2,'two compulsory senior books');
   equal(sources.books.filter(b=>b.curriculum_level==='选择性必修').length,3,'three elective-compulsory books');
   for(const b of books.values()){
    check(b.title&&b.volume&&b.publisher&&b.verification,'book identity and verification boundary');
    check(/^https?:\/\//.test(b.source_url||''),'book source URL');
    check(b.evidence_level,'book declares actual evidence level');
   }
   const byId=new Map(topics.map(t=>[t.id,t])),qById=new Map(questions.map(q=>[q.id,q]));
   const sourceTopics=new Map((sources.topics||[]).map(t=>[t.id,t]));equal(sourceTopics.size,topics.length,'source map covers every topic');
   const chapterKeys=new Set(),fingerprints=new Set();
   for(const [index,t] of topics.entries()){
    equal(t.id,prefixes[subject]+String(index+1).padStart(3,'0'),'continuous canonical IDs');
    equal(t.subject,subject,'explicit subject');check([7,8,10,11,12].includes(t.grade),'supported school stage');
    check(['上','下','全'].includes(t.semester),'valid semester');equal(t.external,false,'new nodes are internal');
    equal(t.epistemic_status,'modern_'+subject,'epistemic context');
    check(t.name&&t.description&&t.domain&&t.chapter,'meaningful text fields exist');
    check(Array.isArray(t.mastery_criteria)&&t.mastery_criteria.length>=2&&t.mastery_criteria.every(x=>typeof x==='string'&&x.trim()),'specific mastery criteria are present');
    const b=books.get(t.textbook?.book);check(b,'topic refers to registered book');
    equal(t.textbook.title,b.title,'book title matches bibliography');equal(t.textbook.volume,b.volume,'book volume matches bibliography');
    equal(t.grade,b.grade,'suggested grade matches book');equal(t.semester,b.semester,'semester matches book');equal(t.curriculum_level,b.curriculum_level,'curriculum level matches book');
    check(t.textbook.chapter&&t.textbook.section&&t.textbook.verification,'real locator and verification scope present');
    check(/^https?:\/\//.test(t.textbook.source_url||''),'topic source is a web reference');
    equal(sourceTopics.get(t.id)?.textbook,t.textbook,'source index matches topic locator');
    if(t.grade>=10)check(/建议/.test(t.grade_assignment_note||''),'senior grade is disclosed as suggested arrangement');
    chapterKeys.add(groupKey(t.textbook.book,t.textbook.unit,t.textbook.chapter));
    const pair=[1,2].map(n=>qById.get(t.id+'_q'+n));check(pair.every(Boolean),'two canonical question IDs');
    check(pair[0].prompt!==pair[1].prompt,'two questions differ');
    for(const [i,q] of pair.entries()){
     equal(q.topicId,t.id,'question topic reference');equal(q.type,'choice','four-choice question');equal(q.difficulty,i===0?'basic':'standard','question difficulty pair');
     equal(q.textbook,t.textbook,'question textbook locator');equal(q.origin,'原创练习，不是教材原题','original provenance');
     check(q.prompt&&q.explanation,'prompt and explanation present');equal(q.choices.length,4,'four choices');
     equal(q.choices.map(c=>c.key),['A','B','C','D'],'canonical original keys');equal(new Set(q.choices.map(c=>c.text.trim())).size,4,'different option texts');
     check(q.choices.some(c=>c.key===q.answer),'valid keyed answer');
     const fp=stable({prompt:q.prompt,choices:q.choices,answer:q.answer});check(!fingerprints.has(fp),'no exact duplicate question');fingerprints.add(fp);
     const before=JSON.stringify(q);const display=Choice.ordered(q,'biogeo-validation-seed');
     equal(Choice.ordered(q,'biogeo-validation-seed'),display,'stable option shuffle');equal(JSON.stringify(q),before,'shuffle does not mutate the bank');
     equal(new Set(display.map(c=>c.key)).size,4,'shuffle preserves original keys');equal(display.map(c=>c.label),['A','B','C','D'],'display labels are sequential');
     for(const c of q.choices){equal(E.judgeQuestion(q,c.key).verdict,c.key===q.answer?'correct':'wrong','original-key grading');gradingCases++;}
     for(const c of display){equal(c.text,q.choices.find(x=>x.key===c.key).text,'display text belongs to original key');equal(E.judgeQuestion(q,c.key).verdict,c.key===q.answer?'correct':'wrong','shuffled-key grading');shuffledCases++;}
    }
    equal(t.diagnostic_question,{question:pair[0].prompt,answer:pair[0].choices.find(c=>c.key===pair[0].answer).text},'inline diagnostic equals first actual question');
   }
   const mapped=[];
   equal(coverage.books.length,9,'coverage lists all volumes');
   for(const b of coverage.books){check(books.has(b.book),'coverage book exists');
    for(const c of b.chapters){for(const sec of c.sections){
     check(sec.section&&Array.isArray(sec.topic_ids)&&sec.topic_ids.length>0,'covered locator has core topics');
     for(const id of sec.topic_ids){const t=byId.get(id);check(t,'coverage refers to real topic');
      equal(t.textbook.book,b.book,'coverage book');equal(t.textbook.unit||'',c.unit||'','coverage unit');equal(t.textbook.chapter,c.chapter,'coverage chapter');equal(t.textbook.section,sec.section,'coverage section');mapped.push(id);
     }
    }}
   }
   equal(mapped.slice().sort(),topics.map(t=>t.id).sort(),'coverage maps each topic exactly once');
   const observedCatalog=read('validation/biogeo-catalog-review.json').subjects[subject];
   equal(coverage.books.map(b=>b.book).sort(),observedCatalog.books.map(b=>b.book).sort(),'book coverage matches independently read official evidence');
   const expectedChapters=observedCatalog.books.flatMap(b=>b.chapters.map(c=>groupKey(b.book,c.unit,c.chapter))).sort();
   const actualChapters=coverage.books.flatMap(b=>b.chapters.map(c=>groupKey(b.book,c.unit,c.chapter))).sort();
   equal(actualChapters,expectedChapters,'implemented chapter map matches independently reviewed official framework');
   if(subject==='geography'){
    const expectedSections=observedCatalog.books.flatMap(b=>b.chapters.flatMap(c=>c.sections.map(s=>groupKey(b.book,c.unit,c.chapter)+'|'+s))).sort();
    const actualSections=coverage.books.flatMap(b=>b.chapters.flatMap(c=>c.sections.map(s=>groupKey(b.book,c.unit,c.chapter)+'|'+s.section))).sort();
    equal(actualSections,expectedSections,'geography locators match observed official companion TOCs');
   }else{
    for(const t of topics)check(/^本图谱主题[：:]/.test(t.textbook.section),'biology original subdivisions are not presented as original textbook sections');
   }
   equal(coverage.topic_count,topics.length,'coverage topic count');equal(coverage.question_count,questions.length,'coverage question count');equal(coverage.dependency_count,dependencies.length,'coverage edge count');
   const edgeKeys=new Set();
   for(const e of dependencies){check(byId.has(e.topicId)&&byId.has(e.prerequisiteId),'both edge endpoints are inside this loaded subject');check(e.topicId!==e.prerequisiteId,'no self edge');check(['hard','soft'].includes(e.strength),'edge strength');check(typeof e.reason==='string'&&e.reason.trim(),'specific prerequisite reason exists');const key=e.topicId+'|'+e.prerequisiteId;check(!edgeKeys.has(key),'no duplicate edge');edgeKeys.add(key);}
   dag(topics,dependencies);
   const loaded=await (await S.fetch('data/'+S.data('topics.json',subject),subject)).json();equal(JSON.parse(JSON.stringify(loaded)),topics,'runtime fetch loads the new subject topics');
   const normalized=JSON.parse(JSON.stringify(S.engineTopics(topics)));
   const normalizationMap=new Map();
   for(const t of normalized){const original=byId.get(t.id),a=groupKey(original.textbook.book,original.textbook.unit,original.textbook.chapter),c=E.parseChapter(t.chapter),b=[c.volume,c.chapterNo,c.chapterName].join('|');check(c.volume&&c.chapterNo&&c.chapterName,'normalized school chapter parses');if(normalizationMap.has(a))equal(normalizationMap.get(a),b,'same actual chapter normalizes consistently');else normalizationMap.set(a,b);}
   equal(new Set(normalizationMap.values()).size,chapterKeys.size,'distinct units/chapters never collapse');
   start(subject+' assessment behavior');
   const graph=E.buildGraph(normalized,dependencies,questions);
   for(const t of topics)for(const strategy of ['correct','wrong','mixed']){runSession(graph,[t.id],'target',strategy,subject+'|'+t.id+'|'+strategy);targetSessions++;}
   const scopes=[topics.map(t=>t.id),...sources.books.map(b=>topics.filter(t=>t.textbook.book===b.id).map(t=>t.id))];
   for(const ids of scopes)for(const strategy of ['correct','wrong','mixed','skip']){runSession(graph,ids,'screen',strategy,subject+'|'+ids[0]+'|screen|'+strategy);screenSessions++;}
   resultSubjects[subject]={topics:topics.length,questions:questions.length,dependencies:dependencies.length,books:sources.books.length,chapters:chapterKeys.size,hard:dependencies.filter(e=>e.strength==='hard').length,soft:dependencies.filter(e=>e.strength==='soft').length,stages:{junior:topics.filter(t=>t.grade<=9).length,senior:topics.filter(t=>t.grade>=10).length},question_answer_keys:Object.fromEntries(['A','B','C','D'].map(k=>[k,questions.filter(q=>q.answer===k).length]))};
  }
  start('global totals, baseline preservation and runtime integrity');
  equal(allTopics.length,2950+sum(Object.values(resultSubjects).map(s=>s.topics)),'global topics preserve baseline');
  equal(allQuestions.length,9053+sum(Object.values(resultSubjects).map(s=>s.questions)),'global questions preserve baseline');
  equal(allDeps.length,4369+sum(Object.values(resultSubjects).map(s=>s.dependencies)),'global dependencies preserve baseline');
  const jsonFiles=fs.readdirSync(path.join(root,'data')).filter(f=>f.endsWith('.json'));equal(jsonFiles.length,64,'54 existing and ten new JSON files');
  let preserved=[];
  if(baseline){
   const old=fs.readdirSync(path.join(baseline,'data')).filter(f=>f.endsWith('.json'));equal(old.length,54,'baseline JSON count');
   for(const file of old){equal(fs.readFileSync(path.join(root,'data',file)),fs.readFileSync(path.join(baseline,'data',file)),'unchanged '+file);preserved.push(file);}
   equal(fs.readFileSync(path.join(root,'diagnose/engine.js')),fs.readFileSync(path.join(baseline,'diagnose/engine.js')),'core engine unchanged');
  }
  const runtimeContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/data-manifest.js'),'utf8'),runtimeContext);
  const manifest=runtimeContext.window.ToyDataFiles;equal(Object.keys(manifest).length,63,'63 runtime data payloads');
  for(const subject of subjects)for(const part of parts)check(manifest[subject+'-'+part+'.json'],'each new runtime file listed');
  for(const [name,file] of Object.entries(manifest)){
   const captured={};const c={window:{ToyData:{register:(n,body)=>{captured.name=n;captured.body=body;}}}};
   vm.runInNewContext(fs.readFileSync(path.join(root,'data/runtime',file),'utf8'),c);
   equal(captured.name,name,'runtime registration identity');equal(captured.body,fs.readFileSync(path.join(root,'data',name),'utf8'),'runtime payload equals canonical JSON');
  }
  if(reviewed){
   start('independent content review binding');
   const record=read('validation/biogeo-content-review.json');check(/^PASS/.test(record.status),'independent content review passed');
   for(const [file,h] of Object.entries(hashes))equal(record.final_data_files_sha256[file],h,'review binds final '+file);
   for(const subject of subjects){
    const topics=read('data/'+subject+'-topics.json'),questions=read('data/'+subject+'-questions.json');
    for(const item of [...topics,...questions]){
     equal(item.review_record,'validation/biogeo-content-review.json','review record assigned');check(/独立AI.*复核.*完成/.test(item.review_status)&&!/待独立/.test(item.review_status),'review completed metadata');
     equal(record.semantic_hashes[item.id],semantic(item),'review binds full item semantics '+item.id);
    }
   }
  }
  const report={schema_version:1,checked_date:'2026-11-01',status:'PASS',groups,group_count:groups.length,assertions,require_reviewed:reviewed,subjects:resultSubjects,total:{subjects:12,topics:allTopics.length,questions:allQuestions.length,dependencies:allDeps.length},grading_cases:gradingCases,shuffled_grading_cases:shuffledCases,target_sessions:targetSessions,screen_sessions:screenSessions,baseline_comparison:baseline?'performed':'not_run',existing_data_json_preserved:preserved,core_engine_unchanged:baseline?true:null,data_json_files:64,runtime_files:63,sha256:hashes,limitations:['Structural checks do not prove scientific correctness; independent content review is recorded separately.','Current publicly accessible evidence does not establish full-text verification of every latest textbook printing.','Browser interaction and downloaded results are validated in separate reports.']};
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,subjects:resultSubjects,total:report.total,groups:groups.length,assertions,target_sessions:targetSessions,screen_sessions:screenSessions,baseline_comparison:report.baseline_comparison}));
 }catch(error){
  const report={checked_date:'2026-11-01',status:'FAIL',group,assertions_completed:assertions,error:error.message,stack:error.stack};
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
 }
}
main();
