# 実行：python3 -m http.server 8765 を起動したまま python3 tests/verify_printed_answers.py
# 答えのページに実際に出る文字を読みとり、Pythonの分数で解き直して照合します（playwright が必要）
# 答えのページに印刷される文字を読みとり、Pythonの分数で別に解き直して照合する
import asyncio, random, re, sys
from fractions import Fraction as F
from playwright.async_api import async_playwright

EXTRACT = r'''() => {
  const out = [];
  const txt = (e) => e ? e.textContent.trim() : '';
  const fr = (el) => { // .fr → "n/d"
    const s = el.querySelectorAll(':scope > span'); return txt(s[0]) + '/' + txt(s[1]); };
  const readNum = (nodes) => { // num span (+ following .fr) → 文字列
    let s = ''; for (const n of nodes) { if (n.classList.contains('num')) s += (s ? ' ' : '') + txt(n); else if (n.classList.contains('fr')) s += (s ? ' ' : '') + fr(n); } return s; };
  document.querySelectorAll('.pages .page.answer').forEach((pg) => {
    pg.querySelectorAll('.yk').forEach((yk) => {
      const expr = yk.querySelector('.expr'); const toks = []; let cur = [];
      for (const c of expr.children) {
        if (c.classList.contains('op')) { if (cur.length) { toks.push(readNum(cur)); cur = []; } toks.push(txt(c)); }
        else if (c.classList.contains('pa')) { if (cur.length) { toks.push(readNum(cur)); cur = []; } toks.push(txt(c)); }
        else cur.push(c);
      }
      if (cur.length) toks.push(readNum(cur));
      const item = { kind: 'yoko', toks, round: !!yk.querySelector('.yaku') };
      const fans = yk.querySelector('.fans');
      if (fans) { const bs = fans.querySelectorAll(':scope > b'); item.ans = readNum([...bs[0].children]); item.mixed = bs[1] ? readNum([...bs[1].children]) : null; }
      else { const boxes = yk.querySelectorAll('.box'); item.ans = txt(boxes[0]); item.rem = boxes[1] ? txt(boxes[1]) : null; }
      out.push(item);
    });
    pg.querySelectorAll('.hs').forEach((hs) => {
      const g = hs.querySelector('.hgrid');
      const cols = g.style.gridTemplateColumns;
      const cells = [...g.children];
      const rowStr = (arr) => arr.map((c) => (c.textContent.trim() || '_') + (c.classList.contains('dp') ? '.' : '') + (c.classList.contains('dpn') ? '*' : '')).join('');
      if (g.classList.contains('div')) {
        const m = cols.match(/repeat\((\d+),var\(--cell\)\) calc\(var\(--cell\)\*0\.5\) repeat\((\d+)/);
        const Wd = +m[1], Wa = +m[2], W = Wd + 1 + Wa;
        const q = cells.slice(Wd + 1, W), r1 = cells.slice(W, 2 * W);
        out.push({ kind: 'div', q: rowStr(q), dv: rowStr(r1.slice(0, Wd)), dd: rowStr(r1.slice(Wd + 1)), rem: txt(hs.querySelector('.hrem b')) });
      } else {
        const W = +cols.match(/repeat\((\d+)/)[1];
        const rows = []; for (let i = 0; i < cells.length; i += W) rows.push(cells.slice(i, i + W));
        out.push({ kind: 'hissan', a: rowStr(rows[0].slice(1)), op: txt(rows[1][0]), b: rowStr(rows[1].slice(1)), ans: rowStr(rows[rows.length - 1].slice(1)) });
      }
    });
  });
  return out;
}'''

def num(s):
    s = s.strip().replace('−', '-')
    m = re.fullmatch(r'(\d+) (\d+)/(\d+)', s)
    if m: return F(int(m[1])) + F(int(m[2]), int(m[3]))
    m = re.fullmatch(r'(\d+)/(\d+)', s)
    if m: return F(int(m[1]), int(m[2]))
    return F(s)  # 整数・小数

def solve(toks):
    # 計算のきまり（（ ）→ ×÷ → ＋−）で解く
    t = [x.replace('−', '-') for x in toks if x != '=']
    def val(i):
        if t[i] == '(':
            j = t.index(')', i)
            return evalflat(t[i + 1:j]), j + 1
        return num(t[i]), i + 1
    def evalflat(seq):
        vals, ops = [num(seq[0])], []
        for k in range(1, len(seq), 2): ops.append(seq[k]); vals.append(num(seq[k + 1]))
        return reduce(vals, ops)
    vals, ops, i = [], [], 0
    v, i = val(i); vals.append(v)
    while i < len(t):
        ops.append(t[i]); v, i = val(i + 1); vals.append(v)
    return reduce(vals, ops)

