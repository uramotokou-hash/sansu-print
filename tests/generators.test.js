// 実行：node tests/generators.test.js
// すべての計算の型・すべての選択肢の組み合わせで、答えが正しいか・条件どおりかを確かめます。
const G = require('../js/generators.js');
let fail = 0, checked = 0;
const err = (m) => { fail++; if (fail < 30) console.error('NG', m); };

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

for (const type of G.TYPES) {
  for (const opts of combos(type)) {
    for (const mode of ['diff', 'rep', 'part']) {
      for (const triv of [true, false]) {
        const seed = 1 + Math.floor(Math.random() * 1e9);
        const { days } = G.generateDays({ type: type.id, opts, mode, triv, seed, days: 5, count: 10 });
        if (days.length !== 5) err(`${type.id} days=${days.length}`);
        days.forEach((list, d) => {
          if (list.length !== 10) err(`${type.id} ${JSON.stringify(opts)} day${d} count=${list.length}`);
          for (const p of list) {
            checked++;
            const e = G.evaluate(p);
            if (e.ans !== p.ans || (e.rem || 0) !== (p.rem || 0)) err(`${type.id} wrong answer ${G.keyOf(p)} ans=${p.ans} rem=${p.rem}`);
            if (p.ans < 0) err(`${type.id} negative ${G.keyOf(p)}`);
            const [a, b] = p.terms;
            // 条件の確認
            if (opts.kuri === 'none' && p.ops[0] === '+' && G.carries(a, b) !== 0) err(`${type.id} carry none ${G.keyOf(p)}`);
            if (opts.kuri === 'none' && p.ops[0] === '-' && G.borrows(a, b) !== 0) err(`${type.id} borrow none ${G.keyOf(p)}`);
            if (opts.kuri === 'some' && p.ops[0] === '+' && G.carries(a, b) === 0) err(`${type.id} carry some ${G.keyOf(p)}`);
            if (opts.kuri === 'some' && p.ops[0] === '-' && G.borrows(a, b) === 0) err(`${type.id} borrow some ${G.keyOf(p)}`);
            if (opts.kuri === 'zero' && (Math.floor(a / 10) % 10 !== 0 || G.borrows(a, b) < 2)) err(`${type.id} zero ${G.keyOf(p)}`);
            if (opts.amari === 'none' && p.rem) err(`${type.id} amari none ${G.keyOf(p)}`);
            if (opts.amari === 'some' && !p.rem) err(`${type.id} amari some ${G.keyOf(p)}`);
            if (p.rem && p.rem >= b) err(`${type.id} rem>=divisor ${G.keyOf(p)}`);
            if (opts.dig && type.id !== 'g3_mul1' && G.ndig(a) !== Number(opts.dig)) err(`${type.id} digits ${G.keyOf(p)}`);
            if (type.id === 'g3_mul1' && G.ndig(a) !== Number(opts.dig)) err(`${type.id} digits ${G.keyOf(p)}`);
            if (type.id.startsWith('g1_') && p.ans > 20) err(`${type.id} g1 >20 ${G.keyOf(p)}`);
            if (triv && p.ops[0] === '+' && p.terms.includes(0)) err(`${type.id} triv +0 ${G.keyOf(p)}`);
            if (triv && p.ops[0] === '×' && b === 1 && type.id !== 'g2_kuku') err(`${type.id} triv ×1 ${G.keyOf(p)}`);
          }
          // 同じ日の中で重複がないか（問題数が足りる条件のとき）
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
  // 「まぜる」が半々か
  const kuri = type.options.find((o) => o.key === 'kuri');
  if (kuri && type.id !== 'g3_sub') {
    const { days } = G.generateDays({ type: type.id, opts: { kuri: 'mix' }, mode: 'diff', seed: 7, days: 1, count: 20 });
    const some = days[0].filter((p) => (p.ops[0] === '+' ? G.carries(...p.terms) : p.ops[0] === '-' ? G.borrows(...p.terms) : G.mulCarries(...p.terms)) > 0).length;
    if (some < 8 || some > 12) err(`${type.id} mix ratio ${some}/20`);
  }
}
// 同じシードなら同じ問題
const x = JSON.stringify(G.generateDays({ type: 'g2_add', mode: 'diff', seed: 42, days: 3, count: 8 }));
const y = JSON.stringify(G.generateDays({ type: 'g2_add', mode: 'diff', seed: 42, days: 3, count: 8 }));
if (x !== y) err('seed not reproducible');

console.log(`checked ${checked} problems, ${fail} failures`);
process.exit(fail ? 1 : 0);
