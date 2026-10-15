/* 算数プリント自動生成メーカー — A4レイアウト（mm単位でページを組み立てる） */
(function (root) {
  'use strict';
  const G = root.SansuGen;

  const PAGE = { w: 210, h: 297, margin: 10 };
  const CONTENT_W = PAGE.w - PAGE.margin * 2; // 190
  const CONTENT_H = PAGE.h - PAGE.margin * 2; // 277
  const PAGE_HEAD = 21;
  const DAY_HEAD = 12;
  const DAY_GAP = 5;
  const BODY_H = CONTENT_H - PAGE_HEAD;

  const SIZES = {
    L: { cell: 11, yokoH: 17, yokoFont: 7.4, label: 3.8 },
    M: { cell: 9, yokoH: 13, yokoFont: 5.8, label: 3.4 },
    S: { cell: 7.5, yokoH: 10.5, yokoFont: 4.8, label: 3 },
  };
  const WDAY = ['日', '月', '火', '水', '木', '金', '土'];

  const nd = (n) => String(n).length;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opText = (op) => ({ '+': '+', '-': '−', '×': '×', '÷': '÷' }[op] || op);

  // ---------- 筆算の形（整数・小数） ----------
  // 各行：dig＝数字だけの並び、frac＝小数部分のけた数、pad＝右につめる空きマス
  // わり算の筆算：わる数）わられる数 の形。小数点を動かしたあとの位置で商をそろえる
  function divModel(p) {
    const [a, b] = p.terms.map(String);
    const split = (x) => { const [i, f = ''] = x.split('.'); return { dig: i + f, frac: f.length }; };
    const A = split(a), B = split(b), Q = split(String(p.ans));
    const shift = A.frac - B.frac; // わる数を整数にしたあとの、わられる数の小数のけた数
    const P = Math.max(shift, Q.frac, 0);
    const I = A.dig.length - shift; // 小数点より左のマス数（動かしたあと）
    const Wa = I + P;
    const k = Q.dig.replace(/^0+/, '').length || 1; // 商のけた数（計算の行の数を決める）
    const rem = 'rem' in p || p.remBox;
    return { kind: 'div', A, B, Q, I, P, Wa, Wd: B.dig.length, k, shift, rem, nrows: 2 + 2 * k, width: B.dig.length + 0.5 + Wa };
  }

  function hModel(p) {
    if (p.ops[0] === '÷') return divModel(p);
    const [a, b] = p.terms.map(String), op = p.ops[0];
    const split = (x) => { const [i, f = ''] = x.split('.'); return { dig: i + f, frac: f.length }; };
    const A = split(a), B = split(b);
    const trailZeros = (dig, frac) => { let k = 0; while (k < frac && dig[dig.length - 1 - k] === '0') k++; return k; };
    let rows, ans, partial = 0;
    if (op === '+' || op === '-') {
      const F = Math.max(A.frac, B.frac);
      const sc = (x) => Number(x.dig) * 10 ** (F - x.frac);
      const res = op === '+' ? sc(A) + sc(B) : sc(A) - sc(B);
      const dig = String(res).padStart(F + 1, '0');
      rows = [{ dig: A.dig, frac: A.frac, pad: F - A.frac }, { dig: B.dig, frac: B.frac, pad: F - B.frac, sign: op }];
      ans = { dig, frac: F, pad: 0, strike: trailZeros(dig, F) };
    } else {
      const places = A.frac + B.frac;
      const dig = String(Number(A.dig) * Number(B.dig)).padStart(places + 1, '0');
      rows = [{ dig: A.dig, frac: A.frac, pad: 0 }, { dig: B.dig, frac: B.frac, pad: 0, sign: op }];
      ans = { dig, frac: places, pad: 0, strike: trailZeros(dig, places) };
      if (Number(B.dig) >= 10) partial = 2;
    }
    let W = Math.max(...rows.concat([ans]).map((x) => x.dig.length + x.pad));
    if (partial) W = Math.max(W, String(Number(A.dig)).length + String(Number(B.dig)).length);
    return { rows, ans, partial, W, nrows: 3 + partial, width: W + 1 };
  }

  const FR = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/;
  // 横式の幅の見積もり（em）
  function numEm(t) {
    const m = String(t).match(FR);
    if (!m) { const x = String(t); return x.replace('.', '').length * 0.62 + (x.includes('.') ? 0.3 : 0) + 0.3; }
    return (m[1] ? m[1].length * 0.62 + 0.15 : 0) + Math.max(m[2].length, m[3].length) * 0.46 + 0.6;
  }
  function fracAnswerParts(ans) {
    const x = G.parseNum(ans);
    const mixed = G.mixedStr(x.n, x.d);
    const improper = x.d !== 1 && x.n > x.d ? G.fracStr(x.n, x.d) : null;
    return { mixed, improper };
  }
  function ansEm(p) {
    if (p.kind === 'frac') {
      const f = fracAnswerParts(p.ans);
      return Math.max(3.2, (f.improper ? numEm(f.improper) + numEm(f.mixed) + 1.3 : numEm(f.mixed)));
    }
    return Math.max(2.4, nd(p.ans) * 0.72 + 1.2);
  }
  const remEm = (p) => Math.max(2.6, nd(p.rem ?? '') * 0.72 + 1.2);

  function measure(cfg, allProblems) {
    const s = SIZES[cfg.size] || SIZES.M;
    const gapX = 6;
    if (cfg.fmt === 'hissan') {
      let W = 1, rows = 3, width = 2, remRow = false;
      for (const p of allProblems) {
        const mo = hModel(p);
        if (mo.kind !== 'div') W = Math.max(W, mo.W);
        rows = Math.max(rows, mo.nrows);
        width = Math.max(width, mo.kind === 'div' ? mo.width : W + 1);
        if (mo.kind === 'div' && (cfg.remBox || mo.rem)) remRow = true;
      }
      const itemW = width * s.cell;
      const itemH = rows * s.cell + s.label + 1.5 + (remRow ? s.cell * 0.95 : 0);
      const cols = Math.max(1, Math.min(5, Math.floor((CONTENT_W + gapX) / (itemW + gapX + 4))));
      return { s, W, rows, itemW, itemH, rowGap: 5, cols, remRow };
    }
    // 横式：いちばん長い式の幅を見積もって、1行に入る問題数を決める（最大4列）
    let em = 0;
    const frac = allProblems.some((p) => p.kind === 'frac');
    const work = frac && cfg.work;
    for (const p of allProblems) {
      let w = 0.9 + ansEm(p) + 0.5;
      p.terms.forEach((t) => { w += numEm(t); });
      w += p.ops.length * 0.95 + (p.paren ? 0.9 : 0) + (p.round ? 0.9 : 0);
      if (cfg.remBox) w += 1.9 + remEm(p) + 0.4;
      em = Math.max(em, w);
    }
    const itemW = em * s.yokoFont + 2.6 * s.label; // 2.6*label = 問題番号の幅
    const cols = Math.max(1, Math.min(work ? 2 : 4, Math.floor((CONTENT_W - 6 + gapX) / (itemW + gapX))));
    const itemH = s.yokoH * (frac ? 1.75 : 1) + (work ? s.yokoH * 1.2 : 0);
    return { s, itemH, rowGap: frac ? 3 : 1.5, cols, frac, work };
  }

  // 問題数に合わせて列をならす（例：6問・最大5列 → 3列×2行）
  function balanceCols(count, maxCols) {
    const rows = Math.ceil(count / maxCols);
    return Math.max(1, Math.ceil(count / rows));
  }

  // 1日分の区画の高さ、1枚に入る日数、1日に入る最大問題数
  function plan(cfg, allProblems) {
    const m = measure(cfg, allProblems);
    const rowH = m.itemH + m.rowGap;
    const maxRows = Math.max(1, Math.floor((BODY_H - DAY_HEAD + m.rowGap) / rowH));
    const maxCount = maxRows * m.cols;
    const rows = Math.ceil(cfg.count / m.cols);
    const blockH = DAY_HEAD + rows * rowH;
    let perPage = 1;
    if (cfg.layout === 'multi') perPage = Math.max(1, Math.floor((BODY_H + DAY_GAP) / (blockH + DAY_GAP)));
    const pages = Math.ceil(cfg.days / perPage);
    const useCols = balanceCols(Math.min(cfg.count, maxCount), m.cols);
    return Object.assign(m, { maxCount, perPage, pages, blockH, useCols });
  }

  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // 日付の一覧：算数がある曜日だけ・とばす日をのぞいて、はじめの日から順に
  function dateList(cfg) {
    const out = [];
    if (cfg.dateMode !== 'auto' || !cfg.startDate) {
      for (let i = 0; i < cfg.days; i++) out.push(null);
      return out;
    }
    const wd = cfg.weekdays && cfg.weekdays.length ? new Set(cfg.weekdays) : null;
    const skip = new Set(cfg.skipDates || []);
    const [y, mo, da] = cfg.startDate.split('-').map(Number);
    const d = new Date(y, mo - 1, da);
    for (let guard = 0; out.length < cfg.days && guard < 800; guard++) {
      if ((!wd || wd.has(d.getDay())) && !skip.has(ymd(d))) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    while (out.length < cfg.days) out.push(null);
    return out;
  }

  // ---------- 部品 ----------
  // 手ごたえのことば（ふつうの顔はつくらない）。上ほど前向き、下ほど助けがほしい気持ち
  // mouth＝口、open＝口を開ける、eyes＝'happy'（にこにこ目）/'line'（とじた目）、brow＝まゆ、extra＝そのほかの線
  const SMILE_OPEN = 'M5.5 11 L14.5 11 Q14 16.2 10 16.2 Q6 16.2 5.5 11 Z';
  const FEELINGS = [
    { key: 'batchiri', label: 'ばっちり', mouth: SMILE_OPEN, open: true, eyes: 'happy', extra: 'M16.8 2.2 L17.4 3.8 L19 4.4 L17.4 5 L16.8 6.6 L16.2 5 L14.6 4.4 L16.2 3.8 Z' },
    { key: 'sura', label: 'すらすら', mouth: SMILE_OPEN, open: true },
    { key: 'tanoshii', label: 'たのしい', mouth: 'M6 12 Q10 16.5 14 12', eyes: 'happy' },
    { key: 'wakatta', label: 'わかった', mouth: 'M6.5 12.5 Q10 15.5 13.5 12.5', brow: 'M5.4 5.2 Q7 4 8.6 5.2 M11.4 5.2 Q13 4 14.6 5.2' },
    { key: 'ike', label: 'いけそう', mouth: 'M6.5 12.5 Q10 14.8 13.5 12.5' },
    { key: 'mousukoshi', label: 'もうすこし', mouth: 'M6.8 13.6 Q10 13.8 13.4 12.2' },
    { key: 'fuan', label: 'ちょっとふあん', mouth: 'M6.5 14 Q10 12 13.5 14' },
    { key: 'shin', label: 'しんぱい', mouth: 'M6.5 14 Q8.2 12.6 10 14 Q11.8 15.4 13.5 14', brow: 'M5.2 5.6 L8.3 4.7 M14.8 5.6 L11.7 4.7' },
    { key: 'moya', label: 'もやもや', mouth: 'M6 13.8 L7.6 12.8 L9.2 13.8 L10.8 12.8 L12.4 13.8 L14 12.8', eyes: 'line' },
    { key: 'kuyashii', label: 'くやしい', mouth: 'M6.5 14.8 Q10 11.8 13.5 14.8', brow: 'M5.2 4.6 L8.6 6 M14.8 4.6 L11.4 6' },
    { key: 'muzu', label: 'むずかしい', mouth: 'M6 15 Q10 10.5 14 15' },
    { key: 'wakaranai', label: 'わからない', mouth: 'M10 12.6 m-1.5 1.4 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0', brow: 'M5.4 5.6 L8.4 5 M11.6 4.4 Q13 3.6 14.6 4.8' },
  ];
  const FEEL_MAX = 5;
  const FEEL_DEFAULT = ['sura', 'ike', 'fuan', 'muzu'];
  function faceSvg(f) {
    const eyes = f.eyes === 'happy'
      ? '<path d="M5.6 8.6 Q7 6.6 8.4 8.6 M11.6 8.6 Q13 6.6 14.4 8.6" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
      : f.eyes === 'line'
        ? '<path d="M5.8 8 L8.2 8 M11.8 8 L14.2 8" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
        : '<circle cx="7" cy="8" r="1.1" fill="currentColor"/><circle cx="13" cy="8" r="1.1" fill="currentColor"/>';
    return `<svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" stroke-width="1.1"/>
        ${eyes}
        ${f.brow ? `<path d="${f.brow}" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>` : ''}
        ${f.extra ? `<path d="${f.extra}" fill="currentColor"/>` : ''}
        <path d="${f.mouth}" fill="${f.open ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }
  function faces(cfg) {
    const keys = cfg.feelWords && cfg.feelWords.length ? cfg.feelWords : FEEL_DEFAULT;
    const list = FEELINGS.filter((f) => keys.includes(f.key)).slice(0, FEEL_MAX);
    if (cfg.feelStyle === 'word') {
      return `<span class="faces words">${list.map((f) => `<span class="word">${f.label}</span>`).join('')}</span>`;
    }
    return `<span class="faces">${list.map((f) => `<span class="face">${faceSvg(f)}<span class="facelabel">${f.label}</span></span>`).join('')}</span>`;
  }

  function dayHead(cfg, date, answer) {
    const dateHtml = date
      ? `<span class="date">${date.getMonth() + 1}月${date.getDate()}日（${WDAY[date.getDay()]}）</span>`
      : `<span class="date blank"><i></i>月<i></i>日（<i class="s"></i>）</span>`;
    if (answer) return `<div class="dhead">${dateHtml}</div>`;
    return `<div class="dhead">${dateHtml}
      ${cfg.time ? '<span class="time"><i></i>分<i></i>秒</span>' : ''}
      ${cfg.face ? faces(cfg) : ''}
      <span class="score"><i></i>/ ${cfg.count}もん</span></div>`;
  }

  function numHtml(t) {
    const m = String(t).match(FR);
    if (!m) return `<span class="num">${t}</span>`;
    return `${m[1] ? `<span class="num">${m[1]}</span>` : ''}<span class="fr"><span>${m[2]}</span><span>${m[3]}</span></span>`;
  }

  function yokoItem(p, n, cfg, answer, ansW, remW) {
    const parts = [];
    p.terms.forEach((t, i) => {
      if (i > 0) parts.push(`<span class="op">${opText(p.ops[i - 1])}</span>`);
      const open = (p.paren === 'L' && i === 0) || (p.paren === 'R' && i === 1);
      const close = (p.paren === 'L' && i === 1) || (p.paren === 'R' && i === 2);
      parts.push(`${open ? '<span class="pa">(</span>' : ''}${numHtml(t)}${close ? '<span class="pa">)</span>' : ''}`);
    });
    const box = (v, w) => `<span class="box" style="min-width:${w}em">${answer && v !== '' ? `<b>${v}</b>` : ''}</span>`;
    let ansHtml;
    if (p.kind === 'frac') {
      if (answer) {
        const f = fracAnswerParts(p.ans);
        // 仮分数を先に、帯分数は（ ）で示す（どちらで書いても正解）
        ansHtml = `<span class="fans"><b>${numHtml(f.improper || f.mixed)}</b>${f.improper ? `<b class="imp">（${numHtml(f.mixed)}）</b>` : ''}</span>`;
      } else ansHtml = '<span class="box fbig"></span>'; // 帯分数でも仮分数でも書ける四角
    } else ansHtml = (p.round ? '<span class="yaku">約</span>' : '') + box(p.ans, ansW);
    let rem = '';
    if (cfg.remBox && (cfg.remBox !== 'per' || p.rem !== undefined)) {
      const v = p.rem ? p.rem : (answer ? 'なし' : '');
      rem = `<span class="amari">あまり</span>${box(v, remW)}`;
    }
    const row = `<div class="yk${p.kind === 'frac' ? ' frac' : ''}"><span class="no">(${n})</span><span class="expr">${parts.join('')}<span class="op">=</span></span>${ansHtml}${rem}</div>`;
    if (p.kind === 'frac' && cfg.work) return `<div class="ykw">${row}<div class="work"><span>とちゅうの式</span></div></div>`;
    return row;
  }

  function divItem(p, n, cfg, m, answer, mo) {
    const { A, B, Q, I, Wa, Wd } = mo;
    const cells = [];
    const blank = (cls = '') => `<div class="c blank ${cls}"></div>`;
    // 1行め：商
    const qInt = Q.dig.slice(0, Q.dig.length - Q.frac), qFrac = Q.dig.slice(Q.dig.length - Q.frac);
    for (let i = 0; i < Wd; i++) cells.push(blank());
    cells.push(blank('brs'));
    for (let c = 0; c < Wa; c++) {
      let ch = '';
      if (c < I) { const k = I - 1 - c; if (k < qInt.length) ch = qInt[qInt.length - 1 - k]; }
      else if (c - I < qFrac.length) ch = qFrac[c - I];
      const dp = answer && Q.frac > 0 && c === I - 1;
      cells.push(`<div class="c d q${dp ? ' dp' : ''}">${answer && ch ? `<b>${ch}</b>` : ''}</div>`);
    }
    // 2行め：わる数 ）わられる数
    for (let i = 0; i < Wd; i++) {
      const dp = B.frac > 0 && i === Wd - 1 - B.frac;
      const moved = answer && B.frac > 0 && i === Wd - 1;
      cells.push(`<div class="c d dv${dp ? ' dp' : ''}${moved ? ' dpn' : ''}">${B.dig[i]}</div>`);
    }
    cells.push('<div class="c br"></div>');
    for (let c = 0; c < Wa; c++) {
      const ch = c < A.dig.length ? A.dig[c] : '';
      const dp = A.frac > 0 && c === A.dig.length - 1 - A.frac;
      const moved = answer && B.frac > 0 && c === I - 1; // 答えのページだけ、動かしたあとの小数点を赤で示す
      cells.push(`<div class="c d vin${dp ? ' dp' : ''}${moved && !dp ? ' dpn' : ''}">${ch}</div>`);
    }
    // 計算の行（ひく数・ひいた答えを2行ずつ）
    const work = Math.max(mo.nrows, m.rows) - 2;
    for (let k = 0; k < work; k++) {
      for (let i = 0; i < Wd; i++) cells.push(blank());
      cells.push(blank('brs'));
      for (let c = 0; c < Wa; c++) cells.push(`<div class="c d${k % 2 === 0 && k < 2 * mo.k ? ' under' : ''}"></div>`);
    }
    let remHtml = '';
    if (m.remRow) {
      const v = p.rem !== undefined && p.rem !== '' ? p.rem : (answer ? 'なし' : '');
      remHtml = (cfg.remBox && cfg.remBox !== 'per') || p.rem !== undefined ? `<div class="hrem">あまり<span class="box">${answer ? `<b>${v}</b>` : ''}</span></div>` : '<div class="hrem"></div>';
    }
    const cols = `repeat(${Wd},var(--cell)) calc(var(--cell)*0.5) repeat(${Wa},var(--cell))`;
    return `<div class="hs" style="width:${mo.width * m.s.cell}mm"><span class="no">(${n})</span>
      <div class="hgrid div" style="grid-template-columns:${cols}">${cells.join('')}</div>${remHtml}</div>`;
  }

  function hissanItem(p, n, cfg, m, answer) {
    const W = m.W, cols = W + 1;
    const mo = hModel(p);
    if (mo.kind === 'div') return divItem(p, n, cfg, m, answer, mo);
    const cells = [];
    const rowHtml = (row, cls, show) => {
      const out = [`<div class="c sign ${cls}">${row && row.sign ? opText(row.sign) : ''}</div>`];
      for (let i = 0; i < W; i++) {
        const r0 = W - 1 - i; // 右から何マスめか
        let ch = '', dp = false, z = false;
        if (row && show) {
          const k = r0 - row.pad;
          if (k >= 0 && k < row.dig.length) ch = row.dig[row.dig.length - 1 - k];
          if (row.frac > 0 && r0 === row.pad + row.frac) dp = true;
          if (row.strike && k >= 0 && k < row.strike) z = true;
        }
        const inner = ch ? (cls.includes('ans') ? `<b${z ? ' class="z"' : ''}>${ch}</b>` : ch) : '';
        out.push(`<div class="c d ${cls}${dp ? ' dp' : ''}">${inner}</div>`);
      }
      return out.join('');
    };
    cells.push(rowHtml(mo.rows[0], 'n', true));
    cells.push(rowHtml(mo.rows[1], 'n under', true));
    for (let k = 0; k < mo.partial; k++) cells.push(rowHtml(null, k === mo.partial - 1 ? 'n under' : 'n', false));
    // 形がちがう問題がまじるときに高さをそろえる
    for (let k = mo.nrows; k < m.rows; k++) cells.push(`<div class="c sign blankrow"></div>` + '<div class="c blankrow"></div>'.repeat(W));
    cells.push(rowHtml(mo.ans, 'n ans', answer));
    return `<div class="hs" style="width:${(W + 1) * m.s.cell}mm"><span class="no">(${n})</span>
      <div class="hgrid" style="grid-template-columns:repeat(${cols},var(--cell))">${cells.join('')}</div></div>`;
  }

  function dayBlock(cfg, m, list, date, answer, single) {
    const ansW = Math.max(2.4, Math.max(...list.map((p) => nd(p.ans))) * 0.72 + 1.2);
    const remW = Math.max(...list.map(remEm));
    const items = list.map((p, i) => cfg.fmt === 'hissan' ? hissanItem(p, i + 1, cfg, m, answer) : yokoItem(p, i + 1, cfg, answer, ansW, remW));
    return `<section class="day${single ? ' single' : ''}">${dayHead(cfg, date, answer)}
      <div class="grid ${cfg.fmt}" style="grid-template-columns:repeat(${m.useCols},1fr);row-gap:${m.rowGap}mm">${items.join('')}</div></section>`;
  }

  function pageHead(cfg, answer) {
    return `<header class="phead"><div class="ptitle">${answer ? '<span class="tag">こたえ</span>' : ''}${esc(cfg.title)}</div>
      ${answer ? '' : '<div class="pname">なまえ<span class="line"></span></div>'}</header>`;
  }

  /** ページのHTMLを作る。戻り値：{ html, plan } */
  function render(cfg, days) {
    const all = days.flat();
    const pl = plan(cfg, all);
    const dates = dateList(cfg);
    const s = pl.s;
    const style = `--cell:${s.cell}mm;--yoko:${s.yokoFont}mm;--yokoH:${s.yokoH}mm;--label:${s.label}mm`;
    const build = (answer) => {
      const pages = [];
      for (let pg = 0; pg < pl.pages; pg++) {
        const blocks = [];
        for (let k = 0; k < pl.perPage; k++) {
          const d = pg * pl.perPage + k;
          if (d >= days.length) break;
          blocks.push(dayBlock(cfg, pl, days[d], dates[d], answer, pl.perPage === 1));
        }
        pages.push(`<div class="page${answer ? ' answer' : ''}" style="${style}">${pageHead(cfg, answer)}<div class="pbody">${blocks.join('')}</div></div>`);
      }
      return pages;
    };
    let pages = build(false);
    if (cfg.answers) pages = pages.concat(build(true));
    return { html: pages.join(''), plan: pl, pageCount: pages.length };
  }

  root.SansuLayout = { FEELINGS, FEEL_MAX, faceSvg, dateList, ymd, render, plan, measure, SIZES, PAGE };
})(window);
