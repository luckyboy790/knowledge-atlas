#!/usr/bin/env node
/* Validate actual browser-downloaded QA exports against final biology/geography data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'), reportPath=path.join(root,'validation/biogeo-browser-export-validation.json');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const Choice=require(path.join(root,'diagnose/choice-order.js')), E=require(path.join(root,'diagnose/engine.js'));
const context={window:{},URL,URLSearchParams,location:{search:'?subject=biology',hash:''}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/subjects.js'),'utf8'),context);
const S=context.window.Subjects;
const cases=['biology','geography'].flatMap(subject=>['target','screen'].map(mode=>['validation/'+subject+'-browser-'+mode+'-export.json',mode,subject]));
let assertions=0;
const files=[];
function equal(a,b,label){assertions++;assert.deepEqual(a,b,label);}
function check(value,label){assertions++;assert.ok(value,label);}
try {
  for(const [file,mode,subject] of cases){
    const topics=read('data/'+subject+'-topics.json');
    const byId=new Map(topics.map(t=>[t.id,t]));
    const questions=read('data/'+subject+'-questions.json');
    const bank=new Map(questions.map(q=>[q.id,q]));
    const dependencies=read('data/'+subject+'-dependencies.json');
    const graph=E.buildGraph(S.engineTopics(topics),dependencies,questions);
    const courseIds=topics.map(t=>t.id);
    const data=read(file);
    equal(data.subject,subject,file+' subject identity');equal(data.mode,mode,file+' mode');
    equal(data.answers.length,data.asked,'answer count');equal(data.finished,true,'finished');
    check(data.generatedAt&&data.seed,'export timestamp and session seed');
    check(data.targets.every(t=>courseIds.includes(t.id)),'course target ownership');
    let session=E.createSession(graph,data.targets.map(t=>t.id),{mode,limit:data.limit,seed:data.seed});
    let changedDisplayKeys=0;
    for(const [index,item] of data.answers.entries()){
      const q=bank.get(item.questionId);check(q,'question exists: '+item.questionId);
      equal(item.order,index+1,'record order');equal(item.topicId,q.topicId,'topic ID');equal(item.name,byId.get(q.topicId).name,'topic name');
      equal(item.prompt,q.prompt,'prompt');equal(item.explanation,q.explanation,'explanation');equal(item.referenceAnswer,q.answer,'reference key');
      const next=E.nextItem(graph,session);check(next,'replay next item');equal(next.question.id,q.id,'replay question and seed');
      if(q.type==='choice'){
        const displayed=Choice.ordered(q,data.seed);equal(item.displayedChoices,displayed,'displayed choices');
        const answer=displayed.find(c=>c.key===q.answer);equal(item.referenceAnswerDisplay,answer.label+'. '+answer.text,'reference display');
        if(answer.key!==answer.label)changedDisplayKeys++;
        if(item.result==='skip')check(item.userAnswer===null||item.userAnswer===''||item.userAnswer===undefined,'skip carries no chosen key');
        else {
          const chosen=displayed.find(c=>c.key===item.userAnswer);check(chosen,'chosen original key');
          equal(item.userAnswerDisplay,chosen.label+'. '+chosen.text,'chosen display');
          equal(item.result,E.judgeQuestion(q,chosen.key).verdict,'grading original key');
        }
      }
      if(mode==='screen')check(data.targets.some(t=>t.id===item.topicId),'whole-book screen stays in chosen scope');
      session=E.applyAnswer(graph,session,item.topicId,item.result,{text:item.userAnswer});
    }
    const summary=E.summarize(graph,session);
    for(const key of ['asked','limit','finished','limitReached'])equal(data[key],summary[key],'summary '+key);
    for(const key of ['weak','shaky','mastered','untested'])equal(data[key].map(x=>x.id),summary[key],'summary IDs '+key);
    equal(data.mastered.map(x=>[x.id,x.source]),summary.mastered.map(id=>[id,session.status[id].src]),'direct versus inferred mastery');
    equal(data.path.map(x=>[x.id,x.status]),summary.path.map(x=>[x.id,x.status]),'learning path');
    if(mode==='target'){
      equal(data.targets.length,1,'single target');check(data.asked>=3,'target includes prerequisite follow-up');
      equal(data.targets[0].id,subject==='biology'?'cnb_095':'cng_122','planned multi-level target');
      equal(data.answers.slice(0,2).map(a=>[a.topicId,a.result]),[[data.targets[0].id,'wrong'],[data.targets[0].id,'wrong']],'two wrong target answers');
      const prerequisites=new Set(E.ancestors(graph,[data.targets[0].id]));
      check(prerequisites.has(data.answers[2].topicId),'third question backtracks to a prerequisite');
      check(data.weak.some(t=>t.id===data.targets[0].id),'weak target recorded');
    } else {
      const book=byId.get(data.targets[0].id).textbook.book;
      equal(book,subject==='biology'?'pep_biology_j7u':'geo_pep_7a','planned junior whole book');
      const bookIds=topics.filter(t=>t.textbook.book===book).map(t=>t.id);
      equal(data.targets.map(t=>t.id),bookIds,'complete chosen book targets');equal(data.limit,20,'20-question setting');equal(data.asked,20,'20-question termination');equal(data.limitReached,true,'limit reached');
      const chapters=E.chapterSummary(graph,session);
      equal(data.chapters.map(c=>[c.label,c.total,c.mastered,c.shaky,c.weak,c.untested]),chapters.map(c=>[c.label,c.total,c.mastered,c.shaky,c.weak,c.untested]),'chapter aggregation');
      const chapterCount=new Set(topics.filter(t=>t.textbook.book===book).map(t=>S.scienceChapter(t).chapterNo)).size;
      equal(data.chapters.length,chapterCount,'each real chapter including unit numbering');equal(data.chapters.reduce((n,c)=>n+c.total,0),bookIds.length,'chosen book chapter total');
    }
    files.push({file,mode,subject,records:data.asked,directly_tested_topic_count:new Set(data.answers.map(a=>a.topicId)).size,directly_mastered_count:data.mastered.filter(t=>t.source==='direct').length,inferred_mastered_count:data.mastered.filter(t=>t.source!=='direct').length,weak_count:data.weak.length,shaky_count:data.shaky.length,untested_count:data.untested.length,reference_keys_differing_from_display_labels:changedDisplayKeys,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),status:'PASS'});
  }
  check(files.some(f=>f.reference_keys_differing_from_display_labels>0),'actual samples exercise nontrivial key/display-label mapping');
  const report={schema_version:1,checked_on:new Date().toISOString(),status:'PASS',assertions,files,record_count:files.reduce((n,f)=>n+f.records,0),
    method:'检查真实浏览器下载的四份验收作答文件；逐条对照最终题库、seed 选项排列、原始评分键、显示标签，并重放引擎验证状态和按册章节汇总。',
    new_data_sha256:Object.fromEntries(['biology','geography'].flatMap(s=>['topics','questions','dependencies','sources','coverage'].map(k=>s+'-'+k+'.json')).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',f))).digest('hex')])),
    limits:['这些是本任务合成验收作答，不含真实学生记录。','生物与地理知识、题目和教材版本证据另有独立内容复核报告。']};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',assertions,record_count:report.record_count,files:files.length}));
}catch(error){
  const report={schema_version:1,checked_on:new Date().toISOString(),status:'FAIL',assertions_completed:assertions,error:error.message};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
}
