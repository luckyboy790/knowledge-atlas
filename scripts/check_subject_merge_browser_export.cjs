#!/usr/bin/env node
/* Replay actual session JSON obtained through the browser export UI.
 * This run uses visible export-preview text because managed-browser native downloads failed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),file=path.resolve(ROOT,process.argv[2]||'validation/subject-merge-browser-export.json');
const rel=path.relative(ROOT,file).split(path.sep).join('/');
const E=require(path.join(ROOT,'diagnose/engine.js')),Choice=require(path.join(ROOT,'diagnose/choice-order.js'));
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8'),json=f=>JSON.parse(read(f)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const report=path.join(ROOT,'validation/subject-merge-browser-export-validation.json');
let assertions=0;const eq=(a,b,msg)=>{assertions++;assert.equal(JSON.stringify(a),JSON.stringify(b),msg);};const ok=(v,msg)=>{assertions++;assert.ok(v,msg);};
try{
 const out=JSON.parse(fs.readFileSync(file,'utf8')),window={};const context=vm.createContext({window,document:{},location:{search:'?subject='+out.subject,hash:''},URL,URLSearchParams});vm.runInContext(read('assets/subjects.js'),context);const S=window.Subjects;
 ok(S.merged(out.subject),'export belongs to one of the merged subjects');eq(S.canonical(out.subject),out.subject,'export uses canonical identity');ok(Array.isArray(out.avoid),'avoid list persisted for deterministic selection');
 const inputs=['assets/subjects.js','diagnose/engine.js','diagnose/choice-order.js','data/subject-bridge-dependencies.json'];
 const parts={};for(const kind of ['topics','questions','dependencies']){parts[kind]=S.members(out.subject).flatMap(member=>{const f='data/'+member+'-'+kind+'.json';inputs.push(f);return json(f);});}
 parts.dependencies.push(...json('data/subject-bridge-dependencies.json').filter(e=>e.subject===out.subject));
 const graph=E.buildGraph(S.engineTopics(parts.topics),parts.dependencies,parts.questions),targets=out.targets.map(t=>t.id);let session=E.createSession(graph,targets,{mode:out.mode,limit:out.limit,seed:out.seed,avoid:out.avoid});
 const route=[];
 for(const a of out.answers){
  const next=E.nextItem(graph,session);ok(next,'actual export has an available next question');eq(next.topicId,a.topicId,'actual topic sequence');eq(next.question.id,a.questionId,'actual question sequence');const q=next.question;
  eq(a.prompt,q.prompt,'export question text');eq(a.referenceAnswer,q.answer,'raw reference key');eq(a.explanation,q.explanation||'','explanation text');
  if(q.type==='choice'){
   const choices=Choice.ordered(q,session.seed);eq(a.displayedChoices,choices,'display order');const correct=choices.find(c=>c.key===q.answer);eq(a.referenceAnswerDisplay,correct.label+'. '+correct.text,'displayed correct answer');
   if(a.userAnswer!=null){const selected=choices.find(c=>c.key===a.userAnswer);ok(selected,'raw selection belongs to bank');eq(a.userAnswerDisplay,selected.label+'. '+selected.text,'displayed selected answer');}
   if(a.result!=='skip')eq(E.judgeQuestion(q,a.userAnswer).verdict,a.result,'real auto judgment');
  }
  route.push({topicId:a.topicId,questionId:a.questionId,result:a.result});session=E.applyAnswer(graph,session,a.topicId,a.result,{text:a.userAnswer});
 }
 const summary=E.summarize(graph,session);eq(out.asked,summary.asked,'asked total');eq(out.finished,summary.finished,'completion status');eq(out.limitReached,summary.limitReached,'question cap');
 for(const key of ['weak','shaky','untested'])eq(out[key].map(t=>t.id),summary[key],key+' IDs');eq(out.mastered.map(t=>t.id),summary.mastered,'mastered IDs');eq(out.weakRoots.map(t=>t.id),summary.roots.map(t=>t.id),'weak root IDs');eq(out.path.map(t=>t.id),summary.path.map(t=>t.id),'learning path order');
 for(const m of out.mastered)eq(m.source,session.status[m.id].src,'direct versus inferred labels');
 const result={status:'PASS',checked_at:new Date().toISOString(),export_file:rel,artifact_origin:'visible_browser_export_preview',native_download_status:'NOT_VERIFIED_ENVIRONMENT_FAILURE',export_sha256:hash(file),assertions,subject:out.subject,targets,asked:summary.asked,finished:summary.finished,limitReached:summary.limitReached,direct_mastered:summary.mastered.filter(id=>session.status[id].src==='direct').length,inferred_mastered:summary.mastered.filter(id=>session.status[id].src==='inferred').length,route,input_sha256:Object.fromEntries(inputs.map(f=>[f,hash(path.join(ROOT,f))])),limitations:['This script verifies real-session export text read from the visible browser export preview. The managed native download path failed and is not marked as verified.','Deterministic replay does not validate the educational effectiveness of the assessment.']};
 fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',assertions,subject:out.subject,asked:summary.asked}));
}catch(error){fs.writeFileSync(report,JSON.stringify({status:'FAIL',export_file:rel,assertions,error:error.stack},null,2)+'\n');console.error(error.stack);process.exitCode=1;}
