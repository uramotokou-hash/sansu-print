// 実行：node tests/generators.test.js
// すべての計算の型・すべての選択肢の組み合わせで、答えが正しいか・条件どおりかを確かめます。
const G = require('../js/generators.js');
let fail = 0, checked = 0;
const err = (m) => { fail++; if (fail < 40) console.error('NG', m); };
const isInt = (p) => !p.kind;
const fracPart = (s) => { const m = String(s).match(/(\d+)\/(\d+)$/); return m ? [+m[1], +m[2]] : null; };
const places = (s) => (String(s).split('.')[1] || '').length;
const val = (s) => { const x = G.parseNum(s); return x.n / x.d; };

function combos(type) {
  let list = [{}];
  for (const op of type.options) {
    const vals = op.multi ? [op.def, '7', '2,5'] : op.choices.map((c) => c[0]);
    const next = [];
    for (const base of list) for (const v of vals) next.push(Object.assign({}, base, { [op.key]: v }));
    list = next;
  }
  return list;
}

function checkProblem(type, opts, triv, p) {
  checked++;
  const e = G.evaluate(p);
  if (e.ans !== String(p.ans) || e.rem !== String(p.rem ?? '')) err(`${type.id} wrong answer ${G.keyOf(p)} ans=${p.ans} rem=${p.rem} expected ${e.ans} r${e.rem}`);
  if (val(p.ans) < 0) err(`${type.id} negative ${G.keyOf(p)}`);
  const [a, b] = p.terms;
  if (isInt(p) && type.id !== 'g6_shisoku') {
    if (opts.kuri === 'none' && p.ops[0] === '+' && G.carries(a, b) !== 0) err(`${type.id} carry none ${G.keyOf(p)}`);
    if (opts.kuri === 'none' && p.ops[0] === '-' && G.borrows(a, b) !== 0) err(`${type.id} borrow none ${G.keyOf(p)}`);
    if (opts.kuri === 'some' && p.ops[0] === '+' && G.carries(a, b) === 0) err(`${type.id} carry some ${G.keyOf(p)}`);
    if (opts.kuri === 'some' && p.ops[0] === '-' && G.borrows(a, b) === 0) err(`${type.id} borrow some ${G.keyOf(p)}`);
    if (opts.kuri === 'zero' && (Math.floor(a / 10) % 10 !== 0 || G.borrows(a, b) < 2)) err(`${type.id} zero ${G.keyOf(p)}`);
    if (opts.amari === 'none' && p.rem) err(`${type.id} amari none ${G.keyOf(p)}`);
    if (opts.amari === 'some' && !p.rem) err(`${type.id} amari some ${G.keyOf(p)}`);
    if (p.rem && p.rem >= b) err(`${type.id} rem>=divisor ${G.keyOf(p)}`);
    if (opts.dig && G.ndig(a) !== Number(opts.dig)) err(`${type.id} digits ${G.keyOf(p)}`);
    if (type.id.startsWith('g1_') && p.ans > 20) err(`${type.id} g1 >20 ${G.keyOf(p)}`);
    if (triv && p.ops[0] === '+' && p.terms.includes(0)) err(`${type.id} triv +0 ${G.keyOf(p)}`);
    if (triv && p.ops[0] === '×' && b === 1 && type.id !== 'g2_kuku') err(`${type.id} triv ×1 ${G.keyOf(p)}`);
  }
  if (p.kind === 'dec') {
    const sc = (s) => Math.round(val(s) * 10);
    if (type.id.startsWith('g3_dec')) {
      if (p.terms.some((t) => places(t) > 1)) err(`${type.id} places ${G.keyOf(p)}`);
      const k = p.ops[0] === '+' ? G.carries(sc(a), sc(b)) : G.borrows(sc(a), sc(b));
      if (opts.kuri === 'none' && k) err(`${type.id} kuri none ${G.keyOf(p)}`);
      if (opts.kuri === 'some' && !k) err(`${type.id} kuri some ${G.keyOf(p)}`);
    }
    if (type.id.match(/^g4_dec_(add|sub)/) && opts.pl === 'same' && (places(a) !== 2 || places(b) !== 2)) err(`${type.id} same places ${G.keyOf(p)}`);
    if (type.id === 'g4_dec_divint' && !String(a).includes('.')) err(`${type.id} dividend not decimal ${G.keyOf(p)}`);
    if (type.id === 'g5_dec_div') {
      if (places(b) !== 1) err(`${type.id} divisor ${G.keyOf(p)}`);
      if (opts.dm === 'round') {
        if (!p.round || places(p.ans) !== 1) err(`${type.id} round format ${G.keyOf(p)} ${p.ans}`);
        const exact = val(a) / val(b);
        if (Math.abs(exact - val(p.ans)) > 0.05 + 1e-9) err(`${type.id} round value ${G.keyOf(p)} ${p.ans}`);
      }
      if (opts.dm === 'amari') {
        if (p.rem === undefined || !(val(p.rem) > 0 && val(p.rem) < val(b))) err(`${type.id} rem ${G.keyOf(p)} r${p.rem}`);
        if (String(p.ans).includes('.') || !String(p.rem).includes('.')) err(`${type.id} quotient/rem form ${G.keyOf(p)}`);
      }
      if (opts.dm === 'exact' && (p.rem !== undefined || p.round)) err(`${type.id} exact ${G.keyOf(p)}`);
    }
  }
  if (p.kind === 'frac') {
    // 問題の分数は約分ずみ・答えは約分ずみ
    for (const t of p.terms) { const f = fracPart(t); if (f && G.gcd(f[0], f[1]) > 1) err(`${type.id} term reducible ${G.keyOf(p)}`); if (f && f[0] >= f[1] && /\s/.test(t)) err(`${type.id} bad mixed ${t}`); }
    const fa = fracPart(p.ans); if (fa && G.gcd(fa[0], fa[1]) > 1) err(`${type.id} answer not reduced ${p.ans}`);
    if (type.id.startsWith('g3_frac')) {
      if (val(p.ans) > 1) err(`${type.id} >1 ${G.keyOf(p)}`);
      // 3年：答えは約分しなくてよい（分母が問題と同じ）
      const d = fracPart(p.terms[1])[1];
      if (fa && fa[1] !== d) err(`${type.id} needs reduction ${G.keyOf(p)} = ${p.ans}`);
    }
    if (type.id.startsWith('g4_frac')) {
      const d = fracPart(p.terms[1])[1];
      if (fa && fa[1] !== d) err(`${type.id} needs reduction ${G.keyOf(p)} = ${p.ans}`);
      if (!p.terms.some((t) => val(t) > 1)) err(`${type.id} no term >1 ${G.keyOf(p)}`);
    }
    if (type.id.startsWith('g5_frac')) {
      const d1 = fracPart(a)[1], d2 = fracPart(b)[1];
      if (d1 === d2) err(`${type.id} same denominators ${G.keyOf(p)}`);
      const l = d1 / G.gcd(d1, d2) * d2;
      const reducible = !fa || fa[1] !== l;
      if (opts.yaku === 'none' && reducible) err(`${type.id} yaku none ${G.keyOf(p)} = ${p.ans}`);
      if (opts.yaku === 'some' && !reducible) err(`${type.id} yaku some ${G.keyOf(p)} = ${p.ans}`);
      if (opts.mixed === 'no' && p.terms.some((t) => /\s/.test(t))) err(`${type.id} mixed no ${G.keyOf(p)}`);
    }
  }
  if (type.id === 'g6_shisoku') {
    const md = (x) => x === '×' || x === '÷';
    if (md(p.ops[0]) === md(p.ops[1])) err(`${type.id} ops ${G.keyOf(p)}`);
    if (opts.paren === 'none' && p.paren) err(`${type.id} paren none ${G.keyOf(p)}`);
    if (opts.paren === 'some' && !p.paren) err(`${type.id} paren some ${G.keyOf(p)}`);
    if (!Number.isInteger(p.ans) || p.ans < 1) err(`${type.id} not positive int ${G.keyOf(p)}`);
  }
}

