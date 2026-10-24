"""Build static JSON from 野球革命 open data for every season in sources.json: python pipeline/build.py

Output (public/data/):
  index.json                         seasons, teams, build info
  <season>/games.json                every game (regular / challenge / taiwan) with line score
  <season>/game/<kind>-<seq>.json    box score + play-by-play
  <season>/standings.json            full season, first half, second half
  <season>/bat.json, pit.json        regular-season player lines with all / vsL / vsR splits
  <season>/arsenal.json              pitch mix per pitcher
  players/<id>.json                  per-player seasons + game logs
  players-index.json                 search index
"""
import json, pathlib, sys
from collections import defaultdict
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import fetch, stats

OUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "data"
KINDS = ("regular", "challenge", "taiwan")


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def load_games(season):
    out = {}
    for kind in KINDS:
        d = fetch.CACHE / season / kind
        if d.exists():
            out[kind] = sorted((json.loads(f.read_text()) for f in d.glob("*.json")), key=lambda g: g["seq"])
    return out


def side_summary(g, s):
    return {"id": g[s + "TeamId"], "name": g[s + "Team"], "r": stats.runs(g, s), "h": sum(b.get("H") or 0 for b in g[s + "BatterBox"]),
            "line": [None if x in (None, "") else int(x) for x in g[s + "Scores"]]}


def game_row(g, kind):
    return {"id": f"{kind}-{g['seq']}", "kind": kind, "seq": g["seq"], "date": g["date"], "stadium": g["stadium"],
            "away": side_summary(g, "away"), "home": side_summary(g, "home")}


def pbp(g):
    """Plate appearances in game order (top/bottom by inning), compact."""
    rows = []
    for s, half in (("away", "top"), ("home", "bot")):
        for pa in g[s + "PAList"]:
            rows.append({"inn": pa["inning"], "half": half, "b": pa["batterName"], "bh": pa.get("batterHand"), "p": pa["pitcherName"], "ph": pa.get("pitcherHand"),
                         "res": pa.get("result") or "", "rbi": pa.get("RBI") or 0, "outs": pa.get("outs"), "bases": pa.get("bases"),
                         "seq": "".join(PCODE.get(c, "?") for c in pa.get("pitchCodes") or []),
                         "pitches": [[e.get("pitchType"), stats.num(e.get("velocity")), e.get("pitchCode")] for e in pa.get("events") or [] if e.get("type") == "PITCH"],
                         "traj": pa.get("trajectory") or "", "hard": pa.get("hardness") or "", "loc": pa.get("locationCode") or "",
                         "score": [pa.get("endAwayScores"), pa.get("endHomeScores")], "we": stats.num(pa.get("homeWE")), "wpa": stats.num(pa.get("WPA")), "isPH": pa.get("isPH")})
    order = {"top": 0, "bot": 1}
    # stable: away list then home list, each already in order; sort by inning then half
    return sorted(rows, key=lambda r: (r["inn"], order[r["half"]]))


PCODE = {"S": "S", "SW": "W", "B": "B", "F": "F", "FT": "T", "FOUL_BUNT": "f", "TRY_BUNT": "w", "BUNT": "X", "H": "X"}


def game_file(g, kind):
    row = game_row(g, kind)
    for s in ("away", "home"):
        row[s]["bat"] = [{k: b.get(k) for k in ("order", "playerId", "playerNumber", "playerName", "PA", "AB", "R", "H", "RBI", "2B", "3B", "HR", "BB", "HBP", "SO", "SB", "CS")} for b in g[s + "BatterBox"]]
        row[s]["pit"] = [{**{k: b.get(k) for k in ("order", "playerId", "playerNumber", "playerName", "NP", "BF", "H", "HR", "BB", "HB", "SO", "R", "ER")}, "IP": stats.ip_str(b.get("IPOuts") or 0)} for b in g[s + "PitcherBox"]]
    row["pbp"] = pbp(g)
    return row


