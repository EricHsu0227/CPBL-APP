"""Season-level history (1990-2022) from the open dataset https://github.com/ldkrsi/cpbl-opendata (MIT).

The dataset has yearly batting / pitching totals per player and yearly standings scraped from the CPBL site, with no
game-level data. It is converted to the same row format as the 野球革命 seasons, so the site's pages work unchanged;
stats that need pitch / plate-appearance data (wOBA, splits, zone numbers) are simply absent.
"""
import csv, io, pathlib, re
from collections import defaultdict
import stats

HERE = pathlib.Path(__file__).resolve().parent
CACHE = HERE / "history-data"
FIRST, LAST_EXTRA = 1990, 2024  # CSVs go to 2024; seasons from 2023 on come from 野球革命 and are only used for matching

# Team codes of one franchise share an id (野球革命 ids for the six current clubs).
FRANCHISE = {
    "ACC": "HCHks", "ACN": "HCHks",                                 # 兄弟象 -> 中信兄弟
    "ADD": "hThSB",                                                 # 統一獅
    "AJK": "1zODE", "AJL": "1zODE",                                 # La New熊 / Lamigo -> 樂天桃猿
    "AEE": "TPKQm", "AEG": "TPKQm", "AEM": "TPKQm", "AEO": "TPKQm", # 俊國熊 / 興農牛 / 義大犀牛 -> 富邦悍將
    "AAA": "0MJKt",                                                 # 味全龍
    "AKP": "LH4lt",                                                 # 台鋼雄鷹
}
fid = lambda code: FRANCHISE.get(code, code)


def read(name):
    path = CACHE / name
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0


def outs(ip):
    """'58.1' -> 175 (CPBL writes thirds after the dot)."""
    whole, _, frac = str(ip).partition(".")
    return int(whole or 0) * 3 + int(frac or 0)


def hands(players):
    """player id -> (throws, bats) from strings such as '右投左打'."""
    out = {}
    for p in players:
        m = re.match(r"([右左])投([右左兩])打", p["Handedness"] or "")
        if m:
            out[p["ID"]] = ({"右": "R", "左": "L"}[m.group(1)], {"右": "R", "左": "L", "兩": "S"}[m.group(2)])
    return out


def load_year(year):
    bat = defaultdict(lambda: defaultdict(float))
    pit = defaultdict(lambda: defaultdict(float))
    teams = {}
    for kind, acc in (("battings", bat), ("pitchings", pit)):
        f = f"CPBL/{kind}/{year}.csv"
        if not (CACHE / f).exists():
            continue
        for r in read(f):
            a = acc[r["ID"]]
            a["_name"] = r["Name"]
            for k, v in r.items():
                if k in ("ID", "Name", "Team ID", "Team Name"):
                    continue
                a[k] += outs(v) if k == "IP" else num(v)
            w = outs(r["IP"]) if kind == "pitchings" else num(r["PA"])
            a.setdefault("_teams", {})
            a["_teams"][r["Team ID"]] = a["_teams"].get(r["Team ID"], 0) + w
            teams[r["Team ID"]] = r["Team Name"]
    return bat, pit, teams


def bat_row(pid, a, hand_of, lg):
    d = {k: a[k] for k in ("G", "PA", "AB", "R", "H", "1B", "2B", "3B", "HR", "TB", "RBI", "BB", "IBB", "HBP", "SO", "SF", "SH", "GIDP", "SB", "CS", "GO", "FO")}
    ab = d["AB"]
    obp = stats.div(d["H"] + d["BB"] + d["HBP"], ab + d["BB"] + d["HBP"] + d["SF"])
    slg = stats.div(d["TB"], ab)
    d.update({"AVG": stats.div(d["H"], ab), "OBP": obp, "SLG": slg, "OPS": None if obp is None or slg is None else obp + slg,
              "ISO": None if slg is None else slg - d["H"] / ab, "BABIP": stats.div(d["H"] - d["HR"], ab - d["SO"] - d["HR"] + d["SF"]),
              "K%": stats.div(d["SO"], d["PA"]), "BB%": stats.div(d["BB"], d["PA"]), "BB/K": stats.div(d["BB"], d["SO"])})
    if obp is not None and slg is not None and lg["obp"] and lg["slg"]:
        d["OPS+"] = 100 * (obp / lg["obp"] + slg / lg["slg"] - 1)
    team = max(a["_teams"], key=a["_teams"].get)
    return {"id": pid, "name": a["_name"], "team": fid(team), "teams": [fid(t) for t in a["_teams"]], "num": None,
            "hand": hand_of.get(pid, (None, None))[1], "splits": {"all": stats.clean(d)}}


