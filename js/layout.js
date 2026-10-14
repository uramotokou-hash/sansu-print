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

  // ---------- 筆算の形 ----------
  function hissanShape(p) {
    const [a, b] = p.terms, op = p.ops[0];
    if (op === '×' && b >= 10) {
      const W = nd(a) + nd(b);
      return { kind: 'mul2', W, rows: 5 };
    }
    const W = Math.max(nd(a), nd(b), nd(p.ans));
    return { kind: 'basic', W, rows: 3 };
  }

  function measure(cfg, allProblems) {
    const s = SIZES[cfg.size] || SIZES.M;
    const gapX = 6;
    if (cfg.fmt === 'hissan') {
      let W = 1, rows = 3, kind = 'basic';
      for (const p of allProblems) {
        const sh = hissanShape(p);
        W = Math.max(W, sh.W);
        if (sh.rows > rows) { rows = sh.rows; kind = sh.kind; }
      }
      const itemW = (W + 1) * s.cell;
      const itemH = rows * s.cell + s.label + 1.5;
      const cols = Math.max(1, Math.min(5, Math.floor((CONTENT_W + gapX) / (itemW + gapX + 4))));
      return { s, W, rows, kind, itemW, itemH, rowGap: 5, cols };
    }
    // 横式：いちばん長い式の幅を見積もって、1行に入る問題数を決める（最大4列）
    let em = 0;
    for (const p of allProblems) {
      let w = 0.9 + Math.max(2.4, nd(p.ans) * 0.72 + 1.2) + 0.5;
      p.terms.forEach((t) => { w += nd(t) * 0.62 + 0.3; });
      w += p.ops.length * 0.95;
      if (cfg.remBox) w += 1.9 + 2.6 + 0.4;
      em = Math.max(em, w);
    }
    const itemW = em * s.yokoFont + 2.6 * s.label; // 2.6*label = 問題番号の幅
    const cols = Math.max(1, Math.min(4, Math.floor((CONTENT_W - 6 + gapX) / (itemW + gapX))));
    return { s, itemH: s.yokoH, rowGap: 1.5, cols };
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

  function dateList(cfg) {
    const out = [];
    if (cfg.dateMode !== 'auto' || !cfg.startDate) {
      for (let i = 0; i < cfg.days; i++) out.push(null);
      return out;
    }
    const [y, mo, da] = cfg.startDate.split('-').map(Number);
    const d = new Date(y, mo - 1, da);
    while (out.length < cfg.days) {
      const w = d.getDay();
      if (!(cfg.skipWeekend && (w === 0 || w === 6))) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // ---------- 部品 ----------
  function faces() {
    const face = (mouth, label) => `
      <span class="face"><svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" stroke-width="1.1"/>
        <circle cx="7" cy="8" r="1.1" fill="currentColor"/><circle cx="13" cy="8" r="1.1" fill="currentColor"/>
        <path d="${mouth}" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg><span class="facelabel">${label}</span></span>`;
    return `<span class="faces">
      ${face('M6 12 Q10 16 14 12', 'すらすら')}
      ${face('M6.5 13 L13.5 13', 'ちょっと')}
      ${face('M6 14.5 Q10 10.5 14 14.5', 'むずかしい')}
    </span>`;
  }

  function dayHead(cfg, date, answer) {
    const dateHtml = date
      ? `<span class="date">${date.getMonth() + 1}月${date.getDate()}日（${WDAY[date.getDay()]}）</span>`
      : `<span class="date blank"><i></i>月<i></i>日（<i class="s"></i>）</span>`;
    if (answer) return `<div class="dhead">${dateHtml}</div>`;
    return `<div class="dhead">${dateHtml}
      ${cfg.time ? '<span class="time"><i></i>分<i></i>秒</span>' : ''}
      ${cfg.face ? faces() : ''}
      <span class="score"><i></i>/ ${cfg.count}もん</span></div>`;
  }

  function yokoItem(p, n, cfg, answer, ansW) {
    const parts = [];
    p.terms.forEach((t, i) => {
      if (i > 0) parts.push(`<span class="op">${opText(p.ops[i - 1])}</span>`);
      parts.push(`<span class="num">${t}</span>`);
    });
    const box = (v, w) => `<span class="box" style="min-width:${w}em">${answer && v !== '' ? `<b>${v}</b>` : ''}</span>`;
    let rem = '';
    if (cfg.remBox) {
      const v = p.rem ? p.rem : (answer ? 'なし' : '');
      rem = `<span class="amari">あまり</span>${box(v, 2.6)}`;
    }
    return `<div class="yk"><span class="no">(${n})</span><span class="expr">${parts.join('')}<span class="op">=</span></span>${box(p.ans, ansW)}${rem}</div>`;
  }

  function hissanItem(p, n, cfg, m, answer) {
    const W = m.W, cols = W + 1;
    const [a, b] = p.terms, op = p.ops[0];
    const cells = [];
    const digitsRow = (val, shift, cls, sign, show) => {
      const str = val === null ? '' : String(val);
      const row = [`<div class="c sign ${cls}">${sign ? opText(sign) : ''}</div>`];
      for (let i = 0; i < W; i++) {
        const fromRight = W - 1 - i - shift;
        const ch = fromRight >= 0 && fromRight < str.length ? str[str.length - 1 - fromRight] : '';
        row.push(`<div class="c d ${cls}">${show && ch ? (cls.includes('ans') ? `<b>${ch}</b>` : ch) : ''}</div>`);
      }
      return row.join('');
    };
    cells.push(digitsRow(a, 0, 'n', null, true));
    cells.push(digitsRow(b, 0, 'n under', op, true));
    let rowsUsed = 3;
    if (op === '×' && b >= 10) {
      cells.push(digitsRow(null, 0, 'n', null, false));
      cells.push(digitsRow(null, 1, 'n under', null, false));
      rowsUsed = 5;
    }
    // 形がちがう問題がまじるときに高さをそろえる
    for (let k = rowsUsed; k < m.rows; k++) {
      if (k === m.rows - 1) break;
      cells.push(`<div class="c sign blankrow"></div>` + '<div class="c blankrow"></div>'.repeat(W));
    }
    cells.push(digitsRow(p.ans, 0, 'n ans', null, answer));
    return `<div class="hs" style="width:${(W + 1) * m.s.cell}mm"><span class="no">(${n})</span>
      <div class="hgrid" style="grid-template-columns:repeat(${cols},var(--cell))">${cells.join('')}</div></div>`;
  }

  function dayBlock(cfg, m, list, date, answer, single) {
    const ansW = Math.max(2.4, Math.max(...list.map((p) => nd(p.ans))) * 0.72 + 1.2);
    const items = list.map((p, i) => cfg.fmt === 'hissan' ? hissanItem(p, i + 1, cfg, m, answer) : yokoItem(p, i + 1, cfg, answer, ansW));
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

  root.SansuLayout = { render, plan, measure, SIZES, PAGE };
})(window);
