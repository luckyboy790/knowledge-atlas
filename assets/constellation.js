/* 首页「先修关系总览」：全部知识点按年级从左到右排成点阵，细线是先修边。
   自动循环演示「从一个知识点沿先修往回追」；鼠标悬停任一点可查看它的先修链，点击打开知识图谱。
   纯 Canvas 2D，无第三方依赖；prefers-reduced-motion 时只画一帧静态结果。 */
(function () {
  'use strict';

  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  var MAX_DEPTH = 4;
  var MAX_NODES = 16;
  var LEVEL_MS = 520;
  var DRAW_MS = 460;
  var HOLD_MS = 2800;
  var FADE_MS = 600;

  function hash01(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex || 'rgba(0,0,0,' + a + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function mount(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stageOf = opts.stageOf;
    var stageName = opts.stageName;
    var gradeShort = opts.gradeShort;

    /* ---------------- 数据 */
    var nodes = opts.topics.map(function (t) {
      return { id: t.id, name: t.name, grade: t.grade, kind: stageOf(t.grade), x: 0, y: 0, col: 0 };
    });
    var byId = new Map();
    nodes.forEach(function (n) { byId.set(n.id, n); });
    var pre = new Map();
    nodes.forEach(function (n) { pre.set(n.id, []); });
    var edges = [];
    opts.deps.forEach(function (d) {
      var a = byId.get(d.prerequisiteId);
      var b = byId.get(d.topicId);
      if (!a || !b || a === b) return;
      edges.push({ a: a, b: b });
      pre.get(b.id).push(a);
    });
    var grades = Array.from(new Set(nodes.map(function (n) { return n.grade; }))).sort(function (x, y) { return x - y; });
    var columns = grades.map(function (g, c) {
      var list = nodes.filter(function (n) { return n.grade === g; });
      list.forEach(function (n) { n.col = c; });
      return list;
    });

    /* ---------------- 先修链 */
    var chainCache = new Map();
    function chainFor(target) {
      if (chainCache.has(target.id)) return chainCache.get(target.id);
      var levels = [[target]];
      var seen = new Set([target.id]);
      var links = [];
      for (var d = 0; d < MAX_DEPTH; d++) {
        var next = [];
        levels[d].forEach(function (node) {
          (pre.get(node.id) || []).forEach(function (p) {
            if (seen.has(p.id) || seen.size >= MAX_NODES) return;
            seen.add(p.id);
            next.push(p);
            links.push({ from: node, to: p, level: d + 1 });
          });
        });
        if (!next.length) break;
        levels.push(next);
      }
      var far = levels[levels.length - 1];
      var farthest = far.slice().sort(function (a, b) { return a.grade - b.grade; })[0];
      var chain = { target: target, levels: levels, links: links, size: seen.size, depth: levels.length - 1, farthest: farthest };
      chainCache.set(target.id, chain);
      return chain;
    }
    function chainEnd(chain) { return chain.depth ? 450 + (chain.depth - 1) * LEVEL_MS + DRAW_MS : 450; }

    var candidates = null;
    function pickCandidates() {
      var scored = [];
      nodes.forEach(function (n) {
        if (!(pre.get(n.id) || []).length) return;
        var c = chainFor(n);
        if (c.depth < 1) return;
        var span = n.col - c.farthest.col;
        scored.push({ c: c, score: c.depth * 10 + span * 2 + Math.min(c.size, 12) });
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      var keep = scored.slice(0, Math.max(6, Math.round(scored.length * 0.35)));
      return keep.map(function (s) { return s.c; });
    }
    var lastPick = -1;
    function nextChain() {
      if (!candidates) candidates = pickCandidates();
      if (!candidates.length) return null;
      var i = Math.floor(Math.random() * candidates.length);
      if (candidates.length > 1 && i === lastPick) i = (i + 1) % candidates.length;
      lastPick = i;
      return candidates[i];
    }

    /* ---------------- 布局与配色 */
    var W = 0, H = 0, dpr = 1, dotR = 2, band = 40;
    var pad = { l: 34, r: 34, t: 60, b: 82 };
    var colors = {};
    var staticLayer = document.createElement('canvas');
    var sctx = staticLayer.getContext('2d');

    function readColors() {
      var dark = document.documentElement.dataset.theme === 'dark';
      colors = {
        dark: dark,
        bg: cssVar('--bg-elev') || '#ffffff',
        text: cssVar('--text') || '#15171c',
        muted: cssVar('--muted') || '#5f6573',
        faint: cssVar('--faint') || '#8b909b',
        line: cssVar('--line-strong') || '#d3d0c8',
        edge: cssVar('--edge') || '#6f7482',
        bad: cssVar('--bad') || '#d1373a',
        primary: cssVar('--node-primary'),
        junior: cssVar('--node-junior'),
        senior: cssVar('--node-senior'),
        university: cssVar('--node-university')
      };
    }
    function toneOf(kind) { return colors[kind] || colors.faint; }

    function layout() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(200, rect.width);
      H = Math.max(200, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      staticLayer.width = canvas.width;
      staticLayer.height = canvas.height;
      var small = W < 520;
      // 底部留出：年级刻度（约 30px）+ 两行说明文字（约 60px）
      pad = { l: small ? 24 : 40, r: small ? 24 : 40, t: small ? 54 : 64, b: small ? 124 : 116 };
      var n = columns.length;
      var innerW = W - pad.l - pad.r;
      // 每个年级占一个等宽槽位；年级少（物理、化学）时槽位更宽，点阵在槽内分成几列铺开，不会挤在两边。
      band = innerW / Math.max(1, n);
      var availH = H - pad.t - pad.b;
      var midY = pad.t + availH / 2;
      var minGap = clamp(availH / 44, 4.5, 8);
      var maxGap = nodes.length > 200 ? 16 : 30;
      var smallest = Infinity;
      columns.forEach(function (col, c) {
        var m = col.length;
        var cx = pad.l + (c + 0.5) * band;
        var bandW = band * 0.62;
        var k = 1;
        while (k < 10 && (m / k) * minGap > availH) k++;
        // 点少的年级按槽位宽高比再多分几列，让点阵块接近槽位形状
        var aspectK = Math.round(Math.sqrt(m * bandW / Math.max(1, availH)));
        k = clamp(Math.max(k, aspectK), 1, Math.max(1, Math.min(10, m)));
        var rows = Math.ceil(m / k);
        var vGap = Math.min(maxGap, availH / rows);
        var hGap = k > 1 ? Math.min(vGap * 1.25, bandW / (k - 1)) : 0;
        smallest = Math.min(smallest, k > 1 ? Math.min(vGap, hGap) : vGap);
        col.forEach(function (node, j) {
          var sc = Math.floor(j / rows);
          var r = j % rows;
          var jx = (hash01(node.id) - 0.5) * Math.min(vGap, 10) * 0.45;
          var jy = (hash01(node.id + '#') - 0.5) * vGap * 0.3;
          node.x = cx + (sc - (k - 1) / 2) * hGap + jx;
          node.y = midY + (r - (rows - 1) / 2) * vGap + jy;
        });
      });
      dotR = clamp(smallest * 0.3, 1.3, nodes.length > 200 ? 3.6 : 4.6);
      drawStatic();
    }

    function curve(c, a, b) {
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      var dx = Math.abs(b.x - a.x);
      if (a.col === b.col) return { x: mx + 16 + Math.abs(a.y - b.y) * 0.14, y: my };
      return { x: mx, y: my - dx * 0.14 };
    }

    function drawStatic() {
      var g = sctx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      var a = clamp(3.2 / Math.sqrt(Math.max(1, edges.length)), 0.05, 0.3) * (colors.dark ? 1.35 : 1);
      g.lineWidth = edges.length > 600 ? 0.6 : 0.9;
      g.strokeStyle = rgba(colors.edge, a);
      g.beginPath();
      edges.forEach(function (e) {
        var c = curve(g, e.a, e.b);
        g.moveTo(e.a.x, e.a.y);
        g.quadraticCurveTo(c.x, c.y, e.b.x, e.b.y);
      });
      g.stroke();
      ['primary', 'junior', 'senior', 'university'].forEach(function (kind) {
        g.fillStyle = rgba(toneOf(kind), colors.dark ? 0.9 : 0.82);
        g.beginPath();
        nodes.forEach(function (n) {
          if (n.kind !== kind) return;
          g.moveTo(n.x + dotR, n.y);
          g.arc(n.x, n.y, dotR, 0, Math.PI * 2);
        });
        g.fill();
      });
      drawRuler(g);
    }

    function drawRuler(g) {
      var y = H - pad.b + 20;
      var groups = [];
      grades.forEach(function (grade, c) {
        var name = stageName(grade);
        var last = groups[groups.length - 1];
        if (last && last.name === name) last.to = c;
        else groups.push({ name: name, from: c, to: c, kind: stageOf(grade) });
      });
      var perGrade = groups.length === 1;
      if (perGrade) groups = grades.map(function (grade, c) { return { name: gradeShort(grade), from: c, to: c, kind: stageOf(grade) }; });
      g.font = '500 11.5px ' + FONT;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      groups.forEach(function (grp) {
        var inset = Math.min(10, band * 0.12);
        var x1 = pad.l + grp.from * band + inset;
        var x2 = pad.l + (grp.to + 1) * band - inset;
        g.strokeStyle = colors.line;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x1, y - 5); g.lineTo(x1, y); g.lineTo(x2, y); g.lineTo(x2, y - 5);
        g.stroke();
        g.fillStyle = toneOf(grp.kind);
        g.beginPath();
        var cx = (x1 + x2) / 2;
        var label = grp.name;
        var w = g.measureText(label).width;
        g.arc(cx - w / 2 - 7, y + 14.5, 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = colors.muted;
        g.fillText(label, cx + 2, y + 8);
      });
    }

    /* ---------------- 动态层 */
    function partialCurve(a, b, p) {
      var c = curve(ctx, a, b);
      var steps = 28;
      var end = Math.max(1, Math.round(steps * p));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      for (var i = 1; i <= end; i++) {
        var t = i / steps;
        var u = 1 - t;
        ctx.lineTo(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y);
      }
      ctx.stroke();
    }

    function overlaps(a, b) {
      return a && b && a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
    }
    // 画一个名称标签；avoid 是已经画好的标签位置，重叠时把这个标签挪到节点上方或下方。
    function label(node, text, strong, alpha, avoid) {
      ctx.save();
      ctx.font = (strong ? '650 ' : '500 ') + '12px ' + FONT;
      var chars = Array.from(text);
      var shown = chars.length > 14 ? chars.slice(0, 13).join('') + '…' : text;
      var w = ctx.measureText(shown).width + 18;
      var h = 24;
      var x = node.x + 12;
      if (x + w > W - 10) x = node.x - 12 - w;
      x = clamp(x, 8, W - w - 8);
      var lo = pad.t - 14;
      var hi = H - pad.b - h + 10;
      var y = clamp(node.y - h / 2, lo, hi);
      if (overlaps({ x: x, y: y, w: w, h: h }, avoid)) {
        var up = clamp(avoid.y - h - 6, lo, hi);
        var down = clamp(avoid.y + avoid.h + 6, lo, hi);
        y = Math.abs(up - node.y) <= Math.abs(down - node.y) && !overlaps({ x: x, y: up, w: w, h: h }, avoid) ? up : down;
      }
      var rect = { x: x, y: y, w: w, h: h };
      if (alpha <= 0) { ctx.restore(); return rect; }
      ctx.globalAlpha *= alpha;
      roundRect(ctx, x, y, w, h, 7);
      ctx.fillStyle = strong ? colors.text : rgba(colors.bg, 0.96);
      ctx.fill();
      if (!strong) { ctx.strokeStyle = colors.line; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = strong ? colors.bg : colors.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(shown, x + 9, y + h / 2 + 0.5);
      ctx.restore();
      return rect;
    }

    function drawChain(chain, tau, fade) {
      var end = chainEnd(chain);
      ctx.save();
      ctx.globalAlpha = fade;
      // 压暗底图，让当前链路浮出来
      ctx.fillStyle = rgba(colors.bg, colors.dark ? 0.55 : 0.6);
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(colors.text, colors.dark ? 0.8 : 0.72);
      chain.links.forEach(function (lk) {
        var start = 450 + (lk.level - 1) * LEVEL_MS;
        var p = easeOut((tau - start) / DRAW_MS);
        if (p > 0) partialCurve(lk.from, lk.to, p);
      });
      var big = Math.max(3.4, dotR * 1.7 + 1);
      chain.links.forEach(function (lk) {
        var start = 450 + (lk.level - 1) * LEVEL_MS + DRAW_MS * 0.72;
        var s = easeOut((tau - start) / 260);
        if (s <= 0) return;
        ctx.beginPath();
        ctx.arc(lk.to.x, lk.to.y, big * s + 1.6, 0, Math.PI * 2);
        ctx.fillStyle = colors.bg;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lk.to.x, lk.to.y, big * s, 0, Math.PI * 2);
        ctx.fillStyle = toneOf(lk.to.kind);
        ctx.fill();
      });
      var t = chain.target;
      var s0 = easeOut(tau / 320);
      var pulse = reduce ? 0 : (tau % 1800) / 1800;
      ctx.beginPath();
      ctx.arc(t.x, t.y, (big + 7 + pulse * 7) * s0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(colors.text, 0.28 * (1 - pulse));
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(t.x, t.y, (big + 2.2) * s0 + 1.8, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(t.x, t.y, (big + 2.2) * s0, 0, Math.PI * 2);
      ctx.fillStyle = colors.text;
      ctx.fill();
      var targetRect = label(t, t.name, true, easeOut((tau - 160) / 300));
      if (chain.depth) {
        var f = chain.farthest;
        var fs = easeOut((tau - end - 120) / 300);
        if (fs > 0) {
          ctx.beginPath();
          ctx.setLineDash([2.5, 3]);
          ctx.arc(f.x, f.y, big + 6, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(colors.text, 0.55 * fs);
          ctx.lineWidth = 1.3;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        label(f, f.name, false, fs, targetRect);
      }
      ctx.restore();
    }

    /* ---------------- 说明文字 */
    function setCaption(chain, done) {
      var box = opts.caption;
      if (!box) return;
      box.replaceChildren();
      if (!chain) { box.textContent = opts.idleText || ''; return; }
      var b = document.createElement('b');
      b.textContent = '「' + chain.target.name + '」';
      if (!done || !chain.depth) {
        box.append('回溯', b, chain.depth ? '的先修…' : '：它是起点，没有更早的先修。');
        return;
      }
      var f = document.createElement('b');
      f.textContent = '「' + chain.farthest.name + '」';
      box.append('回溯', b, '：向上 ' + chain.depth + ' 层，经过 ' + (chain.size - 1) + ' 个先修，最远到', f, '（' + gradeShort(chain.farthest.grade) + '）。');
    }

    /* ---------------- 主循环 */
    var current = null;
    var startAt = 0;
    var captionDone = false;
    var hover = null;
    var running = false;
    var visible = true;
    var raf = 0;
    var pausedAt = 0;

    function render(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(staticLayer, 0, 0, W, H);
      if (hover) { drawChain(hover, 1e6 + ((now || 0) % 1800), 1); return; }
      if (!current) return;
      var tau = reduce ? 1e6 : now - startAt;
      var end = chainEnd(current);
      var fade = 1;
      if (!reduce && tau > end + HOLD_MS) fade = 1 - (tau - end - HOLD_MS) / FADE_MS;
      if (fade <= 0) {
        begin(now);
        return render(now);
      }
      if (!captionDone && tau > end + 120) { captionDone = true; setCaption(current, true); }
      drawChain(current, tau, Math.max(0, fade));
    }
    function begin(now) {
      current = nextChain();
      startAt = now;
      captionDone = false;
      setCaption(current, false);
    }
    function loop(now) {
      raf = 0;
      if (!running) return;
      render(now);
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (running || reduce || !visible || document.hidden) return;
      running = true;
      var now = performance.now();
      if (pausedAt) { startAt += now - pausedAt; pausedAt = 0; }
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      if (!running) return;
      running = false;
      pausedAt = performance.now();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* ---------------- 指针交互 */
    function nearest(evt) {
      var rect = canvas.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var y = evt.clientY - rect.top;
      var best = null;
      var bestD = 14 * 14;
      nodes.forEach(function (n) {
        var dx = n.x - x;
        var dy = n.y - y;
        var d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = n; }
      });
      return best;
    }
    function setHover(node) {
      var chain = node ? chainFor(node) : null;
      if (chain === hover) return;
      hover = chain;
      canvas.style.cursor = node ? 'pointer' : '';
      if (hover) { pause(); setCaption(hover, true); render(performance.now()); }
      else {
        if (reduce) { setCaption(current, true); render(0); return; }
        begin(performance.now());
        play();
      }
    }
    var touchPick = null;
    canvas.addEventListener('pointermove', function (evt) {
      if (evt.pointerType === 'touch') return;
      setHover(nearest(evt));
    });
    canvas.addEventListener('pointerleave', function (evt) {
      if (evt.pointerType === 'touch') return;
      setHover(null);
    });
    canvas.addEventListener('click', function (evt) {
      var node = nearest(evt);
      if (!node) { touchPick = null; if (hover) setHover(null); return; }
      var touch = evt.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(hover: none)').matches);
      if (touch && touchPick !== node.id) { touchPick = node.id; setHover(node); return; }
      if (opts.hrefFor) location.href = opts.hrefFor(node.id);
    });

    /* ---------------- 生命周期 */
    readColors();
    layout();
    if (opts.count) opts.count.textContent = nodes.length + ' 个知识点 · ' + edges.length + ' 条先修';
    if (reduce) {
      current = nextChain();
      setCaption(current, true);
      render(0);
    } else {
      begin(performance.now());
      play();
    }
    var pending = 0;
    function relayout() {
      if (pending) return;
      pending = requestAnimationFrame(function () {
        pending = 0;
        layout();
        render(performance.now());
      });
    }
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(canvas);
    else window.addEventListener('resize', relayout);
    window.addEventListener('themechange', function () { readColors(); drawStatic(); render(performance.now()); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) play(); else pause();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
    return { chainFor: chainFor };
  }

  window.Constellation = { mount: mount };
})();
