// Worked examples and generated variants are site-authored. Source exercises keep their original records.
(function () {
  'use strict';
  function numeric(prompt, answer, explanation, mistakes = {}) {
    return {type:'numeric', prompt, answer:String(answer), explanation, mistakes};
  }
  function squareStep(n) {
    return numeric('x² + ' + (2*n) + 'x + □ = (x + ' + n + ')²。方框里填几？', n*n,
      '括号里的常数是 ' + n + '，展开后常数项等于 ' + n + '² = ' + n*n + '。',
      {[n]:'你找到了系数的一半，再把这个数平方。', [2*n]:'先把一次项系数除以 2，再平方。'});
  }
  const square = {
    goal:'把三项式补成完全平方',
    example:'x² + 10x 加上多少，可以写成一个式子的平方？',
    steps:['对照 (x + a)² = x² + 2ax + a²，得到 2a = 10。','所以 a = 5，缺的常数项是 5² = 25。','合起来就是 x² + 10x + 25 = (x + 5)²。'],
    step:i => squareStep([3,4,7,9][i % 4]),
    check:i => {
      const n = [2,6,8,10,11,12][i];
      const sign = i % 2 ? '−' : '+';
      return numeric('要让 x² ' + sign + ' ' + 2*n + 'x + □ 成为完全平方式，方框里应填几？', n*n,
        '一次项系数的一半是 ' + (sign === '−' ? '−' : '') + n + '，它的平方是 ' + n*n + '。');
    }
  };
  const complete = {
    goal:'用配方法求出方程的两个根',
    example:'用配方法解 x² + 8x = 9。',
    steps:['8 的一半是 4，4² = 16。在等式两边同时加 16。','左边成为 (x + 4)²，右边是 25。','由 x + 4 = ±5，得到 x = 1 或 x = −9。'],
    step:square.step,
    check:i => {
      const n = [3,2,5,4,6,7][i], k = n + 1 + i%3, c = k*k - n*n;
      return {...numeric('用配方法解方程 x² + ' + 2*n + 'x = ' + c + '。请用逗号分开两个根。',
        (k-n) + ',' + (-k-n), '两边加 ' + n*n + '，得到 (x + ' + n + ')² = ' + k*k + '。开平方后分别取正、负两个值。'), unordered:true};
    }
  };
  const fractions = {
    goal:'把同分母的分数相加',
    example:'一张纸平分成 7 份，先涂 2 份，再涂 3 份。一共涂了几分之几？',
    steps:['每一份都是这张纸的 1/7，份的大小始终相同。','涂色份数相加，2 + 3 = 5，所以一共是 5/7。'],
    step:i => { const d=[7,9,11,13][i%4]; return numeric('2/' + d + ' + 1/' + d + ' = 3/□。方框里的分母是多少？', d,
      '每一份的大小相同，分母仍是 ' + d + '。',{[2*d]:'分子记录份数，可以相加；分母表示每一份的大小。'}); },
    reviewed:['math_3a_rjb_exe25','math_5b_rjb_exe13'],
    check:i => { const d=[7,8,9,10,11,12][i]; return numeric('计算 2/' + d + ' + 3/' + d + '。', '5/'+d,'分母相同，把分子 2 和 3 相加，得到 5/'+d+'。'); }
  };
  const times = {
    goal:'求一个数量是另一个的几倍',
    example:'一盒有 15 支蓝笔和 5 支红笔。蓝笔的数量是红笔的几倍？',
    steps:['把 5 支红笔看成一份。','15 支蓝笔中有 15 ÷ 5 = 3 份，所以是 3 倍。'],
    step:i => {const n=[6,7,4,8][i%4]; return numeric('有 '+(n*3)+' 枚白棋和 '+n+' 枚黑棋。求白棋是黑棋的几倍，应把多少枚看作一份？',n,
      '和黑棋比较，一份就是 '+n+' 枚。',{[3*n]:'题目把白棋和黑棋比，作为一份的是黑棋的数量。'});},
    reviewed:['math_3a_rjb_exe13','math_3a_rjb_exe15'],
    check:i => {const b=i+3, k=[4,3,6,5,2,7][i]; return numeric('有 '+k*b+' 本绘本和 '+b+' 本词典。绘本数量是词典的几倍？',k,k*b+' ÷ '+b+' = '+k+'。');}
  };
  const borrow = {
    goal:'从十位退一，算出差',
    example:'32 − 15 怎么算？',
    steps:['个位的 2 不够减 5，从十位退 1 个十，个位成为 12。','个位 12 − 5 = 7，十位剩 2 个十，再减 1 个十，结果是 17。'],
    step:i => { const u=[3,4,2,1][i%4]; return numeric('计算 '+(40+u)+' − 18。退 1 个十后，个位要用几减 8？',10+u,
      '原有 '+u+' 个一，加上退来的 10 个一，共 '+(10+u)+' 个一。',{10:'退来的十还要加上原来个位的数。'}); },
    reviewed:['math_1b_rjb_exe4','math_2a_rjb_exe5'],
    check:i => {const a=[31,42,53,64,75,86][i]; return numeric('计算 '+a+' − 18。',a-18,'个位退一当十，十位少一个十，差是 '+(a-18)+'。');}
  };
  const travel = {
    goal:'用速度和时间算路程',
    example:'骑车每小时行 12 千米，匀速骑 3 小时，一共多远？',
    steps:['每小时是 12 千米，3 小时就是 3 个 12 千米。','路程 = 速度 × 时间，12 × 3 = 36 千米。'],
    step:i => {const n=[4,3,5,6][i%4];return numeric('每小时走 5 千米，一共走 '+n+' 小时。算总路程时，需要把几个 5 相加？',n,
      '每小时对应一个 5 千米，走了 '+n+' 小时就有 '+n+' 个 5 千米。');},
    reviewed:['math_4a_rjb_exe10','math_4a_rjb_exe13'],
    check:i => {const v=12+2*i,t=2+i%3;return numeric('骑车每小时行 '+v+' 千米，匀速骑 '+t+' 小时，共行多少千米？',v*t,v+' × '+t+' = '+(v*t)+'（千米）。');}
  };
  const units = new Map([
    ['cnm_221',complete], ['cnm_k9acpt8',square], ['cnm_148',square],
    ['cnm_k3acpt36',fractions], ['cnm_k3acpt18',times], ['cnm_k1bcpt7',borrow], ['cnm_k4acpt21',travel]
  ]);
  window.GuidedMath = {
    get(subject, id) { return subject === 'math' ? units.get(id) : undefined; },
    questions(unit, id, sourceQuestions) {
      const reviewed = (unit.reviewed || []).map(sourceId => sourceQuestions.find(q =>
        q.source === 'k12-exercise' && q.sourceId === sourceId && q.linkedTopicIds.includes(id))).filter(Boolean);
      const variants = Array.from({length:6}, (_,i) => ({...unit.check(i), id:'guided.' + id + '.' + i, source:'guided-variant', difficulty:'standard'}));
      return [...reviewed, ...variants];
    }
  };
})();
