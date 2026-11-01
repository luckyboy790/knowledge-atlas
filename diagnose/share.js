/* 诊断结果分享图：canvas 竖图，系统字体，二维码用本地 qrcode-generator 绘制。 */
(function (global) {
  'use strict';
  var shareHome = new URL('../index.html', location.href);
  var shareSubject = global.Subjects ? global.Subjects.read() : 'math';
  if (shareSubject !== 'math') shareHome.searchParams.set('subject', shareSubject);
  function uiText(text) { return global.Subjects ? global.Subjects.assessment(text, shareSubject) : text; }
  var SHARE_URL = shareHome.href;
  var W = 1080;
  var H = 1920;
  var FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", sans-serif';

  function font(weight, size) { return weight + ' ' + size + 'px ' + FONT; }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function card(ctx, x, y, w, h, r) {
    fillRound(ctx, x, y, w, h, r, '#ffffff');
    ctx.strokeStyle = '#e6e4de';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  function ellipsis(ctx, text, maxWidth) {
    var chars = Array.from(String(text || ''));
    var raw = chars.join('');
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    var s = '';
    for (var i = 0; i < chars.length; i++) {
      if (ctx.measureText(s + chars[i] + '…').width > maxWidth) return s + '…';
      s += chars[i];
    }
    return s + '…';
  }

  function wrap(ctx, text, maxWidth, maxLines) {
    var chars = Array.from(String(text || ''));
    var lines = [];
    var cur = '';
    for (var i = 0; i < chars.length; i++) {
      var next = cur + chars[i];
      var overflow = cur && ctx.measureText(next).width > maxWidth;
      if (overflow && lines.length === maxLines - 1) {
        lines.push(ellipsis(ctx, chars.slice(i - cur.length).join(''), maxWidth));
        return lines;
      }
      if (overflow) { lines.push(cur); cur = chars[i]; }
      else cur = next;
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines;
  }

  function drawLogo(ctx, x, y, s) {
    // 与站点图标一致：墨色圆角方块上三个学段色节点
    fillRound(ctx, x, y, s, s, s * 0.28, '#2a2d35');
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.297, y + s * 0.672);
    ctx.lineTo(x + s * 0.5, y + s * 0.328);
    ctx.lineTo(x + s * 0.703, y + s * 0.609);
    ctx.stroke();
    [[0.297, 0.672, '#2fc7b4'], [0.5, 0.328, '#7ea4ff'], [0.703, 0.609, '#f2b84b']].forEach(function (p) {
      ctx.fillStyle = p[2];
      ctx.beginPath();
      ctx.arc(x + s * p[0], y + s * p[1], s * 0.097, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawQr(ctx, text, x, y, size) {
    var make = global.qrcode;
    if (typeof make !== 'function') throw new Error('二维码库没有加载');
    var qr = make(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var quiet = 4;
    var modules = n + quiet * 2;
    var cell = Math.floor(size / modules);
    if (cell < 2) cell = 2;
    var drawn = cell * modules;
    var ox = Math.round(x + (size - drawn) / 2);
    var oy = Math.round(y + (size - drawn) / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
    ctx.fillStyle = '#000000';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (!qr.isDark(r, c)) continue;
        ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
      }
    }
  }

  function text(ctx, value, x, y, weight, size, color, maxWidth) {
    ctx.fillStyle = color;
    ctx.font = font(weight, size);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    var line = maxWidth ? ellipsis(ctx, value, maxWidth) : String(value);
    ctx.fillText(line, x, y);
  }

  function draw(canvas, model) {
    var m = model || {};
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#efeee9');
    bg.addColorStop(0.45, '#f7f6f3');
    bg.addColorStop(1, '#efeee9');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#15171c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 460);
    ctx.quadraticCurveTo(W, 500, W - 40, 500);
    ctx.lineTo(40, 500);
    ctx.quadraticCurveTo(0, 500, 0, 460);
    ctx.closePath();
    ctx.fill();

    drawLogo(ctx, 64, 56, 84);
    text(ctx, m.siteName || '学科知识图谱', 168, 64, 800, 40, '#ffffff', 820);
    text(ctx, uiText('诊断结果'), 168, 114, 500, 26, 'rgba(255,255,255,0.86)', 820);

    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 56);
    var headline = (m.scope || uiText('本次诊断')) + '  ' + (m.subject || '');
    var lines = wrap(ctx, headline.trim(), 940, 2);
    lines.forEach(function (line, i) { ctx.fillText(line, 64, 196 + i * 70); });
    text(ctx, '生成日期  ' + (m.date || ''), 64, 196 + lines.length * 70 + 18, 500, 28, 'rgba(255,255,255,0.9)', 900);

    var cardX = 48;
    var cardW = W - 96;
    var statsY = 430;
    var statsH = 214;
    ctx.save();
    ctx.shadowColor = 'rgba(21, 23, 28, 0.12)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    fillRound(ctx, cardX, statsY, cardW, statsH, 28, '#ffffff');
    ctx.restore();

    var stats = [
      { n: m.mastered, label: '已掌握', fg: '#1f8a4c', bg: '#e2f3e8' },
      { n: m.shaky, label: '不稳', fg: '#b86a00', bg: '#fcf0d9' },
      { n: m.weak, label: '薄弱', fg: '#d1373a', bg: '#fcebea' },
      { n: m.untested, label: '未测', fg: '#636977', bg: '#eeede8' }
    ];
    var gap = 16;
    var chipW = (cardW - 40 - gap * 3) / 4;
    var chipH = 166;
    stats.forEach(function (s, i) {
      var x = cardX + 20 + i * (chipW + gap);
      var y = statsY + 24;
      fillRound(ctx, x, y, chipW, chipH, 18, s.bg);
      ctx.fillStyle = s.fg;
      ctx.font = font(800, 58);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(s.n == null ? 0 : s.n), x + chipW / 2, y + 32);
      ctx.font = font(700, 26);
      ctx.fillText(s.label, x + chipW / 2, y + 108);
    });
    ctx.textAlign = 'left';

    var y = statsY + statsH + 36;
    var spotTitle = m.spotKind === 'chapter' ? '最薄弱的章节' : '最薄弱的知识点';
    text(ctx, spotTitle, 64, y, 800, 34, '#15171c');
    y += 52;
    var spots = Array.isArray(m.spots) ? m.spots.slice(0, 3) : [];
    if (!spots.length) {
      card(ctx, cardX, y, cardW, 88, 18);
      text(ctx, '这次没有明显薄弱的地方', 80, y + 28, 500, 28, '#5f6573', cardW - 64);
      y += 104;
    } else {
      spots.forEach(function (spot, i) {
        card(ctx, cardX, y, cardW, 112, 18);
        ctx.fillStyle = '#15171c';
        ctx.beginPath();
        ctx.arc(cardX + 48, y + 56, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = font(800, 24);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), cardX + 48, y + 57);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        text(ctx, spot.title || '', cardX + 88, y + 24, 700, 30, '#15171c', cardW - 120);
        text(ctx, spot.detail || '', cardX + 88, y + 64, 500, 24, '#5f6573', cardW - 120);
        y += 126;
      });
    }

    y += 8;
    text(ctx, '最该先补的根因', 64, y, 800, 34, '#15171c');
    y += 52;
    var roots = Array.isArray(m.roots) ? m.roots.slice(0, 2) : [];
    if (!roots.length) {
      card(ctx, cardX, y, cardW, 88, 18);
      text(ctx, '这次没有判出需要先补的根因', 80, y + 28, 500, 28, '#5f6573', cardW - 64);
    } else {
      roots.forEach(function (name) {
        card(ctx, cardX, y, cardW, 96, 18);
        fillRound(ctx, cardX + 24, y + 24, 8, 48, 4, '#d1373a');
        text(ctx, name, cardX + 52, y + 30, 700, 30, '#15171c', cardW - 90);
        y += 110;
      });
    }

    ctx.fillStyle = '#efeee9';
    ctx.fillRect(0, 1504, W, H - 1504);
    ctx.fillStyle = '#e6e4de';
    ctx.fillRect(0, 1504, W, 2);

    var qrSize = 292;
    var qrX = 72;
    var qrY = 1540;
    ctx.save();
    ctx.shadowColor = 'rgba(21, 23, 28, 0.08)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    fillRound(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 20, '#ffffff');
    ctx.restore();
    drawQr(ctx, SHARE_URL, qrX, qrY, qrSize);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#15171c';
    ctx.font = font(800, 48);
    ctx.fillText(uiText('扫码免费诊断'), qrX + qrSize + 48, qrY + qrSize / 2 - 8);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#5f6573';
    ctx.font = font(500, 24);
    ctx.fillText('AI 生成初稿，仅供参考', W / 2, 1872);
    return canvas;
  }

  global.ShareCard = { draw: draw, url: SHARE_URL, width: W, height: H };
})(typeof window !== 'undefined' ? window : globalThis);
