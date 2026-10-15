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

  // ---------- 小数・分数の部品（すべて整数で正確に計算する） ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  // 小数：n を 10^s でわった値の文字列（末尾の0はけずる）
  function decStr(n, s) {
    if (!s) return String(n);
    let str = String(Math.abs(n)).padStart(s + 1, '0');
    let ip = str.slice(0, -s), fp = str.slice(-s).replace(/0+$/, '');
    return (n < 0 ? '-' : '') + ip + (fp ? '.' + fp : '');
  }
  // 小数第1位まで（がい数用、末尾の0を残す）
  const fixed1 = (v) => `${Math.floor(v / 10)}.${v % 10}`;
  // 最後の位が0でない、小数s位の数（10^s倍の整数で返す）
  function rndDec(r, lo, hi, s) {
    for (let t = 0; t < 50; t++) { const n = ri(r, lo, hi); if (!s || n % 10 !== 0) return n; }
    return null;
  }
  // 分数の表し方：仮分数 "7/5"、整数 "1"、帯分数 "1 2/5"
  function fracStr(n, d) { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : `${n}/${d}`; }
  function mixedStr(n, d) {
    const w = Math.floor(n / d), r0 = n % d;
    if (!r0) return String(w);
    return w ? `${w} ${r0}/${d}` : `${r0}/${d}`;
  }
  // 数の文字列 → 分数 {n, d}
  function parseNum(s) {
    s = String(s).trim();
    let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) { const d = +m[3]; return red(+m[1] * d + +m[2], d); }
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return red(+m[1], +m[2]);
    m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (m) { const f = m[3] || ''; return red((m[1] ? -1 : 1) * +(m[2] + f), 10 ** f.length); }
    throw new Error('bad number ' + s);
  }
  function red(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  const rAdd = (a, b) => red(a.n * b.d + b.n * a.d, a.d * b.d);
  const rSub = (a, b) => red(a.n * b.d - b.n * a.d, a.d * b.d);
  const rMul = (a, b) => red(a.n * b.n, a.d * b.d);
  const rDiv = (a, b) => red(a.n * b.d, a.d * b.n);
  function rToDec(x) {
    for (let k = 0; k <= 8; k++) { const p = 10 ** k; if (p % x.d === 0) return decStr(x.n * (p / x.d), k); }
    return null; // わり切れない
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

  const PLACES = { key: 'pl', label: '位', inTitle: false, choices: [['same', 'どちらも1/100の位まで'], ['diff', '位の数がちがう（例 2.35＋1.4）']], def: 'diff' };
  const FORM4 = { key: 'form', label: '数の書き方', inTitle: false, choices: [['mixed', '帯分数'], ['improper', '仮分数'], ['mix', 'まぜる']], def: 'mix' };
  const YAKU5 = { key: 'yaku', label: '答えの約分', inTitle: true, choices: [['none', 'なし'], ['some', 'あり'], ['mix', 'まぜる']], def: 'mix' };
  const MIXED5 = { key: 'mixed', label: '帯分数', inTitle: false, choices: [['no', 'ふくまない'], ['yes', 'ふくむ']], def: 'no' };
  const CANCEL6 = { key: 'cancel', label: 'とちゅうの約分', inTitle: false, choices: [['many', 'できる問題を多めに'], ['any', 'とくに決めない']], def: 'many' };

  // 4年：小数2つ（100倍の整数で返す）
  function twoDecs(o, r) {
    const a = rndDec(r, 11, 1999, 2);
    let b;
    if (o.pl === 'same') b = rndDec(r, 11, 1999, 2);
    else b = r() < 0.75 ? (rndDec(r, 1, 199, 1) ?? 0) * 10 : ri(r, 1, 19) * 100;
    if (a === null || !b) return [null, null];
    return r() < 0.5 ? [a, b] : [b, a];
  }
  function showFrac(n, d, form, r) {
    const f = form === 'mix' ? (r() < 0.5 ? 'mixed' : 'improper') : form;
    return f === 'mixed' ? mixedStr(n, d) : `${n}/${d}`;
  }
  function properFrac(r) {
    for (let t = 0; t < 50; t++) { const d = ri(r, 2, 12), n = ri(r, 1, d - 1); if (gcd(n, d) === 1) return [n, d]; }
    return [1, 2];
  }
  function cancelOk(o, i, can) { return o.cancel === 'many' && i % 3 !== 2 ? can : true; }
  function frac5(o, r, i, op) {
    const [n1, d1] = properFrac(r), [n2, d2] = properFrac(r);
    if (d1 === d2) return null;
    const l = lcm(d1, d2);
    if (l > 40) return null;
    let w1 = 0, w2 = 0;
    if (o.mixed === 'yes') { w1 = ri(r, 0, 3); w2 = ri(r, 0, 2); if (!w1 && !w2) return null; }
    const A = (w1 * d1 + n1) * (l / d1), B = (w2 * d2 + n2) * (l / d2);
    const S = op === '+' ? A + B : A - B;
    if (S <= 0) return null;
    const reducible = gcd(S, l) > 1;
    const want = wantLevel(o.yaku, i);
    if ((want === 'none' && reducible) || (want === 'some' && !reducible)) return null;
    return P([mixedStr(w1 * d1 + n1, d1), mixedStr(w2 * d2 + n2, d2)], [op], fracStr(S, l));
  }
  // 整数の四則（計算のきまり）。わり切れないとき・負になるとき・大きすぎるときは null
  function ap(x, op, y) {
    if (x === null || y === null) return null;
    switch (op) {
      case '+': return x + y;
      case '-': return x - y < 0 ? null : x - y;
      case '×': return x * y;
      case '÷': return y && x % y === 0 ? x / y : null;
    }
  }
  function evalInt(t, ops, paren) {
    let v;
    if (paren === 'L' && !ap(t[0], ops[0], t[1])) return null; // （ ）の中が0にならないように
    if (paren === 'R' && !ap(t[1], ops[1], t[2])) return null;
    if (paren === 'L') v = ap(ap(t[0], ops[0], t[1]), ops[1], t[2]);
    else if (paren === 'R') v = ap(t[0], ops[0], ap(t[1], ops[1], t[2]));
    else if ((ops[1] === '×' || ops[1] === '÷') && (ops[0] === '+' || ops[0] === '-')) v = ap(t[0], ops[0], ap(t[1], ops[1], t[2]));
    else v = ap(ap(t[0], ops[0], t[1]), ops[1], t[2]);
    return v === null || v < 1 || v > 300 ? null : v;
  }
  const evalLeft = (t, ops) => ap(ap(t[0], ops[0], t[1]), ops[1], t[2]);

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
      id: 'g4_div1', grade: 4, label: '2けた・3けた÷1けた', hissan: true, defFmt: 'hissan', options: [DIG23, AMARI],
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
      id: 'g4_div2', grade: 4, label: '2けた・3けた÷2けた', hissan: true, defFmt: 'hissan', options: [DIG23, AMARI],
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
    // ===== 小数 =====
    {
      id: 'g3_dec_add', grade: 3, kind: 'dec', label: '小数のたし算（1/10の位）', hissan: true, defFmt: 'hissan', options: [KURI_ADD],
      gen(o, r, i) {
        const a = rndDec(r, 1, 99, 1), b = rndDec(r, 1, 99, 1);
        if (a === null || b === null) return null;
        if (!matchLevel(carries(a, b), wantLevel(o.kuri, i))) return null;
        return P([decStr(a, 1), decStr(b, 1)], ['+'], decStr(a + b, 1));
      },
    },
    {
      id: 'g3_dec_sub', grade: 3, kind: 'dec', label: '小数のひき算（1/10の位）', hissan: true, defFmt: 'hissan', options: [KURI_SUB],
      gen(o, r, i) {
        // 2割は「整数−小数」（例：5−2.3）
        const a = r() < 0.2 ? ri(r, 2, 9) * 10 : rndDec(r, 11, 99, 1);
        const b = rndDec(r, 1, 99, 1);
        if (a === null || b === null || b >= a) return null;
        if (!matchLevel(borrows(a, b), wantLevel(o.kuri, i))) return null;
        return P([decStr(a, 1), decStr(b, 1)], ['-'], decStr(a - b, 1));
      },
    },
    {
      id: 'g4_dec_add', grade: 4, kind: 'dec', label: '小数のたし算（1/100の位）', hissan: true, defFmt: 'hissan', options: [PLACES],
      gen(o, r) {
        const [a, b] = twoDecs(o, r);
        if (a === null) return null;
        return P([decStr(a, 2), decStr(b, 2)], ['+'], decStr(a + b, 2));
      },
    },
    {
      id: 'g4_dec_sub', grade: 4, kind: 'dec', label: '小数のひき算（1/100の位）', hissan: true, defFmt: 'hissan', options: [PLACES],
      gen(o, r) {
        let [a, b] = twoDecs(o, r);
        if (a === null || a === b) return null;
        if (a < b) [a, b] = [b, a];
        return P([decStr(a, 2), decStr(b, 2)], ['-'], decStr(a - b, 2));
      },
    },
    {
      id: 'g4_dec_mulint', grade: 4, kind: 'dec', label: '小数×整数', hissan: true, defFmt: 'hissan',
      options: [
        { key: 'ap', label: 'かけられる数', inTitle: false, choices: [['1', '1/10の位まで'], ['2', '1/100の位まで']], def: '1' },
        { key: 'bd', label: 'かける数', inTitle: true, tl: '', choices: [['1', '1けた'], ['2', '2けた']], def: '1' },
      ],
      gen(o, r) {
        const s = Number(o.ap), a = rndDec(r, 11, s === 1 ? 99 : 999, s);
        const b = o.bd === '1' ? ri(r, 2, 9) : ri(r, 11, 99);
        if (a === null || (o.triv && b % 10 === 0)) return null;
        return P([decStr(a, s), String(b)], ['×'], decStr(a * b, s));
      },
    },
    {
      id: 'g4_dec_divint', grade: 4, kind: 'dec', label: '小数÷整数（わり切れる）', hissan: true, defFmt: 'hissan',
      options: [{ key: 'bd', label: 'わる数', inTitle: false, choices: [['1', '1けた'], ['2', '2けた']], def: '1' }],
      gen(o, r) {
        const b = o.bd === '1' ? ri(r, 2, 9) : ri(r, 11, 30);
        const s = r() < 0.6 ? 1 : 2, q = rndDec(r, 1, s === 1 ? 99 : 999, s);
        if (q === null) return null;
        const a = q * b;
        if (a >= 1000 * 10 ** s) return null;
        const as = decStr(a, s);
        if (!as.includes('.')) return null; // わられる数は小数にする
        return P([as, String(b)], ['÷'], decStr(q, s));
      },
    },
    {
      id: 'g5_dec_mul', grade: 5, kind: 'dec', label: '小数×小数', hissan: true, defFmt: 'hissan',
      options: [{ key: 'bs', label: 'かける数', inTitle: false, choices: [['1', '0.□（例 0.4）'], ['2', '□.□（例 2.3）']], def: '2' }],
      gen(o, r) {
        const sa = r() < 0.6 ? 1 : 2, a = rndDec(r, 11, sa === 1 ? 99 : 999, sa);
        const b = o.bs === '1' ? ri(r, o.triv ? 2 : 1, 9) : rndDec(r, 11, 99, 1);
        if (a === null || b === null) return null;
        return P([decStr(a, sa), decStr(b, 1)], ['×'], decStr(a * b, sa + 1));
      },
    },
    {
      id: 'g5_dec_div', grade: 5, kind: 'dec', label: '小数÷小数', hissan: true, hissanIf: (o) => o.dm === 'exact', defFmt: 'yoko',
      hasRem: (o) => o.dm === 'amari',
      options: [{ key: 'dm', label: 'わり算', inTitle: true, tl: '', choices: [['exact', 'わり切れる'], ['round', '商を四捨五入して1/10の位まで'], ['amari', '商は一の位まで・あまりを出す']], def: 'exact' }],
      gen(o, r) {
        const b = rndDec(r, 2, 99, 1); // 0.2〜9.9
        if (b === null) return null;
        if (o.dm === 'exact') {
          const sq = r() < 0.5 ? 0 : 1, q = sq ? rndDec(r, 11, 99, 1) : ri(r, 2, 40);
          if (q === null) return null;
          const a = q * b, as = decStr(a, sq + 1);
          if (a / 10 ** (sq + 1) >= 100) return null;
          return P([as, decStr(b, 1)], ['÷'], decStr(q, sq));
        }
        if (o.dm === 'round') {
          const a = rndDec(r, 11, 999, 1);
          if (a === null || (a * 10) % b === 0) return null; // 1/10の位でわり切れるものは除く
          const v = Math.floor((20 * a + b) / (2 * b)); // 10倍した四捨五入の値
          if (v < 1) return null;
          return Object.assign(P([decStr(a, 1), decStr(b, 1)], ['÷'], fixed1(v)), { round: 1 });
        }
        const q = ri(r, 2, 30), rem = ri(r, 1, b - 1), a = b * q + rem;
        if (a % 10 === 0 || rem % 10 === 0) return null; // あまりも小数にする
        return P([decStr(a, 1), decStr(b, 1)], ['÷'], String(q), decStr(rem, 1));
      },
    },
    // ===== 分数 =====
    {
      id: 'g3_frac_add', grade: 3, kind: 'frac', label: '分数のたし算（分母が同じ）', hissan: false, defFmt: 'yoko', options: [],
      gen(o, r) {
        const d = ri(r, 2, 10), a = ri(r, 1, d - 1);
        if (d - a < 1) return null;
        const b = ri(r, 1, d - a), s = a + b;
        if (gcd(a, d) > 1 || gcd(b, d) > 1) return null; // 問題の分数も約分ずみの形にする
        if (s < d && gcd(s, d) > 1) return null; // 約分しなくてよい答えだけ
        return P([`${a}/${d}`, `${b}/${d}`], ['+'], fracStr(s, d));
      },
    },
    {
      id: 'g3_frac_sub', grade: 3, kind: 'frac', label: '分数のひき算（分母が同じ）', hissan: false, defFmt: 'yoko', options: [],
      gen(o, r) {
        const d = ri(r, 2, 10), a = r() < 0.25 ? d : ri(r, 2, d - 1);
        if (a < 2) return null;
        const b = ri(r, 1, a - 1), s = a - b;
        if (gcd(s, d) > 1 || gcd(b, d) > 1 || (a < d && gcd(a, d) > 1)) return null;
        return P([a === d ? '1' : `${a}/${d}`, `${b}/${d}`], ['-'], fracStr(s, d));
      },
    },
    {
      id: 'g4_frac_add', grade: 4, kind: 'frac', label: '分数のたし算（分母が同じ・1より大きい）', hissan: false, defFmt: 'yoko', options: [FORM4],
      gen(o, r) {
        const d = ri(r, 3, 9), a = ri(r, 1, 3 * d), b = ri(r, 1, 3 * d), s = a + b;
        if (a % d === 0 || b % d === 0 || (a < d && b < d)) return null;
        if (gcd(a % d, d) > 1 || gcd(b % d, d) > 1) return null;
        if (s % d !== 0 && gcd(s, d) > 1) return null;
        if (s % d === 0 && r() < 0.65) return null; // 答えが整数になる問題は少なめに
        return P([showFrac(a, d, o.form, r), showFrac(b, d, o.form, r)], ['+'], fracStr(s, d));
      },
    },
    {
      id: 'g4_frac_sub', grade: 4, kind: 'frac', label: '分数のひき算（分母が同じ・1より大きい）', hissan: false, defFmt: 'yoko', options: [FORM4],
      gen(o, r) {
        const d = ri(r, 3, 9);
        const a = r() < 0.2 ? ri(r, 2, 4) * d : ri(r, d + 1, 4 * d), b = ri(r, 1, a - 1), s = a - b;
        if (b % d === 0 || (a % d !== 0 && a < d)) return null;
        if ((a % d && gcd(a % d, d) > 1) || gcd(b % d, d) > 1) return null;
        if (s % d !== 0 && gcd(s, d) > 1) return null;
        if (s % d === 0 && r() < 0.65) return null;
        const ta = a % d === 0 ? String(a / d) : showFrac(a, d, o.form, r);
        return P([ta, showFrac(b, d, o.form, r)], ['-'], fracStr(s, d));
      },
    },
    {
      id: 'g5_frac_add', grade: 5, kind: 'frac', label: '分数のたし算（分母がちがう）', hissan: false, defFmt: 'yoko', work: true, options: [YAKU5, MIXED5],
      gen(o, r, i) { return frac5(o, r, i, '+'); },
    },
    {
      id: 'g5_frac_sub', grade: 5, kind: 'frac', label: '分数のひき算（分母がちがう）', hissan: false, defFmt: 'yoko', work: true, options: [YAKU5, MIXED5],
      gen(o, r, i) { return frac5(o, r, i, '-'); },
    },
    {
      id: 'g6_frac_mulint', grade: 6, kind: 'frac', label: '分数×整数', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) {
        const [a, b] = properFrac(r), n = ri(r, 2, 12);
        if (!cancelOk(o, i, gcd(b, n) > 1)) return null;
        return P([`${a}/${b}`, String(n)], ['×'], fracStr(a * n, b));
      },
    },
    {
      id: 'g6_frac_divint', grade: 6, kind: 'frac', label: '分数÷整数', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) {
        const [a, b] = properFrac(r), n = ri(r, 2, 9);
        if (!cancelOk(o, i, gcd(a, n) > 1)) return null;
        return P([`${a}/${b}`, String(n)], ['÷'], fracStr(a, b * n));
      },
    },
    {
      id: 'g6_frac_mul', grade: 6, kind: 'frac', label: '分数×分数', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) {
        const [a, b] = properFrac(r), [c, d] = properFrac(r);
        if (!cancelOk(o, i, gcd(a, d) > 1 || gcd(c, b) > 1)) return null;
        return P([`${a}/${b}`, `${c}/${d}`], ['×'], fracStr(a * c, b * d));
      },
    },
    {
      id: 'g6_frac_div', grade: 6, kind: 'frac', label: '分数÷分数', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) {
        const [a, b] = properFrac(r), [c, d] = properFrac(r);
        if (a * d === b * c) return null;
        if (!cancelOk(o, i, gcd(a, c) > 1 || gcd(b, d) > 1)) return null;
        return P([`${a}/${b}`, `${c}/${d}`], ['÷'], fracStr(a * d, b * c));
      },
    },
    // ===== 6年 四則混合 =====
    {
      id: 'g6_shisoku', grade: 6, label: '四則混合（計算のきまり）', hissan: false, defFmt: 'yoko',
      options: [{ key: 'paren', label: '（ ）', inTitle: true, choices: [['none', 'なし'], ['some', 'あり'], ['mix', 'まぜる']], def: 'mix' }],
      gen(o, r, i) {
        const pick = (arr) => arr[ri(r, 0, arr.length - 1)];
        const ops = [pick(['+', '-', '×', '÷']), pick(['+', '-', '×', '÷'])];
        const md = (x) => x === '×' || x === '÷';
        if (md(ops[0]) === md(ops[1])) return null; // ＋−と×÷を1つずつ
        const terms = [ri(r, 2, 40), ri(r, 2, 20), ri(r, 2, 12)];
        const want = wantLevel(o.paren, i);
        const plain = evalInt(terms, ops, null);
        let paren = null;
        if (want === 'some') {
          paren = r() < 0.5 ? 'L' : 'R';
          const v = evalInt(terms, ops, paren);
          if (v === null || v === plain) return null; // （ ）で答えが変わる問題にする
          return Object.assign(P(terms, ops, v), { paren });
        }
        // （ ）なし：左から計算すると答えがちがう問題（×÷を先にする練習）
        if (plain === null || plain === evalLeft(terms, ops)) return null;
        return P(terms, ops, plain);
      },
    },
    {
      id: 'g6_frac_mixmul', grade: 6, kind: 'frac', label: '帯分数のかけ算', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) { return mixMulDiv(o, r, i, '×'); },
    },
    {
      id: 'g6_frac_mixdiv', grade: 6, kind: 'frac', label: '帯分数のわり算', hissan: false, defFmt: 'yoko', options: [CANCEL6],
      gen(o, r, i) { return mixMulDiv(o, r, i, '÷'); },
    },
    {
      id: 'g6_frac_dec3', grade: 6, kind: 'frac', label: '分数・小数・整数のまじった計算（×÷）', hissan: false, defFmt: 'yoko', options: [],
      gen(o, r) {
        const pick = (arr) => arr[ri(r, 0, arr.length - 1)];
        const dec = () => decStr(rndDec(r, 2, 25, 1) ?? 5, 1); // 0.2〜2.5
        const fr = () => { const [n, d] = properFrac(r); return `${n}/${d}`; };
        const int = () => String(ri(r, 2, 9));
        // 小数を1つ以上、分数を1つ以上ふくむ3つの数
        const terms = shuffle([dec(), fr(), pick([fr, int, dec])()], r);
        if (!terms.some((t) => t.includes('.')) || !terms.some((t) => t.includes('/'))) return null;
        const ops = [pick(['×', '÷']), pick(['×', '÷'])];
        const t = terms.map(parseNum);
        const opf = { '×': rMul, '÷': rDiv };
        const v = opf[ops[1]](opf[ops[0]](t[0], t[1]), t[2]);
        if (v.d > 60 || v.n > 200 || v.n <= 0) return null;
        return P(terms, ops, fracStr(v.n, v.d));
      },
    },
    // ===== 自分で問題を入れる =====
    { id: 'custom', grade: 0, label: '自分で問題を入れる', hissan: true, defFmt: 'yoko', options: [], gen() { return null; } },
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
    return s + (p.paren || '');
  }

  // 1問を作る（条件に合うまでやり直す）
  function genOne(type, o, r, idx, avoid) {
    for (let t = 0; t < 3000; t++) {
      const p = type.gen(o, r, idx);
      if (p && type.kind) p.kind = type.kind;
      if (p && !avoid.has(keyOf(p))) return { p, dup: false };
    }
    for (let t = 0; t < 400; t++) {
      const p = type.gen(o, r, idx);
      if (p && type.kind) p.kind = type.kind;
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
    if (type.id === 'custom') return customDays(cfg, r);
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

  // 6年：帯分数のかけ算・わり算（1つは必ず帯分数）
  function mixMulDiv(o, r, i, op) {
    const mk = (mixed) => { const [n, d] = properFrac(r); const w = mixed ? ri(r, 1, 3) : 0; return { n: w * d + n, d, s: mixedStr(w * d + n, d) }; };
    const m = ri(r, 0, 2); // 0:左が帯分数 1:右が帯分数 2:両方
    const x = mk(m !== 1), y = mk(m !== 0);
    if (op === '÷' && x.n * y.d === y.n * x.d) return null; // 同じ数どうしのわり算は出さない
    // 仮分数にしたあと約分できるか
    const can = op === '×' ? gcd(x.n, y.d) > 1 || gcd(y.n, x.d) > 1 : gcd(x.n, y.n) > 1 || gcd(x.d, y.d) > 1;
    if (!cancelOk(o, i, can)) return null;
    const n = op === '×' ? x.n * y.n : x.n * y.d, d = op === '×' ? x.d * y.d : x.d * y.n;
    const g = gcd(n, d);
    if (d / g > 60 || n / g > 300) return null;
    return P([x.s, y.s], [op], fracStr(n, d));
  }

  // ---------- 自分で入れた式を読む ----------
  // 例：「12+34」「3.4×2」「1と2/3÷4/5」「(12+3)×4」。数は3つまで。
  function parseCustom(line) {
    let s = String(line).trim();
    if (!s) return null;
    s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[．。]/g, '.').replace(/[／]/g, '/').replace(/[＋]/g, '+').replace(/[－−ー‐]/g, '-')
      .replace(/[xｘＸ＊*✕]/gi, '×').replace(/[：]/g, '÷').replace(/[（]/g, '(').replace(/[）]/g, ')')
      .replace(/[=＝].*$/, '').replace(/(\d)\s*と\s*(\d+\/\d+)/g, '$1 $2').trim();
    const re = /\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[+\-×÷()])/y;
    const tok = [];
    let m;
    re.lastIndex = 0;
    while (re.lastIndex < s.length && (m = re.exec(s))) tok.push(m[1]);
    if (re.lastIndex < s.trimEnd().length) return { error: '読めない文字があります' };
    const terms = [], ops = [];
    let paren = null, depth = 0, openAt = -1;
    for (const t of tok) {
      if (t === '(') { if (depth) return { error: '（ ）は1組までです' }; depth = 1; openAt = terms.length; continue; }
      if (t === ')') { if (!depth) return { error: '（ ）の組み合わせがちがいます' }; depth = 0; if (terms.length - openAt !== 2) return { error: '（ ）の中は数2つにしてください' }; paren = openAt === 0 ? 'L' : 'R'; continue; }
      if ('+-×÷'.includes(t)) { if (terms.length !== ops.length + 1) return { error: '式の形がちがいます' }; ops.push(t); continue; }
      if (terms.length !== ops.length) return { error: '式の形がちがいます' };
      terms.push(t);
    }
    if (depth || terms.length < 2 || terms.length !== ops.length + 1) return { error: '式の形がちがいます' };
    if (terms.length > 3) return { error: '数は3つまでにしてください' };
    if (terms.length === 2 && paren) paren = null;
    const kind = terms.some((t) => t.includes('/')) ? 'frac' : terms.some((t) => t.includes('.')) ? 'dec' : undefined;
    const p = { terms: terms.map((t) => (kind ? t.replace(/\s+/, ' ') : Number(t))), ops, ans: '' };
    if (paren) p.paren = paren;
    if (kind) p.kind = kind;
    let x;
    try {
      const vals = p.terms.map(parseNum);
      if (vals.some((v) => !v.n) && ops.includes('÷')) { /* 0でわるかは下で調べる */ }
      if (p.terms.length === 2 && ops[0] === '÷' && !vals[1].n) return { error: '0ではわれません' };
      if (p.terms.length === 2 && ops[0] === '÷' && kind !== 'frac') {
        const q = rDiv(vals[0], vals[1]);
        const exact = kind === 'dec' ? rToDec(q) !== null && rToDec(q).replace('.', '').length <= 6 : q.d === 1;
        if (!exact) { p.rem = ''; } // わり切れない → 商（整数）とあまり
      }
      x = evaluate(p);
    } catch (e) { return { error: '計算できない式です' }; }
    if (!x.ans || x.ans === 'NaN' || x.ans === 'null' || x.ans.startsWith('-')) return { error: '答えが0より小さいか、計算できません' };
    p.ans = kind ? x.ans : Number(x.ans);
    if ('rem' in p) { p.rem = kind ? x.rem : Number(x.rem); if (!Number(String(p.rem).replace(/[^\d.]/g, ''))) delete p.rem; }
    return { p };
  }
  function parseCustomList(text) {
    const problems = [], errors = [];
    String(text || '').split(/\r?\n/).forEach((line, i) => {
      const r0 = parseCustom(line);
      if (!r0) return;
      if (r0.error) errors.push({ line: i + 1, text: line.trim(), error: r0.error });
      else problems.push(r0.p);
    });
    return { problems, errors };
  }

  // 自分で入れた問題を日ごとにふりわける
  // 毎日ちがう：入れた順に「1日の問題数」ずつ（最後まで行ったら最初にもどる）／くり返し：毎日同じ問題（順番を入れかえ）
  function customDays(cfg, r) {
    const list = cfg.custom || [];
    const days = [];
    if (!list.length) { for (let d = 0; d < cfg.days; d++) days.push([]); return { days, dup: false }; }
    const n = Math.min(cfg.count, list.length);
    for (let d = 0; d < cfg.days; d++) {
      let day;
      if (cfg.mode === 'rep') day = shuffle(list.slice(0, n), r);
      else if (cfg.mode === 'part' && d > 0) {
        const keep = shuffle(days[d - 1], r).slice(0, Math.floor(n / 2));
        const rest = list.filter((p) => !keep.includes(p));
        day = shuffle(keep.concat(shuffle(rest, r).slice(0, n - keep.length)), r);
      } else day = Array.from({ length: n }, (_, i) => list[(d * n + i) % list.length]);
      days.push(day);
    }
    return { days, dup: false, count: n };
  }

  // 答えの検算（テストと表示前チェックに使う）。分数で正確に計算し、答えを文字列で返す
  function evaluate(p) {
    const t = p.terms.map(parseNum);
    const kind = p.kind || 'int';
    const fmt = (x) => (kind === 'frac' ? fracStr(x.n, x.d) : kind === 'dec' ? rToDec(x) : x.d === 1 ? String(x.n) : 'NaN');
    const opf = { '+': rAdd, '-': rSub, '×': rMul, '÷': rDiv };
    if (p.ops.length === 1 && p.ops[0] === '÷' && 'rem' in p) {
      // 商とあまり（商は整数）
      const q = Math.floor((t[0].n * t[1].d) / (t[0].d * t[1].n));
      const rem = rSub(t[0], rMul(t[1], { n: q, d: 1 }));
      return { ans: String(q), rem: kind === 'dec' ? rToDec(rem) : String(rem.n) };
    }
    let v;
    if (p.ops.length === 1) v = opf[p.ops[0]](t[0], t[1]);
    else {
      const [o1, o2] = p.ops, md = (x) => x === '×' || x === '÷';
      if (p.paren === 'L' || (!p.paren && !(md(o2) && !md(o1)))) v = opf[o2](opf[o1](t[0], t[1]), t[2]);
      else v = opf[o1](t[0], opf[o2](t[1], t[2]));
    }
    if (p.round) return { ans: fixed1(Math.floor((20 * v.n + v.d) / (2 * v.d))), rem: '' };
    return { ans: fmt(v), rem: '' };
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
      if (c) parts.push((op.tl !== undefined ? op.tl : op.label) + c[1]);
    }
    let label = type.label;
    const dig = type.options.find((x) => x.key === 'dig');
    if (dig) {
      const c = dig.choices.find((x) => x[0] === o.dig);
      if (c) label = label.replace(/2けた・3けた|3けた・4けた/, c[1]);
    }
    return parts.length ? `${label}（${parts.join('、')}）` : label;
  }

  const api = { parseCustom, parseCustomList, gcd, parseNum, fracStr, mixedStr, decStr, TYPES, TYPE_MAP, defaultOptions, generateDays, evaluate, keyOf, titleOf, carries, borrows, mulCarries, mulberry32, ndig };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SansuGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
