/* 算数プリント自動生成メーカー — 画面の動き */
(function () {
  'use strict';
  const G = window.SansuGen, L = window.SansuLayout;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'sansu-print:v1';

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const newSeed = () => 1 + Math.floor(Math.random() * 2147483646);

  const DEFAULT = {
    g: 1, t: 'g1_add_carry', opts: {}, fmt: 'yoko', n: 5, d: 5, sd: '', dm: 'auto', wd: '1,2,3,4,5', skip: '',
    mode: 'diff', ly: 'multi', sz: 'M', fs: 'face', fw: 'sura,ike,fuan,muzu', time: false,
    ans: true, triv: true, work: false, ttl: '', cu: '', s: newSeed(),
  };
  const BOOL = ['time', 'ans', 'triv', 'work'];
  const NUM = ['g', 'n', 'd', 's'];

  let st = loadState();
  let last = null; // 最後に作ったページ

  // ---------- 状態の保存・復元（URL ＞ 端末の保存 ＞ 初期値） ----------
  function loadState() {
    let s = Object.assign({}, DEFAULT, { opts: {} });
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved) {
        if (saved.face === false && !saved.fs) saved.fs = 'none'; // 前の版の設定
        if (saved.sk === false && !saved.wd) saved.wd = '0,1,2,3,4,5,6';
        delete saved.face; delete saved.sk;
        s = Object.assign(s, saved);
      }
    } catch (e) { /* 保存なし */ }
    const q = new URLSearchParams(location.search);
    if (q.has('t')) {
      s.opts = {};
      for (const [k, v] of q) {
        if (k.startsWith('o_')) s.opts[k.slice(2)] = v;
        else if (BOOL.includes(k)) s[k] = v === '1';
        else if (NUM.includes(k)) s[k] = Number(v);
        else if (k in DEFAULT) s[k] = v;
      }
    }
    if (!G.TYPE_MAP[s.t]) { s.t = DEFAULT.t; s.opts = {}; }
    const type = G.TYPE_MAP[s.t];
    s.opts = Object.assign(G.defaultOptions(type), pickValid(type, s.opts));
    if (!type.hissan) s.fmt = 'yoko';
    if (!['yoko', 'hissan'].includes(s.fmt)) s.fmt = type.defFmt;
    s.n = clamp(s.n, 1, 50); s.d = clamp(s.d, 1, 20);
    if (!['face', 'word', 'none'].includes(s.fs)) s.fs = 'face';
    const wd = String(s.wd ?? '').split(',').filter((x) => /^[0-6]$/.test(x));
    s.wd = wd.length ? wd.join(',') : DEFAULT.wd;
    s.skip = String(s.skip || '').split(',').filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).join(',');
    const fw = String(s.fw || '').split(',').filter((k) => L.FEELINGS.some((f) => f.key === k));
    s.fw = fw.length ? fw.join(',') : DEFAULT.fw;
    if (!s.s) s.s = newSeed();
    return s;
  }
  function pickValid(type, opts) {
    const out = {};
    for (const op of type.options) {
      const v = opts[op.key];
      if (v === undefined) continue;
      if (op.multi) out[op.key] = String(v).split(',').filter((x) => op.choices.some((c) => c[0] === x)).join(',');
      else if (op.choices.some((c) => c[0] === v)) out[op.key] = v;
    }
    return out;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, Math.round(Number(v) || a))); }

  function toQuery() {
    const q = new URLSearchParams();
    for (const k of Object.keys(DEFAULT)) {
      if (k === 'opts') continue;
      const v = st[k];
      if (BOOL.includes(k)) q.set(k, v ? '1' : '0');
      else if (v !== '' && v !== undefined) q.set(k, v);
    }
    for (const [k, v] of Object.entries(st.opts)) q.set('o_' + k, v);
    return q.toString();
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) { /* 保存できない環境 */ }
    try { history.replaceState(null, '', '?' + toQuery()); } catch (e) { /* file:// など */ }
  }

  // ---------- 画面の部品 ----------
  function seg(el, choices, value, onPick, opts = {}) {
    el.innerHTML = '';
    const values = opts.multi ? String(value).split(',').filter(Boolean) : [String(value)];
    for (const [v, label, disabled] of choices) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.disabled = !!disabled;
      b.setAttribute('aria-pressed', values.includes(String(v)) ? 'true' : 'false');
      b.addEventListener('click', () => onPick(v));
      el.appendChild(b);
    }
  }

  function renderControls() {
    const type = G.TYPE_MAP[st.t];
    seg($('grades'), [1, 2, 3, 4, 5, 6].map((g) => [g, g + '年生']), st.g, (g) => { st.g = Number(g); update(false); });

    const list = G.TYPES.filter((t) => t.grade === st.g);
    const tl = $('types'); tl.innerHTML = '';
    for (const t of list.concat([G.TYPE_MAP.custom])) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t.id === 'custom' ? '✎ 自分で問題を入れる' : t.label;
      if (t.id === 'custom') b.className = 'custom';
      b.setAttribute('aria-pressed', t.id === st.t ? 'true' : 'false');
      b.addEventListener('click', () => selectType(t.id));
      tl.appendChild(b);
    }
    if (type.id !== 'custom' && type.grade !== st.g) {
      const p = document.createElement('p'); p.className = 'note';
      p.textContent = `いまえらんでいる型：${type.grade}年「${type.label}」`;
      tl.appendChild(p);
    }

    const box = $('typeOpts'); box.innerHTML = '';
    const isCustom = type.id === 'custom';
    $('customBox').hidden = !isCustom;
    if (isCustom) { if ($('customText').value !== st.cu) $('customText').value = st.cu; renderCustomStatus(); }
    if (!type.options.length && !isCustom) box.innerHTML = '<p class="note">この型には、むずかしさの切りかえはありません。</p>';
    for (const op of type.options) {
      const row = document.createElement('div'); row.className = 'optrow';
      row.innerHTML = `<span class="lbl">${op.label}</span>`;
      const s = document.createElement('div'); s.className = 'seg';
      seg(s, op.choices, st.opts[op.key], (v) => {
        if (op.multi) {
          const set = new Set(String(st.opts[op.key]).split(',').filter(Boolean));
          set.has(v) ? set.delete(v) : set.add(v);
          if (!set.size) return;
          st.opts[op.key] = op.choices.map((c) => c[0]).filter((c) => set.has(c)).join(',');
        } else st.opts[op.key] = v;
        update(true);
      }, { multi: op.multi });
      row.appendChild(s); box.appendChild(row);
    }

    $('fmtRow').hidden = !hissanAllowed(type);
    seg($('fmt'), [['yoko', '横式'], ['hissan', '筆算']], st.fmt, (v) => { st.fmt = v; update(true); });
    $('workRow').hidden = !hasFrac(type);
    $('work').checked = !!st.work;

    seg($('dateMode'), [['auto', '自動で入れる'], ['blank', '空欄（手書き）']], st.dm, (v) => { st.dm = v; update(true); });
    $('dateRow').hidden = st.dm !== 'auto';
    // 算数がある曜日（月曜はじまりで表示）
    const WD = [['1', '月'], ['2', '火'], ['3', '水'], ['4', '木'], ['5', '金'], ['6', '土'], ['0', '日']];
    seg($('weekdays'), WD, st.wd, (v) => {
      const set = new Set(String(st.wd).split(',').filter(Boolean));
      set.has(v) ? set.delete(v) : set.add(v);
      if (!set.size) return;
      st.wd = ['0', '1', '2', '3', '4', '5', '6'].filter((x) => set.has(x)).join(',');
      update(true);
    }, { multi: true });
    renderDateChips();
    seg($('mode'), [['diff', '毎日ちがう'], ['rep', 'くり返し'], ['part', '少しずつ入れかえ']], st.mode, (v) => { st.mode = v; update(true); });
    seg($('layoutSel'), [['single', '1日1枚'], ['multi', '1枚に何日分も']], st.ly, (v) => { st.ly = v; update(true); });
    seg($('size'), [['L', '大'], ['M', '中'], ['S', '小']], st.sz, (v) => { st.sz = v; update(true); });
    seg($('feelStyle'), [['face', '顔とことば'], ['word', 'ことばだけ'], ['none', 'なし']], st.fs, (v) => { st.fs = v; update(true); });
    $('feelWordsRow').hidden = st.fs === 'none';
    seg($('feelWords'), L.FEELINGS.map((f) => [f.key, f.label]), st.fw, (v) => {
      const set = new Set(String(st.fw).split(',').filter(Boolean));
      set.has(v) ? set.delete(v) : set.add(v);
      if (!set.size) return;
      st.fw = L.FEELINGS.map((f) => f.key).filter((k) => set.has(k)).join(',');
      update(true);
    }, { multi: true });

    $('count').value = st.n; $('days').value = st.d;
    $('startDate').value = st.sd || today();
    for (const [id, k] of [['time', 'time'], ['answers', 'ans'], ['triv', 'triv']]) $(id).checked = !!st[k];
    $('title').value = st.ttl;
    $('title').placeholder = defaultTitle(type);
  }

  // 日付の一覧（タップした日は「とばす日」になる）
  function renderDateChips() {
    const box = $('dateChips'); box.innerHTML = '';
    if (st.dm !== 'auto') return;
    const WDAY = ['日', '月', '火', '水', '木', '金', '土'];
    const dates = L.dateList({ dateMode: 'auto', startDate: st.sd || today(), days: st.d, weekdays: String(st.wd).split(',').map(Number), skipDates: String(st.skip).split(',').filter(Boolean) });
    for (const d of dates) {
      if (!d) continue;
      const key = L.ymd(d);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${d.getMonth() + 1}/${d.getDate()}（${WDAY[d.getDay()]}）`;
      b.setAttribute('aria-label', `${d.getMonth() + 1}月${d.getDate()}日をとばす`);
      b.addEventListener('click', () => {
        st.skip = String(st.skip).split(',').filter(Boolean).concat(key).join(',');
        update(true);
      });
      box.appendChild(b);
    }
    $('btnUnskip').hidden = !st.skip;
  }

  function selectType(id) {
    const type = G.TYPE_MAP[id];
    st.t = id; st.opts = G.defaultOptions(type); st.fmt = type.defFmt; st.ttl = ''; st.work = !!type.work;
    update(true);
  }

  function hasFrac(type) {
    if (type.kind === 'frac') return true;
    return type.id === 'custom' && G.parseCustomList(st.cu).problems.some((p) => p.kind === 'frac');
  }
  function defaultTitle(type) { return type.id === 'custom' ? 'けいさんれんしゅう' : G.titleOf(type, st.opts); }
  function renderCustomStatus() {
    const { problems, errors } = G.parseCustomList(st.cu);
    $('customOk').textContent = problems.length ? `${problems.length}問を読みこみました` + (errors.length ? '（読めなかった行は下のとおりです）' : '') : '';
    const ul = $('customErrs'); ul.innerHTML = '';
    for (const e of errors) {
      const li = document.createElement('li');
      li.textContent = `${e.line}行め「${e.text}」：${e.error}`;
      ul.appendChild(li);
    }
  }

  // 筆算にできるか（小数÷小数は「わり切れる」だけ、自分で入れた問題は数2つの式だけ）
  function hissanAllowed(type) {
    if (!type.hissan) return false;
    if (type.hissanIf && !type.hissanIf(st.opts)) return false;
    if (type.id === 'custom') {
      const list = G.parseCustomList(st.cu).problems;
      return list.length > 0 && list.every((p) => p.ops.length === 1 && p.kind !== 'frac');
    }
    return true;
  }

  // ---------- プリントを作る ----------
  function buildCfg() {
    const type = G.TYPE_MAP[st.t];
    const amari = type.options.find((o) => o.key === 'amari');
    return {
      type: st.t, opts: st.opts, mode: st.mode, triv: st.triv, seed: st.s, days: st.d, count: st.n,
      fmt: hissanAllowed(type) ? st.fmt : 'yoko', size: st.sz, face: st.fs !== 'none', feelStyle: st.fs, feelWords: String(st.fw).split(','), time: st.time,
      answers: st.ans, layout: st.ly, dateMode: st.dm, startDate: st.sd || today(),
      weekdays: String(st.wd).split(',').map(Number), skipDates: String(st.skip).split(',').filter(Boolean),
      work: st.work && hasFrac(type),
      title: st.ttl || defaultTitle(type),
      custom: type.id === 'custom' ? G.parseCustomList(st.cu).problems : null,
      remBox: type.id === 'custom' ? (G.parseCustomList(st.cu).problems.some((p) => p.rem !== undefined) ? 'per' : false)
        : type.hasRem ? type.hasRem(st.opts) : !!amari && st.opts.amari !== 'none',
    };
  }

  function generate() {
    let cfg = buildCfg();
    if (cfg.custom && !cfg.custom.length) {
      $('pages').innerHTML = '<p class="empty">左の「式」の欄に問題を入れると、ここにプリントが出ます。</p>';
      $('info').textContent = ''; $('warn').hidden = true; last = null;
      return;
    }
    if (cfg.custom) cfg.count = Math.min(cfg.count, cfg.custom.length);
    let gen = G.generateDays(cfg);
    let out = L.render(cfg, gen.days);
    const warns = [];
    if (cfg.count > out.plan.maxCount) {
      warns.push(`この大きさでは、1日に入るのは${out.plan.maxCount}問までです。${out.plan.maxCount}問にしました（文字を「小」にすると増やせます）。`);
      st.n = out.plan.maxCount; $('count').value = st.n;
      cfg = buildCfg(); if (cfg.custom) cfg.count = Math.min(cfg.count, cfg.custom.length); gen = G.generateDays(cfg); out = L.render(cfg, gen.days);
    }
    // 表示する前に、すべての答えを検算する
    for (const p of gen.days.flat()) {
      const e = G.evaluate(p);
      if (e.ans !== String(p.ans) || e.rem !== String(p.rem ?? '')) { warns.push('答えの確認でエラーが見つかりました。「問題をつくりなおす」を押してください。'); break; }
    }
    if (gen.dup) warns.push('この条件では問題の種類が少ないため、同じ日の中に同じ問題が入っています。問題数をへらすか、条件を広げてください。');
    $('pages').innerHTML = out.html;
    const pl = out.plan, qPages = pl.pages;
    $('info').textContent = `1枚に${pl.perPage}日分 → 問題${qPages}枚` + (cfg.answers ? `＋答え${qPages}枚（合計${out.pageCount}枚）` : '');
    $('warn').hidden = !warns.length; $('warn').textContent = warns.join(' ');
    last = { cfg, html: out.html };
    fitZoom();
  }

  function update(rebuild) {
    persist();
    renderControls();
    if (rebuild !== false) generate();
  }

  function fitZoom() {
    const w = $('pages').clientWidth;
    const pagePx = 210 * 96 / 25.4;
    $('pages').style.setProperty('--zoom', String(Math.min(1, (w - 4) / pagePx)));
  }

  // ---------- PDF・印刷・共有 ----------
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src));
      document.head.appendChild(s);
    });
  }
  async function downloadPdf() {
    if (!last) return;
    const btn = $('btnPdf'); const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'PDFを作っています…';
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const cap = $('capture'); cap.innerHTML = last.html;
      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pages = cap.querySelectorAll('.page');
      for (let i = 0; i < pages.length; i++) {
        btn.textContent = `PDFを作っています…（${i + 1}/${pages.length}）`;
        const canvas = await window.html2canvas(pages[i], { scale: 2.5, backgroundColor: '#ffffff', logging: false });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      }
      cap.innerHTML = '';
      const name = `算数プリント_${last.cfg.title}`.replace(/[\\/:*?"<>|]/g, '');
      pdf.save(name + '.pdf');
    } catch (e) {
      $('warn').hidden = false;
      $('warn').textContent = 'PDFを作れませんでした。インターネットにつながっているか確かめてください。「印刷する」から「PDFとして保存」を選ぶこともできます。';
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  async function copyLink() {
    const url = location.origin + location.pathname + '?' + toQuery();
    try { await navigator.clipboard.writeText(url); flash('リンクをコピーしました。SNSや校内で共有すると、同じプリントが作れます。'); }
    catch (e) { window.prompt('このリンクをコピーしてください', url); }
  }
  function flash(msg) {
    const info = $('info'); const keep = info.textContent;
    info.textContent = msg; setTimeout(() => { info.textContent = keep; }, 3000);
  }

  // ---------- イベント ----------
  function bind() {
    document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const [k, d] = b.dataset.step.split(':');
      const key = k === 'count' ? 'n' : 'd';
      st[key] = clamp(st[key] + Number(d), 1, key === 'n' ? 50 : 20);
      update(true);
    }));
    $('count').addEventListener('change', (e) => { st.n = clamp(e.target.value, 1, 50); update(true); });
    $('days').addEventListener('change', (e) => { st.d = clamp(e.target.value, 1, 20); update(true); });
    $('startDate').addEventListener('change', (e) => { st.sd = e.target.value; update(true); });
    for (const [id, k] of [['time', 'time'], ['answers', 'ans'], ['triv', 'triv'], ['work', 'work']])
      $(id).addEventListener('change', (e) => { st[k] = e.target.checked; update(true); });
    let tt;
    $('title').addEventListener('input', (e) => { clearTimeout(tt); tt = setTimeout(() => { st.ttl = e.target.value.trim(); persist(); generate(); }, 300); });
    let ct;
    $('customText').addEventListener('input', (e) => {
      clearTimeout(ct);
      ct = setTimeout(() => { st.cu = e.target.value; update(true); }, 400);
    });
    $('btnUnskip').addEventListener('click', () => { st.skip = ''; update(true); });
    $('btnRegen').addEventListener('click', () => { st.s = newSeed(); update(true); });
    $('btnPrint').addEventListener('click', () => window.print());
    $('btnPdf').addEventListener('click', downloadPdf);
    $('btnShare').addEventListener('click', copyLink);
    window.addEventListener('resize', fitZoom);
  }

  bind();
  update(true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitZoom);
})();
