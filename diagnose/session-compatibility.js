/* Validate recorded question identities and scope before a side-effect-free replay.
 * Corrected judgments can leave legitimate later answers outside the new nextItem order. */
(function(root) {
  'use strict';
  function inspect(graph, saved, E) {
    function no(reason, index, expected, actual) { return {ok:false, reason:reason, answerIndex:index, expected:expected, actual:actual}; }
    if (!saved || !Array.isArray(saved.targets) || !saved.targets.length || !Array.isArray(saved.answers)) return no('记录缺少目标或作答列表，无法安全恢复。');
    if (saved.targets.some(function(id){return typeof id !== 'string' || !graph.byId[id] || graph.byId[id].external;})) return no('记录中的部分目标不在当前学科里。');
    if (saved.mode != null && saved.mode !== 'target' && saved.mode !== 'screen') return no('记录使用了无法识别的测评模式。');
    if (saved.limit != null && (!Number.isFinite(saved.limit) || saved.limit < 1 || Math.floor(saved.limit) !== saved.limit)) return no('记录中的题量上限无效。');
    if (saved.avoid != null && (!Array.isArray(saved.avoid) || saved.avoid.some(function(id){return typeof id !== 'string';}))) return no('记录中的选题历史格式无效。');
    try {
      var session = E.createSession(graph, saved.targets, {mode:saved.mode, limit:saved.limit, seed:saved.seed, avoid:saved.avoid});
      if (saved.answers.length > session.limit) return no('作答记录超过保存的题量上限，无法安全恢复。');
      var allowed = new Set(session.mode === 'screen' ? session.targets : session.order), differences = [];
      for (var i = 0; i < saved.answers.length; i++) {
        var a = saved.answers[i], next = E.nextItem(graph, session);
        if (!a || typeof a.id !== 'string' || typeof a.qid !== 'string' || ['correct','wrong','skip'].indexOf(a.result) < 0) return no('第 ' + (i+1) + ' 条记录缺少可核对的题目编号或判定。', i);
        var expected = next ? {id:next.topicId,qid:next.question.id} : null;
        var actual = {id:a.id,qid:a.qid};
        if (!allowed.has(a.id)) return no('第 ' + (i+1) + ' 条作答不属于所保存目标的当前先修范围；整册测评只允许所选范围内的知识点。', i, expected, actual);
        var question = E.questionById(graph, a.qid);
        if (!question || question.topicId !== a.id) return no('第 ' + (i+1) + ' 条记录的题号与知识点不对应，不能安全恢复。', i, expected, actual);
        var candidate = E.applyAnswer(graph, session, a.id, a.result, {text:a.text});
        if (candidate.answers[candidate.answers.length-1].qid !== a.qid) return no('第 ' + (i+1) + ' 条记录按保存的选题参数会对应另一道题，不能套用原答案。', i, {id:a.id,qid:candidate.answers[candidate.answers.length-1].qid}, actual);
        if (!next || next.topicId !== a.id || next.question.id !== a.qid) differences.push({answerIndex:i,expected:expected,recorded:actual});
        session = candidate;
      }
      return {ok:true, session:session, answersReplayed:saved.answers.length, rebuiltRelations:true, recalculated:true, orderChanged:differences.length>0, orderDifferences:differences};
    } catch (error) { return no('记录无法按当前数据完整回放：' + String(error.message || error)); }
  }
  root.SessionCompatibility = {inspect:inspect};
  if (typeof module === 'object' && module.exports) module.exports = root.SessionCompatibility;
})(typeof window !== 'undefined' ? window : globalThis);