def pit_row(pid, a, hand_of, lg):
    o = a["IP"]
    ip = o / 3
    d = {k: a[k] for k in ("G", "GS", "GR", "CG", "SHO", "W", "L", "SV", "HLD", "BF", "NP", "H", "R", "ER", "HR", "BB", "IBB", "HBP", "SO", "WP", "BK", "GO", "FO")}
    d["HB"] = d.pop("HBP")
    d.update({"IPOuts": o, "IP": stats.ip_str(o), "TBF": d["BF"], "ERA": stats.div(9 * d["ER"], ip), "WHIP": stats.div(d["BB"] + d["H"], ip),
              "K/9": stats.div(9 * d["SO"], ip), "BB/9": stats.div(9 * d["BB"], ip), "HR/9": stats.div(9 * d["HR"], ip), "K/BB": stats.div(d["SO"], d["BB"]),
              "K%": stats.div(d["SO"], d["BF"]), "BB%": stats.div(d["BB"], d["BF"])})
    if d["K%"] is not None and d["BB%"] is not None:
        d["K-BB%"] = d["K%"] - d["BB%"]
    if ip:
        d["FIP"] = (13 * d["HR"] + 3 * (d["BB"] - d["IBB"] + d["HB"]) - 2 * d["SO"]) / ip + lg["cfip"]
        if d["ER"]:
            d["ERA+"] = 100 * lg["era"] / (9 * d["ER"] / ip)
    d = {k: v for k, v in d.items() if v or k in ("G", "W", "L", "SV", "HLD")}  # drop empty NP etc.
    team = max(a["_teams"], key=a["_teams"].get)
    return {"id": pid, "name": a["_name"], "team": fid(team), "teams": [fid(t) for t in a["_teams"]], "num": None,
            "hand": hand_of.get(pid, (None, None))[0], "splits": {"all": stats.clean(d)}}


def league(bat, pit):
    t = defaultdict(float)
    for a in bat.values():
        for k in ("H", "BB", "HBP", "AB", "SF", "TB"):
            t[k] += a[k]
    ip = sum(a["IP"] for a in pit.values()) / 3
    er = sum(a["ER"] for a in pit.values())
    fip_raw = sum(13 * a["HR"] + 3 * (a["BB"] - a["IBB"] + a["HBP"]) - 2 * a["SO"] for a in pit.values()) / ip if ip else 0
    era = 9 * er / ip if ip else 0
    return {"obp": stats.div(t["H"] + t["BB"] + t["HBP"], t["AB"] + t["BB"] + t["HBP"] + t["SF"]), "slg": stats.div(t["TB"], t["AB"]),
            "era": era, "cfip": era - fip_raw}


def standings(year, rows, bat_rows, pit_rows):
    rs, ra = defaultdict(int), defaultdict(int)
    for r in bat_rows:  # runs scored / allowed summed from player lines
        rs[r["team"]] += r["splits"]["all"].get("R", 0)
    for r in pit_rows:
        ra[r["team"]] += r["splits"]["all"].get("R", 0)
    out = []
    for r in rows:
        if r["Year"] != str(year):
            continue
        w, l, t = int(r["Win"]), int(r["Lose"]), int(r["Tie"])
        tid = fid(r["Team ID"])
        out.append({"id": tid, "name": r["Team"], "W": w, "L": l, "T": t, "G": w + l + t, "pct": round(w / (w + l), 3) if w + l else None,
                    "RS": rs.get(tid), "RA": ra.get(tid)})
    out.sort(key=lambda r: -(r["pct"] or 0))
    if out:
        top = out[0]
        for r in out:
            r["GB"] = ((top["W"] - r["W"]) + (r["L"] - top["L"])) / 2
    return out


def build_year(year, hand_of, st_rows):
    bat, pit, teams = load_year(year)
    lg = league(bat, pit)
    b = [bat_row(pid, a, hand_of, lg) for pid, a in bat.items()]
    p = [pit_row(pid, a, hand_of, lg) for pid, a in pit.items()]
    return b, p, standings(year, st_rows, b, p), teams


def match(rebas_rows, hist_rows):
    """rebas player id -> history player id. Both sides keyed by (season, franchise, name); a pair is accepted only when
    that key is unique on both sides in every shared season, and one history id is never given to two players."""
    cand = defaultdict(set)
    for season, rows in rebas_rows.items():
        h = defaultdict(set)
        for r in hist_rows.get(season, []):
            h[(r["team"], r["name"])].add(r["id"])
        n = defaultdict(int)
        for r in rows:
            n[(r["team"], r["name"])] += 1
        for r in rows:
            k = (r["team"], r["name"])
            if n[k] == 1 and len(h.get(k, ())) == 1:
                cand[r["id"]] |= h[k]
    used = defaultdict(set)
    for rid, hs in cand.items():
        if len(hs) == 1:
            used[next(iter(hs))].add(rid)
    return {rid: next(iter(hs)) for rid, hs in cand.items() if len(hs) == 1 and len(used[next(iter(hs))]) == 1}
