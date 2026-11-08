/* Run the same offline loader and diagnostic engine used by the site's pages. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {fileURLToPath, pathToFileURL} = require('node:url');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const engine = require('../diagnose/engine.js');
const window = {};
const document = {currentScript:{src:pathToFileURL(path.join(root,'assets/subjects.js')).href},
  createElement:() => ({remove(){}}),head:{appendChild(script) {
    vm.runInContext(fs.readFileSync(fileURLToPath(script.src),'utf8'), context);
    script.onload();
  }}};
const context = vm.createContext({window,document,URL,URLSearchParams,setTimeout,clearTimeout});
for (const file of ['assets/data-manifest.js','assets/subjects.js']) vm.runInContext(read(file),context);
const S = window.Subjects;
const expected = {math:[1895,853,23],physics:[1571,647,9],chemistry:[3062,1334,7],biology:[2059,858,9]};
const stats = JSON.parse(read('data/k12/index.json')).stats;
async function check() {
  for (const [subject, [nodeCount,edgeCount,bookCount]] of Object.entries(expected)) {
    const [topics,edges,questions] = await Promise.all(['topics','dependencies','questions'].map(async kind =>
      (await S.fetch(S.data(kind + '.json',subject),subject)).json()));
    const school = topics.filter(t => t.k12);
    const siteIds = new Set(topics.map(t => t.id));
    const sourceIds = new Set(school.map(t => t.k12.sourceId));
    const schoolEdges = edges.filter(e => e.source === 'K12-KGraph');
    assert.equal(topics.length,siteIds.size);
    assert.equal(school.length,nodeCount);
    assert.equal(sourceIds.size,nodeCount);
    assert.equal(new Set(school.map(t => t.textbook.book)).size,bookCount);
    assert.equal(schoolEdges.length,edgeCount);
    assert.equal(new Set(schoolEdges.map(e => e.prerequisiteId+'>'+e.topicId)).size,edgeCount);
    assert.equal(school.reduce((n,t)=>n+t.k12.links.filter(l=>l.out && l.type==='cycle').length,0),stats[subject].cycleEdges);
    for (const edge of edges) assert(siteIds.has(edge.topicId) && siteIds.has(edge.prerequisiteId));
    for (const t of school) {
      assert(t.textbook.chapter && t.k12.locations.length && t.description);
      for (const l of t.k12.links) assert(siteIds.has(l.id));
    }
    assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
    for (const q of questions) {
      assert(siteIds.has(q.topicId) && q.prompt && q.answer);
      if (q.source==='k12-recall') assert(q.type==='self' && !q.answer.includes('[object Object]'));
    }
    const graph = engine.buildGraph(S.engineTopics(topics),edges,questions);
    for (const t of topics) {
      engine.ancestors(graph,[t.id]);
      if (t.k12) assert(engine.isTestable(graph,t.id),t.k12.sourceId);
    }
    const ext = subject === 'math' ? ['math-university','math-probability'] :
      subject === 'physics' || subject === 'chemistry' ? ['u'+subject] : [];
    for (const group of ext) {
      const preserved = JSON.parse(read('data/'+group+'-topics.json'));
      const ids = new Set(preserved.map(t=>t.id));
      assert.equal(JSON.stringify(topics.filter(t => ids.has(t.id))),JSON.stringify(preserved));
      const oldQuestions = JSON.parse(read('data/'+group+'-questions.json'));
      assert.equal(JSON.stringify(questions.filter(q => ids.has(q.topicId))),JSON.stringify(oldQuestions));
    }
    if (subject === 'math') {
      const target = graph.byId.cnm_221;
      assert.equal(target.name,'配方法');
      assert.equal(graph.prereqs[target.id].map(e=>graph.byId[e.id].name).join(','),'完全平方式');
      let state = engine.createSession(graph,[target.id]);
      for(let i=0;i<2;i++) state=engine.applyAnswer(graph,state,target.id,'wrong');
      assert.equal(graph.byId[engine.nextItem(graph,state).topicId].name,'完全平方式');
    } else assert(graph.byId[S.specs[subject].demo]);
    console.log(subject,school.length,'school nodes,',schoolEdges.length,'school prerequisites,',questions.length,'questions across the subject');
  }
}
check().catch(error=>{console.error(error);process.exitCode=1;});
