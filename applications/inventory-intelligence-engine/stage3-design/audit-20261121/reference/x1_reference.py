"""Separate reference checks for X1 behaviour on a fault workbook (Claude, 21 Nov 2026).
Compares the engine's output for a workbook with seeded faults against (a) the engine's output for the clean
workbook and (b) values recomputed from the raw faulty workbook.
Usage: python3 x1_reference.py <faulty.xlsx> <faulty-items.json> <clean-items.json> <ids changed, comma-separated>"""
import sys, json, math
import pandas as pd
wb, fj, cj, ids = sys.argv[1], json.load(open(sys.argv[2])), json.load(open(sys.argv[3])), set(sys.argv[4].split(','))
I = pd.read_excel(wb, sheet_name='Inventory').set_index('Item_ID')
num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
ok = bad = 0
def chk(c, m):
    global ok, bad
    if c: ok += 1
    else: bad += 1; print('DIFF', m)
items = fj['fg'] + fj['rm']; clean = {x['id']: x for x in cj['fg'] + cj['rm']}
# 1. Partial inventory value: sum of On_Hand x Unit_Cost over rows where both are valid numbers
known = [(r.On_Hand_Qty * r.Unit_Cost_GBP) for _, r in I.iterrows() if num(r.On_Hand_Qty) and num(r.Unit_Cost_GBP)]
eng = [x['val'] for x in items if num(x.get('val'))]
chk(abs(sum(known) - sum(eng)) < 1e-6, 'partial value %s vs %s' % (sum(known), sum(eng)))
chk(len(known) == len(eng), 'covered items %d vs %d' % (len(known), len(eng)))
chk(fj['totals']['tot'] is None, 'headline total withheld (not shown as a complete figure)')
# 2. No missing value became a zero
for x in items:
    r = I.loc[x['id']]
    if not num(r.On_Hand_Qty): chk(x.get('oh') is None and x.get('val') is None and x.get('av') is None, x['id'] + ' blank on-hand not turned into 0')
    if not num(r.Unit_Cost_GBP): chk(x.get('val') is None, x['id'] + ' blank cost: value withheld, not 0')
    if not num(r.Allocated_Qty): chk(x.get('av') is None and x.get('assess') == 'Not Assessed', x['id'] + ' invalid allocated: available withheld, Not Assessed')
# 3. Unaffected items identical to the clean run (every scalar field except the cross-item ABC ranking, checked in 5)
CROSS = {'cum', 'abc'}
for x in items:
    if x['id'] in ids: continue
    c = clean[x['id']]
    diff = [k for k in set(x) | set(c) - CROSS if k not in CROSS and x.get(k) != c.get(k) and not (num(x.get(k)) and num(c.get(k)) and abs(x[k] - c[k]) < 1e-9)]
    chk(not diff, x['id'] + ' differs from the clean run in ' + ','.join(sorted(diff)[:6]))
# 4. Affected items: fields that do not depend on the faulty input are unchanged
for i in ids:
    x = next(y for y in items if y['id'] == i); c = clean[i]
    for k in ['m', 'sg', 'annual', 'd', 'ssR', 'ropR']:
        if k in c: chk(x.get(k) == c.get(k) or (num(x.get(k)) and abs(x[k] - c[k]) < 1e-9), i + ' ' + k + ' changed although it does not use the faulty field')
# 5. ABC ranking recomputed from annual value (ann): known items only, ranked high to low within FG and within RM;
#    A up to abcA % cumulative, B up to abcB %, else C; unknown annual value -> Not Assessed. Both runs.
def abc(group, A=80, B=95):
    kn = sorted([x for x in group if num(x.get('ann'))], key=lambda x: -x['ann']); t = sum(x['ann'] for x in kn) or 1; c = 0; out = {}
    for x in kn:
        c += x['ann'] / t * 100; out[x['id']] = ('A' if c <= A else 'B' if c <= B else 'C', c)
    for x in group:
        if not num(x.get('ann')): out[x['id']] = ('Not Assessed', None)
    return out
moved = []
for name, run in [('faulty', fj), ('clean', cj)]:
    for g in ['fg', 'rm']:
        ref = abc(run[g])
        for x in run[g]:
            r = ref[x['id']]
            chk(r[0] == x.get('abc') and (r[1] is None or abs(r[1] - x['cum']) < 1e-6), '%s %s ABC ref %s vs engine %s' % (name, x['id'], r, (x.get('abc'), x.get('cum'))))
for x in items:
    if x['id'] not in ids and x.get('abc') != clean[x['id']].get('abc'): moved.append('%s %s->%s' % (x['id'], clean[x['id']]['abc'], x['abc']))
print('unaffected items whose ABC class moved because other items became Not Assessed:', ', '.join(moved) or 'none')
print('X1 reference checks: %d, agree %d, differ %d' % (ok + bad, ok, bad))