for (const type of G.TYPES) {
  for (const opts of combos(type)) {
    for (const mode of ['diff', 'rep', 'part']) {
      for (const triv of [true, false]) {
        const seed = 1 + Math.floor(Math.random() * 1e9);
        const { days } = G.generateDays({ type: type.id, opts, mode, triv, seed, days: 5, count: 10 });
        if (days.length !== 5) err(`${type.id} days=${days.length}`);
        days.forEach((list, d) => {
          if (list.length !== 10) err(`${type.id} ${JSON.stringify(opts)} day${d} count=${list.length}`);
          for (const p of list) checkProblem(type, opts, triv, p);
          const keys = new Set(list.map(G.keyOf));
          if (keys.size !== list.length && !['g1_add10', 'g1_sub10'].includes(type.id) && !(type.id === 'g2_kuku' && opts.dan === '7'))
            err(`${type.id} ${JSON.stringify(opts)} duplicate in day`);
        });
        if (mode === 'rep') {
          const k0 = days[0].map(G.keyOf).sort().join();
          days.forEach((l) => { if (l.map(G.keyOf).sort().join() !== k0) err(`${type.id} rep differs`); });
        }
        if (mode === 'part') {
          for (let d = 1; d < 5; d++) {
            const prev = new Set(days[d - 1].map(G.keyOf));
            const same = days[d].filter((p) => prev.has(G.keyOf(p))).length;
            if (same < 5) err(`${type.id} part keep=${same}`);
          }
        }
      }
    }
  }
  // 「まぜる」が半々か（整数のくり上がり系）
  const kuri = type.options.find((o) => o.key === 'kuri');
  if (kuri && !type.kind && type.id !== 'g3_sub') {
    const { days } = G.generateDays({ type: type.id, opts: { kuri: 'mix' }, mode: 'diff', seed: 7, days: 1, count: 20 });
    const some = days[0].filter((p) => (p.ops[0] === '+' ? G.carries(...p.terms) : p.ops[0] === '-' ? G.borrows(...p.terms) : G.mulCarries(...p.terms)) > 0).length;
    if (some < 8 || some > 12) err(`${type.id} mix ratio ${some}/20`);
  }
}
// 同じシードなら同じ問題
const x = JSON.stringify(G.generateDays({ type: 'g5_frac_add', mode: 'diff', seed: 42, days: 3, count: 8 }));
const y = JSON.stringify(G.generateDays({ type: 'g5_frac_add', mode: 'diff', seed: 42, days: 3, count: 8 }));
if (x !== y) err('seed not reproducible');

console.log(`${G.TYPES.length} types, checked ${checked} problems, ${fail} failures`);
process.exit(fail ? 1 : 0);
