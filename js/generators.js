/* 算数プリント自動生成メーカー — 問題生成ロジック
 * ブラウザ（window.SansuGen）とNode（module.exports）の両方で使えます。
 */
(function (root) {
  'use strict';

  // ---------- 乱数（シード付き：同じ設定リンクなら同じ問題になる） ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (r, min, max) => min + Math.floor(r() * (max - min + 1));
  const ndig = (n) => String(Math.abs(n)).length;
  function shuffle(arr, r) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- くり上がり・くり下がりの回数 ----------
  function carries(a, b) {
    let c = 0, k = 0;
    while (a > 0 || b > 0) {
      const s = (a % 10) + (b % 10) + c;
      c = s >= 10 ? 1 : 0;
      k += c;
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return k;
  }
  function borrows(a, b) {
    let br = 0, k = 0;
    while (a > 0 || b > 0) {
      const d = (a % 10) - (b % 10) - br;
      br = d < 0 ? 1 : 0;
      k += br;
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return k;
  }
  // a × 1けた の「途中の位」でのくり上がり回数（最上位からのくり上がりは数えない）
  function mulCarries(a, d) {
    let c = 0, k = 0;
    while (a > 0) {
      const p = (a % 10) * d + c;
      c = Math.floor(p / 10);
      a = Math.floor(a / 10);
      if (c > 0 && a > 0) k++;
    }
    return k;
  }

  // 「くり上がり」系の条件判定。mix は問題番号で なし／あり を半々にする
  function wantLevel(level, idx) {
    if (level === 'mix') return idx % 2 === 0 ? 'none' : 'some';
    return level;
  }
  function matchLevel(k, want) {
    switch (want) {
      case 'none': return k === 0;
      case 'some': return k >= 1;
      case '1': return k === 1;
      case '2': return k === 2;
      case '3': return k >= 3;
      default: return true;
    }
  }

  // ---------- 選択肢の共通部品 ----------
  const KURI_ADD = { key: 'kuri', label: 'くり上がり', inTitle: true, choices: [['none', 'なし'], ['some', 'あり'], ['mix', 'まぜる']], def: 'mix' };
  const KURI_SUB = { key: 'kuri', label: 'くり下がり', inTitle: true, choices: [['none', 'なし'], ['some', 'あり'], ['mix', 'まぜる']], def: 'mix' };
  const AMARI = { key: 'amari', label: 'あまり', inTitle: true, choices: [['none', 'なし'], ['some', 'あり'], ['mix', 'まぜる']], def: 'none' };
  const DIG23 = { key: 'dig', label: 'わられる数', inTitle: false, choices: [['2', '2けた'], ['3', '3けた']], def: '2' };

  // 問題オブジェクト：{ terms:[...], ops:[...], ans, rem? }
  const P = (terms, ops, ans, rem) => (rem === undefined ? { terms, ops, ans } : { terms, ops, ans, rem });

  // ---------- 計算の型の一覧 ----------
  const TYPES = [
    // ===== 1年 =====
    {
      id: 'g1_add10', grade: 1, label: '10までのたし算', hissan: false, defFmt: 'yoko', options: [],
      gen(o, r) {
        const a = ri(r, 0, 10), b = ri(r, 0, 10 - a);
        if (o.triv && (a === 0 || b === 0)) return null;
        return P([a, b], ['+'], a + b);
      },
    },
    {
      id: 'g1_sub10', grade: 1, label: '10までのひき算', hissan: false, defFmt: 'yoko', options: [],
      gen(o, r) {
        const a = ri(r, 1, 10), b = ri(r, 0, a);
        if (o.triv && b === 0) return null;
        return P([a, b], ['-'], a - b);
      },
    },
    {
      id: 'g1_add_carry', grade: 1, label: 'たし算（1けた＋1けた）', hissan: false, defFmt: 'yoko', options: [KURI_ADD],
      gen(o, r, i) {
        const a = ri(r, 1, 9), b = ri(r, 1, 9);
        if (!matchLevel(carries(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['+'], a + b);
      },
    },
    {
      id: 'g1_sub_borrow', grade: 1, label: 'ひき算（十いくつ−1けた）', hissan: false, defFmt: 'yoko', options: [KURI_SUB],
      gen(o, r, i) {
        const a = ri(r, 10, 19), b = ri(r, 1, 9);
        if (!matchLevel(borrows(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['-'], a - b);
      },
    },
    {
      id: 'g1_three', grade: 1, label: '3つの数の計算', hissan: false, defFmt: 'yoko',
      options: [{ key: 'ops', label: '計算', inTitle: true, choices: [['plus', 'たし算だけ'], ['minus', 'ひき算だけ'], ['mix', 'まぜる']], def: 'mix' }],
      gen(o, r) {
        const pick = () => (r() < 0.5 ? '+' : '-');
        const ops = o.ops === 'plus' ? ['+', '+'] : o.ops === 'minus' ? ['-', '-'] : [pick(), pick()];
        if (o.ops === 'mix' && ops[0] === ops[1]) return null;
        const a = ri(r, 1, 18), b = ri(r, 1, 9), c = ri(r, 1, 9);
        const s1 = ops[0] === '+' ? a + b : a - b;
        if (s1 < 0 || s1 > 20) return null;
        const s2 = ops[1] === '+' ? s1 + c : s1 - c;
        if (s2 < 0 || s2 > 20) return null;
        return P([a, b, c], ops, s2);
      },
    },
    // ===== 2年 =====
    {
      id: 'g2_add', grade: 2, label: '2けた＋2けた', hissan: true, defFmt: 'hissan',
      options: [{ key: 'kuri', label: 'くり上がり', inTitle: true, choices: [['none', 'なし'], ['1', '1回'], ['2', '2回（百の位へ）'], ['mix', 'まぜる']], def: 'mix' }],
      gen(o, r, i) {
        const a = ri(r, 10, 99), b = ri(r, 10, 99);
        const want = o.kuri === 'mix' ? (i % 2 === 0 ? 'none' : '1') : o.kuri;
        const k = carries(a, b);
        if (!matchLevel(k, want)) return null;
        if (want !== '2' && a + b > 99) return null;
        return P([a, b], ['+'], a + b);
      },
    },
    {
      id: 'g2_sub', grade: 2, label: '2けた−2けた', hissan: true, defFmt: 'hissan', options: [KURI_SUB],
      gen(o, r, i) {
        const a = ri(r, 11, 99), b = ri(r, 10, a - 1);
        if (!matchLevel(borrows(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['-'], a - b);
      },
    },
    {
      id: 'g2_add32', grade: 2, label: '3けた＋2けた（かんたん）', hissan: true, defFmt: 'hissan', options: [KURI_ADD],
      gen(o, r, i) {
        const a = ri(r, 100, 899), b = ri(r, 10, 99);
        if (a + b > 999) return null;
        if (!matchLevel(carries(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['+'], a + b);
      },
    },
    {
      id: 'g2_sub32', grade: 2, label: '百いくつ−2けた', hissan: true, defFmt: 'hissan',
      options: [{ key: 'kuri', label: 'くり下がり', inTitle: true, choices: [['none', 'なし'], ['1', '1回'], ['2', '2回'], ['mix', 'まぜる']], def: '2' }],
      gen(o, r, i) {
        const a = ri(r, 100, 199), b = ri(r, 10, 99);
        if (a - b < 1) return null;
        if (!matchLevel(borrows(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['-'], a - b);
      },
    },
    {
      id: 'g2_kuku', grade: 2, label: '九九', hissan: false, defFmt: 'yoko',
      options: [{ key: 'dan', label: 'だん', inTitle: true, multi: true, choices: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9']], def: '2,3,4,5,6,7,8,9' }],
      gen(o, r) {
        const dans = String(o.dan || '').split(',').filter(Boolean).map(Number);
        if (!dans.length) return null;
        const a = dans[ri(r, 0, dans.length - 1)], b = ri(r, 1, 9);
        return P([a, b], ['×'], a * b);
      },
    },
    // ===== 3年 =====
    {
      id: 'g3_add', grade: 3, label: '3けた・4けたのたし算', hissan: true, defFmt: 'hissan',
      options: [
        { key: 'dig', label: 'けた', inTitle: false, choices: [['3', '3けた'], ['4', '4けた']], def: '3' },
        { key: 'kuri', label: 'くり上がり', inTitle: true, choices: [['none', 'なし'], ['1', '1回'], ['2', '2回'], ['3', '3回以上'], ['mix', 'まぜる']], def: 'mix' },
      ],
      gen(o, r, i) {
        const d = Number(o.dig), lo = 10 ** (d - 1), hi = 10 ** d - 1;
        const a = ri(r, lo, hi), b = ri(r, lo, hi);
        if (!matchLevel(carries(a, b), wantLevel(o.kuri, i))) return null;
        return P([a, b], ['+'], a + b);
      },
    },
    {
      id: 'g3_sub', grade: 3, label: '3けた・4けたのひき算', hissan: true, defFmt: 'hissan',
      options: [
        { key: 'dig', label: 'けた', inTitle: false, choices: [['3', '3けた'], ['4', '4けた']], def: '3' },
        { key: 'kuri', label: 'くり下がり', inTitle: true, choices: [['none', 'なし'], ['1', '1回'], ['2', '2回'], ['zero', '0をふくむ'], ['mix', 'まぜる']], def: 'mix' },
      ],
      gen(o, r, i) {
        const d = Number(o.dig), lo = 10 ** (d - 1), hi = 10 ** d - 1;
        let a = ri(r, lo + 1, hi);
        if (o.kuri === 'zero') {
          // 十の位を0にして、一の位から2回以上くり下がる問題（例：302−147）
          a = a - (Math.floor(a / 10) % 10) * 10;
          if (a < lo + 1) return null;
        }
        const b = ri(r, Math.floor(lo / 10) * 10 || 1, a - 1);
        if (ndig(b) < d - 1) return null;
        const k = borrows(a, b);
        if (o.kuri === 'zero') { if (k < 2 || a % 10 >= b % 10) return null; }
        else if (!matchLevel(k, wantLevel(o.kuri, i))) return null;
        return P([a, b], ['-'], a - b);
      },
    },
    {
      id: 'g3_mul1', grade: 3, label: '2けた・3けた×1けた', hissan: true, defFmt: 'hissan',
      options: [
        { key: 'dig', label: 'かけられる数', inTitle: false, choices: [['2', '2けた'], ['3', '3けた']], def: '2' },
        KURI_ADD,
      ],
      gen(o, r, i) {
        const d = Number(o.dig), a = ri(r, 10 ** (d - 1), 10 ** d - 1), b = ri(r, 1, 9);
        if (o.triv && (b === 1 || a % 10 === 0)) return null;
        const want = wantLevel(o.kuri, i), k = mulCarries(a, b);
        if (want === 'none' && (k > 0 || ndig(a * b) > d)) return null;
        if (want === 'some' && k === 0) return null;
        return P([a, b], ['×'], a * b);
      },
    },
    {
      id: 'g3_mul22', grade: 3, label: '2けた×2けた', hissan: true, defFmt: 'hissan', options: [],
      gen(o, r) {
        const a = ri(r, 11, 99), b = ri(r, 11, 99);
        if (b % 10 === 0 || a % 10 === 0) return null;
        return P([a, b], ['×'], a * b);
      },
    },
    {
      id: 'g3_div', grade: 3, label: 'わり算（九九1回）', hissan: false, defFmt: 'yoko', options: [AMARI],
      gen(o, r, i) {
        const b = ri(r, o.triv ? 2 : 1, 9), q = ri(r, 1, 9);
        const want = wantLevel(o.amari, i);
        const rem = want === 'some' ? (b === 1 ? null : ri(r, 1, b - 1)) : 0;
        if (rem === null) return null;
        const a = b * q + rem;
        return rem ? P([a, b], ['÷'], q, rem) : P([a, b], ['÷'], q);
      },
    },
    // ===== 4年 =====
    {
      id: 'g4_div1', grade: 4, label: '2けた・3けた÷1けた', hissan: false, defFmt: 'yoko', options: [DIG23, AMARI],
      gen(o, r, i) {
        const d = Number(o.dig), b = ri(r, 2, 9);
        const want = wantLevel(o.amari, i);
        const qmin = 10, qmax = Math.floor((10 ** d - 1) / b);
        if (qmax < qmin) return null;
        const q = ri(r, qmin, qmax);
        const rem = want === 'some' ? ri(r, 1, b - 1) : 0;
        const a = b * q + rem;
        if (ndig(a) !== d) return null;
        return rem ? P([a, b], ['÷'], q, rem) : P([a, b], ['÷'], q);
      },
    },
    {
      id: 'g4_div2', grade: 4, label: '2けた・3けた÷2けた', hissan: false, defFmt: 'yoko', options: [DIG23, AMARI],
      gen(o, r, i) {
        const d = Number(o.dig), b = ri(r, 11, 99);
        if (o.triv && b % 10 === 0) return null;
        const want = wantLevel(o.amari, i);
        const qmax = Math.floor((10 ** d - 1) / b);
        if (qmax < 1) return null;
        const q = ri(r, d === 2 ? 1 : 2, Math.min(qmax, d === 2 ? 9 : 99));
        const rem = want === 'some' ? ri(r, 1, b - 1) : 0;
        const a = b * q + rem;
        if (ndig(a) !== d) return null;
        return rem ? P([a, b], ['÷'], q, rem) : P([a, b], ['÷'], q);
      },
    },
  ];

  const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.id, t]));

  function defaultOptions(type) {
    const o = {};
    for (const op of type.options) o[op.key] = op.def;
    return o;
  }

  function keyOf(p) {
    let s = String(p.terms[0]);
    for (let i = 0; i < p.ops.length; i++) s += p.ops[i] + p.terms[i + 1];
    return s;
  }

  // 1問を作る（条件に合うまでやり直す）
  function genOne(type, o, r, idx, avoid) {
    for (let t = 0; t < 400; t++) {
      const p = type.gen(o, r, idx);
      if (p && !avoid.has(keyOf(p))) return { p, dup: false };
    }
    for (let t = 0; t < 400; t++) {
      const p = type.gen(o, r, idx);
      if (p) return { p, dup: true };
    }
    return { p: null, dup: true };
  }

  function genSet(type, o, r, count, keep) {
    const list = keep ? keep.slice() : [];
    const avoid = new Set(list.map(keyOf));
    let dup = false;
    let idx = list.length;
    while (list.length < count) {
      const { p, dup: d } = genOne(type, o, r, idx, avoid);
      if (!p) break;
      dup = dup || d;
      list.push(p);
      avoid.add(keyOf(p));
      idx++;
    }
    return { list: shuffle(list, r), dup };
  }

  /**
   * 複数日分の問題を作る
   * mode: 'diff'（毎日ちがう）/'rep'（くり返し）/'part'（少しずつ入れかえ）
   */
  function generateDays(cfg) {
    const type = TYPE_MAP[cfg.type];
    if (!type) throw new Error('unknown type ' + cfg.type);
    const r = mulberry32(cfg.seed || 1);
    const o = Object.assign(defaultOptions(type), cfg.opts || {}, { triv: cfg.triv !== false });
    const days = [];
    let dup = false;
    for (let d = 0; d < cfg.days; d++) {
      let res;
      if (d === 0 || cfg.mode === 'diff') {
        res = genSet(type, o, r, cfg.count);
      } else if (cfg.mode === 'rep') {
        res = { list: cfg.shuffleRep === false ? days[0].slice() : shuffle(days[0], r), dup: false };
      } else {
        const keepN = Math.floor(cfg.count / 2);
        const keep = shuffle(days[d - 1], r).slice(0, keepN);
        res = genSet(type, o, r, cfg.count, keep);
      }
      dup = dup || res.dup;
      days.push(res.list);
    }
    return { days, dup };
  }

  // 答えの検算（テストと表示前チェックに使う）
  function evaluate(p) {
    let v = p.terms[0];
    for (let i = 0; i < p.ops.length; i++) {
      const b = p.terms[i + 1];
      switch (p.ops[i]) {
        case '+': v += b; break;
        case '-': v -= b; break;
        case '×': v *= b; break;
        case '÷': return { ans: Math.floor(v / b), rem: v % b };
      }
    }
    return { ans: v, rem: 0 };
  }

  function titleOf(type, o) {
    const parts = [];
    for (const op of type.options) {
      if (!op.inTitle) continue;
      const v = o[op.key];
      if (op.multi) {
        const vs = String(v || '').split(',').filter(Boolean);
        if (vs.length && vs.length < op.choices.length) parts.push(vs.join('・') + 'のだん');
        continue;
      }
      if (v === 'mix') continue;
      const c = op.choices.find((x) => x[0] === v);
      if (c) parts.push(op.label + c[1]);
    }
    let label = type.label;
    const dig = type.options.find((x) => x.key === 'dig');
    if (dig) {
      const c = dig.choices.find((x) => x[0] === o.dig);
      if (c) label = label.replace(/2けた・3けた|3けた・4けた/, c[1]);
    }
    return parts.length ? `${label}（${parts.join('、')}）` : label;
  }

  const api = { TYPES, TYPE_MAP, defaultOptions, generateDays, evaluate, keyOf, titleOf, carries, borrows, mulCarries, mulberry32, ndig };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SansuGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