def reduce(vals, ops):
    vals, ops = vals[:], ops[:]
    k = 0
    while k < len(ops):
        if ops[k] in '×÷':
            a, b = vals[k], vals[k + 1]
            vals[k:k + 2] = [a * b if ops[k] == '×' else a / b]; ops.pop(k)
        else: k += 1
    v = vals[0]
    for o, x in zip(ops, vals[1:]): v = v + x if o == '+' else v - x
    return v

def gridnum(s):
    # "_4_1.2" のようなマスの並び → 数（. はそのマスの後ろの小数点、* は答えページの移動後の小数点）
    s = s.replace('*', '')
    digits = re.sub(r'[^\d.]', '', s.replace('_', ''))
    return F(digits) if digits else None

def check(it):
    if it['kind'] == 'yoko':
        toks = it['toks']
        v = solve(toks)
        if it.get('mixed') is not None or ('/' in it['ans']):
            got = num(it['ans'])
            if got != v: return f'答えちがい {toks} → {it["ans"]} 正しくは {v}'
            # 仮分数が先、（ ）は帯分数で同じ値
            if it.get('mixed'):
                if num(it['mixed']) != v or ' ' not in it['mixed'] or got.denominator == 1: return f'帯分数の表示 {it}'
            if got != F(got.numerator, got.denominator): pass
            m = re.fullmatch(r'(\d+)/(\d+)', it['ans'])
            if m and F(int(m[1]), int(m[2])).numerator != int(m[1]): return f'約分されていない {it["ans"]}'
            return None
        if it.get('rem') not in (None, ''):
            a, b = num(toks[0]), num(toks[2])
            q = num(it['ans']); r = F(0) if it['rem'] == 'なし' else num(it['rem'])
            if q.denominator != 1 or not (0 <= r < b) or b * q + r != a: return f'あまりちがい {toks} → {it["ans"]} あまり {it["rem"]}'
            return None
        if it['round']:
            exact = v; got = num(it['ans'])
            want = F(int((exact * 10 + F(1, 2)) // 1), 10)
            if got != want: return f'四捨五入ちがい {toks} → {it["ans"]} 正しくは {float(want)}'
            return None
        if num(it['ans']) != v: return f'答えちがい {toks} → {it["ans"]} 正しくは {v}'
        return None
    if it['kind'] == 'hissan':
        a, b, ans = gridnum(it['a']), gridnum(it['b']), gridnum(it['ans'])
        op = it['op'].replace('−', '-')
        v = a + b if op == '+' else a - b if op == '-' else a * b
        if ans != v: return f'筆算の答えちがい {it}'
        return None
    if it['kind'] == 'div':
        dv, dd, q = gridnum(it['dv']), gridnum(it['dd']), gridnum(it['q'])
        r = it['rem']
        if r and r != 'なし':
            r = F(r)
            if q.denominator != 1 or not (0 < r < dv) or dv * q + r != dd: return f'わり算筆算のあまりちがい {it}'
        elif dd / dv != q: return f'わり算筆算の答えちがい {it}  {dd}/{dv}={dd/dv}'
        # 答えページで、動かした小数点（*）の位置で商とそろっているか：商の小数部分のけた数＝わられる数を動かしたあとの小数のけた数以上
        return None

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1400, 'height': 900})
        await pg.route('**/fonts.g*/**', lambda r: r.abort())
        await pg.goto('http://localhost:8765/index.html')
        types = await pg.evaluate("SansuGen.TYPES.filter(t=>t.id!=='custom').map(t=>[t.id, t.hissan, t.options.map(o=>[o.key,o.choices.map(c=>c[0])])])")
        total = bad = pages = 0
        for tid, hs, opts in types:
            optsets = [{}]
            for k, vals in opts: optsets = [dict(o, **{k: v}) for o in optsets for v in vals]
            for os_ in optsets:
                for fmt in (['yoko', 'hissan'] if hs else ['yoko']):
                    for rep in range(2):
                        seed = random.randint(1, 2**31 - 2)
                        q = f'?t={tid}&fmt={fmt}&n=12&d=3&ans=1&sz=S&ly=multi&s={seed}' + ''.join(f'&o_{k}={v}' for k, v in os_.items())
                        await pg.goto('http://localhost:8765/index.html' + q); await pg.wait_for_timeout(10)
                        items = await pg.evaluate(EXTRACT); pages += 1
                        for it in items:
                            total += 1
                            try: e = check(it)
                            except Exception as ex: e = f'読みとりエラー {ex} {it}'
                            if e:
                                bad += 1
                                if bad <= 20: print(tid, os_, fmt, e)
        print(f'プリント {pages} 回分、答え {total} 個を照合、ちがい {bad} 個')
        await b.close()
asyncio.run(main())
