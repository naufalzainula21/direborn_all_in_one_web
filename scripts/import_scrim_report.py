"""Turn the team's Excel scrim report into src/data/scrim-report.json.

Usage: python3 scripts/import_scrim_report.py path/to/Direborn_Dota2_Team_Report.xlsx
Reads the "Scrim Data" sheet: one row per game, Date/Team merged across a scrim.
"""
import datetime as dt, json, re, sys
import openpyxl

PHASES = {
    'New Roster': ('new-roster', 'New roster (Dreamocel carry, db 4, deco 5)'),
    'Blast Slam': ('blast-prep', 'BLAST Slam VIII preparation'),
}
# Known slips in the sheet, fixed here so the source file stays untouched.
ALIAS = {'cloudrising': 'Cloud Rising', 'xctn': 'XCTN', 'mercy stack': 'Mercy Stack', 'novus': 'Novus', 'ice cream man': 'Ice Cream Man'}
DATE_FIX = {(6, '27/06/2026'): '2026-05-27'}  # sits between 24/05 and 28/05

def iso(s):
    d, m, y = (int(x) for x in str(s).strip().split('/'))
    return f'{y:04d}-{m:02d}-{d:02d}'

def score(v):
    if v in (None, '-', ''):
        return None
    if isinstance(v, dt.datetime):  # Excel turned "27-11" into a date
        return f'{v.day}-{v.month}'
    m = re.match(r'\s*(\d+)\s*-\s*(\d+)\s*$', str(v))
    return f'{m[1]}-{m[2]}' if m else None

def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return None if s in ('', '-') else s

def main(path):
    ws = openpyxl.load_workbook(path, data_only=True)['Scrim Data']
    links = {c.coordinate: c.hyperlink.target for row in ws.iter_rows() for c in row if c.hyperlink}
    phase = ('original', 'Original roster')
    series, cur, date, seen_ids = [], None, None, set()
    for i, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        a, team, _tier, side, pick, res, sc, mid, fb, vod = (list(r) + [None] * 10)[:10]
        if a and not team and not side:
            for k, p in PHASES.items():
                if str(a).startswith(k):
                    phase = p
            continue
        if not any(v is not None for v in r):
            continue
        if a:
            date = DATE_FIX.get((i, str(a).strip()), iso(a))
        if team:
            cur = {'date': date, 'opp': ALIAS.get(str(team).strip().lower(), str(team).strip()), 'phase': phase[0], 'games': [], 'row': i}
            series.append(cur)
        if cur is None:
            continue
        fbt = clean(fb)
        cancelled = (fbt or '').upper() == 'CANCEL' or side == '-' or res == '-'
        result = {'Win': 'W', 'Lose': 'L'}.get(str(res).strip()) if res else None
        match_id = None
        if isinstance(mid, (int, float)):
            match_id = str(int(mid))
            if match_id in seen_ids:  # pasted twice in the sheet; keep the first
                match_id = None
            else:
                seen_ids.add(match_id)
        v = links.get(f'J{i}') or clean(vod)
        cur['games'].append({
            'side': clean(side), 'pick': clean(pick), 'result': None if cancelled else result,
            'kills': None if cancelled else score(sc), 'matchId': None if cancelled else match_id,
            'vod': v.strip() if v else None, 'note': None if fbt and fbt.upper() == 'CANCEL' else fbt,
            'status': 'cancelled' if cancelled else ('played' if result else 'not-played'),
        })
    out = []
    for n, s in enumerate(series):
        played = [g for g in s['games'] if g['result']]
        out.append({
            'key': f"r{s['date'].replace('-', '')}-{n}", 'date': s['date'], 'opp': s['opp'], 'phase': s['phase'],
            'w': sum(g['result'] == 'W' for g in played), 'l': sum(g['result'] == 'L' for g in played),
            'games': s['games'],
        })
    phases = [{'id': 'original', 'label': 'Original roster'}] + [{'id': p[0], 'label': p[1]} for p in PHASES.values()]
    json.dump({'phases': phases, 'series': out}, open('src/data/scrim-report.json', 'w'), indent=1)
    print(len(out), 'scrims,', sum(len([g for g in s['games'] if g['result']]) for s in out), 'games')

main(sys.argv[1])