def game_logs(games_by_kind, logs, season):
    for kind, games in games_by_kind.items():
        for g in games:
            gid = f"{kind}-{g['seq']}"
            for s, o in (("away", "home"), ("home", "away")):
                me, them = stats.runs(g, s), stats.runs(g, o)
                base = {"g": gid, "date": g["date"][:10], "opp": g[o + "TeamId"], "home": s == "home", "res": "W" if me > them else "L" if me < them else "T", "score": f"{me}-{them}"}
                for b in g[s + "BatterBox"]:
                    logs[b["playerId"]][season]["bat"].append({**base, **{k: b.get(k) or 0 for k in ("PA", "AB", "R", "H", "2B", "3B", "HR", "RBI", "BB", "HBP", "SO", "SB")}})
                for i, b in enumerate(g[s + "PitcherBox"]):
                    logs[b["playerId"]][season]["pit"].append({**base, "GS": i == 0, "IP": stats.ip_str(b.get("IPOuts") or 0),
                                                              **{k: b.get(k) or 0 for k in ("NP", "BF", "H", "HR", "BB", "SO", "R", "ER")}})


def build_season(season, logs, players):
    by_kind = load_games(season)
    if not by_kind.get("regular"):
        print(f"{season}: no regular-season games in cache", file=sys.stderr)
        return None
    d = OUT / season
    games = [game_row(g, k) for k, gs in by_kind.items() for g in gs]
    dump(d / "games.json", sorted(games, key=lambda r: (r["date"], r["id"])))
    for k, gs in by_kind.items():
        for g in gs:
            dump(d / "game" / f"{k}-{g['seq']}.json", game_file(g, k))
    reg = by_kind["regular"]
    teams = {}
    for g in reg:
        for s in ("away", "home"):
            teams[g[s + "TeamId"]] = g[s + "Team"]
    half = len(teams) * 30  # 120 games per team, halves split the schedule by game number (works for a partly released season)
    dump(d / "standings.json", {"full": stats.standings(reg, teams), "first": stats.standings([g for g in reg if g["seq"] <= half], teams),
                                "second": stats.standings([g for g in reg if g["seq"] > half], teams), "halfAt": half})
    bat, pit, arsenal, meta = stats.season_tables(reg)
    dump(d / "bat.json", {"season": int(season), "role": "bat", "players": bat})
    dump(d / "pit.json", {"season": int(season), "role": "pit", "players": pit})
    dump(d / "arsenal.json", arsenal)
    dump(d / "meta.json", meta)
    game_logs(by_kind, logs, season)
    for role, rows in (("bat", bat), ("pit", pit)):
        for r in rows:
            p = players.setdefault(r["id"], {"id": r["id"], "name": r["name"], "roles": set(), "seasons": {}})
            p["name"] = r["name"]
            p["roles"].add(role)
            p["seasons"].setdefault(season, {})[role] = {"team": r["team"], "num": r["num"], "hand": r["hand"], "splits": r["splits"]}
            if role == "pit" and r["id"] in arsenal:
                p["seasons"][season]["arsenal"] = arsenal[r["id"]]
    return teams, {"games": len(games), "regular": len(reg)}


def main(seasons):
    logs = defaultdict(lambda: defaultdict(lambda: {"bat": [], "pit": []}))
    players, teams, info = {}, {}, {}
    for s in seasons:
        fetch.fetch(s)
        r = build_season(s, logs, players)
        if r:
            for tid, name in r[0].items():
                teams[tid] = name  # latest season's name wins
            info[s] = r[1]
    for p in players.values():  # primary role first: the one with more plate appearances faced / taken
        vol = {r: sum(s[r]["splits"]["all"].get("PA" if r == "bat" else "BF", 0) for s in p["seasons"].values() if r in s) for r in p["roles"]}
        p["roles"] = sorted(p["roles"], key=lambda r: -vol[r])
    for pid, p in players.items():
        lg = {y: {r: sorted(v, key=lambda x: x["date"]) for r, v in d.items()} for y, d in logs.get(pid, {}).items()}
        dump(OUT / "players" / f"{pid}.json", {**p, "logs": lg})
    index = []
    for pid, p in players.items():
        ys = sorted(p["seasons"])
        last = p["seasons"][ys[-1]]
        team = (last.get(p["roles"][0]) or next(iter(last.values())))["team"]
        index.append({"id": pid, "n": p["name"], "r": p["roles"], "t": team, "y": [int(ys[0]), int(ys[-1])]})
    dump(OUT / "players-index.json", index)
    dump(OUT / "index.json", {"seasons": sorted(int(s) for s in info), "teams": teams, "info": info,
                              "source": "野球革命 rebas.tw open data (ODC-By)"})


if __name__ == "__main__":
    main(list(fetch.sources()["seasons"]))
