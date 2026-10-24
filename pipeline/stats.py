"""Season stats from 野球革命 game files: batting / pitching lines (all, vs L, vs R), pitch arsenals, standings."""
from collections import defaultdict

HITS = {"1B": 1, "2B": 2, "3B": 3, "HR": 4, "IHR": 4}
WALKS = {"uBB", "IBB"}
NOT_AB = WALKS | {"HBP", "SH", "SH_E", "SH_FC", "SF", "SF_E", "IH", "ID"}
SWING = {"SW", "F", "FT", "H", "BUNT", "FOUL_BUNT", "TRY_BUNT"}
WHIFF = {"SW", "TRY_BUNT"}
TRAJ = {"G": "GB", "L": "LD", "F": "FB", "P": "PU"}
# Zone: coords are in ~0.5 cm units from the zone centre; width (plate + half a ball each side) = 100, height = 120.
ZONE_X, ZONE_Y = 50, 60


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def is_pa(pa):
    return pa.get("result") not in (None, "", "IGNORE")


def in_zone(ev):
    x, y = num(ev.get("coordX")), num(ev.get("coordY"))
    if x is None or y is None:
        return None
    return abs(x) <= ZONE_X and abs(y) <= ZONE_Y


def name_ids(box):
    """name -> playerId inside one team's box (first one wins on a duplicate name)."""
    out = {}
    for b in box:
        out.setdefault(b["playerName"], b["playerId"])
    return out


def sides(g):
    """(batting side, fielding side) pairs: away bats against home pitchers and vice versa."""
    return (("away", "home"), ("home", "away"))


class Line(defaultdict):
    def __init__(self):
        super().__init__(float)


def add_pa(line, pa, pitcher_view=False):
    r = pa["result"]
    line["PA"] += 1
    if r not in NOT_AB:
        line["AB"] += 1
    if r in HITS:
        line["H"] += 1
        line["TB"] += HITS[r]
        line[{1: "1B", 2: "2B", 3: "3B", 4: "HR"}[HITS[r]]] += 1
    if r in WALKS:
        line["BB"] += 1
    if r == "IBB":
        line["IBB"] += 1
    if r == "HBP":
        line["HBP"] += 1
    if r == "SO":
        line["SO"] += 1
    if r in ("SF", "SF_E"):
        line["SF"] += 1
    if r in ("SH", "SH_E", "SH_FC"):
        line["SH"] += 1
    if r.startswith("GIDP"):
        line["GIDP"] += 1
    line["RBI"] += pa.get("RBI") or 0
    t = TRAJ.get(pa.get("trajectory") or "")
    if t:
        line["BIP"] += 1
        line[t] += 1
    h = pa.get("hardness") or ""
    if h:
        line["BIPh"] += 1
        line["hard_" + h] += 1
    sign = -1 if pitcher_view else 1
    line["WPA"] += sign * (num(pa.get("WPA")) or 0)
    line["RE24"] += sign * (num(pa.get("RE24")) or 0)
    line["rv_" + r] += 1  # result counts for wOBA


def add_pitch(line, ev):
    c = ev.get("pitchCode")
    if not c:
        return
    line["Pitches"] += 1
    z = in_zone(ev)
    sw = c in SWING
    if sw:
        line["Swings"] += 1
    if c in WHIFF:
        line["Whiffs"] += 1
    if c in ("S", "SW"):
        line["CSW"] += 1
    if z is not None:
        line["Located"] += 1
        if z:
            line["InZone"] += 1
            line["ZSwings"] += sw
            line["ZContact"] += sw and c not in WHIFF
        else:
            line["OSwings"] += sw


def weights(pas):
    """League linear weights from the data's RE24: mean run value of each result minus that of an out,
    scaled so league wOBA equals league OBP (the usual wOBA construction)."""
    rv, n = defaultdict(float), defaultdict(int)
    for pa in pas:
        key = event_class(pa["result"])
        if key:
            rv[key] += num(pa.get("RE24")) or 0
            n[key] += 1
    mean = {k: rv[k] / n[k] for k in n}
    out = mean.get("out", 0)
    raw = {k: mean.get(k, out) - out for k in ("BB", "HBP", "1B", "2B", "3B", "HR")}
    lg = Line()
    for pa in pas:
        add_pa(lg, pa)
    obp = (lg["H"] + lg["BB"] + lg["HBP"]) / max(lg["AB"] + lg["BB"] + lg["HBP"] + lg["SF"], 1)
    raw_woba = woba_raw(lg, raw)
    scale = obp / raw_woba if raw_woba else 1
    return {"w": {k: v * scale for k, v in raw.items()}, "scale": scale, "woba": obp}


def event_class(r):
    if r in ("uBB",):
        return "BB"
    if r == "HBP":
        return "HBP"
    if r in HITS:
        return {1: "1B", 2: "2B", 3: "3B", 4: "HR"}[HITS[r]]
    if r in ("SO", "GO", "FO", "FC", "GIDP", "DP", "TP", "SF", "SH"):
        return "out"
    return None


def woba_raw(l, w):
    den = l["AB"] + l["BB"] - l["IBB"] + l["SF"] + l["HBP"]
    if not den:
        return None
    ubb = l["BB"] - l["IBB"]
    return (w["BB"] * ubb + w["HBP"] * l["HBP"] + w["1B"] * l["1B"] + w["2B"] * l["2B"] + w["3B"] * l["3B"] + w["HR"] * l["HR"]) / den


def div(a, b):
    return a / b if b else None


def bat_rates(l, lw, lg_r_pa):
    ab, pa = l["AB"], l["PA"]
    obp = div(l["H"] + l["BB"] + l["HBP"], ab + l["BB"] + l["HBP"] + l["SF"])
    avg, slg = div(l["H"], ab), div(l["TB"], ab)
    woba = woba_raw(l, lw["w"])
    out = {
        "AVG": avg, "OBP": obp, "SLG": slg, "OPS": None if obp is None or slg is None else obp + slg,
        "ISO": None if slg is None else slg - avg, "BABIP": div(l["H"] - l["HR"], ab - l["SO"] - l["HR"] + l["SF"]),
        "K%": div(l["SO"], pa), "BB%": div(l["BB"], pa), "BB/K": div(l["BB"], l["SO"]), "wOBA": woba,
    }
    if woba is not None and pa:
        wraa = (woba - lw["woba"]) / lw["scale"] * pa
        out["wRAA"] = wraa
        out["wRC+"] = 100 * (wraa / pa + lg_r_pa) / lg_r_pa if lg_r_pa else None
    for t in TRAJ.values():
        out[t + "%"] = div(l[t], l["BIP"])
    out["Hard%"], out["Mid%"], out["Soft%"] = (div(l["hard_" + h], l["BIPh"]) for h in "HMS")
    out.update(discipline(l))
    return out


def discipline(l):
    return {
        "Swing%": div(l["Swings"], l["Pitches"]), "Whiff%": div(l["Whiffs"], l["Swings"]), "CSW%": div(l["CSW"], l["Pitches"]),
        "Zone%": div(l["InZone"], l["Located"]), "Z-Swing%": div(l["ZSwings"], l["InZone"]),
        "O-Swing%": div(l["OSwings"], l["Located"] - l["InZone"]), "Z-Contact%": div(l["ZContact"], l["ZSwings"]),
        "P/PA": div(l["Pitches"], l["PA"]),
    }


COUNT_BAT = ("PA", "AB", "H", "1B", "2B", "3B", "HR", "TB", "RBI", "BB", "IBB", "HBP", "SO", "SF", "SH", "GIDP", "Pitches")


def ip_str(outs):
    return float(f"{int(outs) // 3}.{int(outs) % 3}")


def season_tables(games):
    """games: list of game dicts (regular season). Returns (bat rows, pit rows, arsenal, meta)."""
    all_pas = [pa for g in games for s in ("away", "home") for pa in g[s + "PAList"] if is_pa(pa)]
    lw = weights(all_pas)
    lg_runs = sum(int(x or 0) for g in games for s in ("away", "home") for x in g[s + "Scores"])
    lg_r_pa = lg_runs / max(len(all_pas), 1)

    bat = defaultdict(lambda: {"splits": defaultdict(Line), "box": Line(), "games": set(), "teams": [], "num": None, "hand": defaultdict(int)})
    pit = defaultdict(lambda: {"splits": defaultdict(Line), "box": Line(), "games": set(), "teams": [], "num": None, "hand": defaultdict(int)})
    ars = defaultdict(lambda: defaultdict(lambda: {"n": 0, "velo": [], **{k: 0 for k in ("swings", "whiffs", "csw", "located", "inzone")}}))
    names = {}

    for g in games:
        gid = g["seq"]
        for bs, fs in sides(g):
            team = g[bs + "TeamId"]
            ftm = g[fs + "TeamId"]
            bids, pids = name_ids(g[bs + "BatterBox"]), name_ids(g[fs + "PitcherBox"])
            for b in g[bs + "BatterBox"]:
                p = bat[b["playerId"]]
                names[b["playerId"]] = b["playerName"]
                p["games"].add(gid)
                if team not in p["teams"]:
                    p["teams"].append(team)
                p["num"] = b["playerNumber"]
                for k in ("R", "SB", "CS", "E"):
                    p["box"][k] += b.get(k) or 0
            for i, b in enumerate(g[fs + "PitcherBox"]):
                p = pit[b["playerId"]]
                names[b["playerId"]] = b["playerName"]
                p["games"].add(gid)
                if ftm not in p["teams"]:
                    p["teams"].append(ftm)
                p["num"] = b["playerNumber"]
                p["box"]["GS"] += i == 0
                for k in ("IPOuts", "NP", "BF", "H", "HR", "BB", "IBB", "HB", "SO", "R", "ER"):
                    p["box"][k] += b.get(k) or 0
            for pa in g[bs + "PAList"]:
                bid, pid = bids.get(pa["batterName"]), pids.get(pa["pitcherName"])
                sp_b = "vsL" if pa.get("pitcherHand") == "L" else "vsR"
                sp_p = "vsL" if pa.get("batterHand") == "L" else "vsR"
                if is_pa(pa):
                    if bid:
                        bat[bid]["hand"][pa.get("batterHand")] += 1
                        for sp in ("all", sp_b):
                            add_pa(bat[bid]["splits"][sp], pa)
                    if pid:
                        pit[pid]["hand"][pa.get("pitcherHand")] += 1
                        for sp in ("all", sp_p):
                            add_pa(pit[pid]["splits"][sp], pa, pitcher_view=True)
                for ev in pa.get("events") or []:
                    if ev.get("type") != "PITCH":
                        continue
                    epid = pids.get(ev.get("pitcherName")) or pid
                    if bid:
                        for sp in ("all", sp_b):
                            add_pitch(bat[bid]["splits"][sp], ev)
                    if epid:
                        for sp in ("all", sp_p):
                            add_pitch(pit[epid]["splits"][sp], ev)
                        t = ev.get("pitchType")
                        if t and ev.get("pitchCode"):
                            a = ars[epid][t]
                            a["n"] += 1
                            v = num(ev.get("velocity"))
                            if v:
                                a["velo"].append(v)
                            c = ev["pitchCode"]
                            a["swings"] += c in SWING
                            a["whiffs"] += c in WHIFF
                            a["csw"] += c in ("S", "SW")
                            z = in_zone(ev)
                            if z is not None:
                                a["located"] += 1
                                a["inzone"] += z

    # pitching constants (FIP)
    lg = Line()
    for p in pit.values():
        for k, v in p["box"].items():
            lg[k] += v
    ip = lg["IPOuts"] / 3
    fip_raw = (13 * lg["HR"] + 3 * (lg["BB"] - lg["IBB"] + lg["HB"]) - 2 * lg["SO"]) / ip if ip else 0
    c_fip = (9 * lg["ER"] / ip if ip else 0) - fip_raw

    bat_rows = []
    for pid, p in bat.items():
        splits = {}
        for sp, l in p["splits"].items():
            d = {k: l[k] for k in COUNT_BAT}
            d["WPA"], d["RE24"] = round(l["WPA"], 3), round(l["RE24"], 2)
            d.update(bat_rates(l, lw, lg_r_pa))
            if sp == "all":
                d["G"] = len(p["games"])
                d.update({k: p["box"][k] for k in ("R", "SB", "CS")})
            splits[sp] = clean(d)
        if "all" not in splits:
            splits["all"] = {"G": len(p["games"]), "PA": 0}
        bat_rows.append({"id": pid, "name": names[pid], "team": p["teams"][-1], "teams": p["teams"], "num": p["num"], "hand": hand(p["hand"]), "splits": splits})

    pit_rows, arsenal = [], {}
    for pid, p in pit.items():
        b = p["box"]
        ipp = b["IPOuts"] / 3
        allv = {"G": len(p["games"]), "GS": b["GS"], "IP": ip_str(b["IPOuts"]), "IPOuts": b["IPOuts"], "BF": b["BF"], "NP": b["NP"],
                "H": b["H"], "R": b["R"], "ER": b["ER"], "HR": b["HR"], "BB": b["BB"], "IBB": b["IBB"], "HB": b["HB"], "SO": b["SO"],
                "ERA": div(9 * b["ER"], ipp), "WHIP": div(b["BB"] + b["H"], ipp), "K/9": div(9 * b["SO"], ipp), "BB/9": div(9 * b["BB"], ipp),
                "HR/9": div(9 * b["HR"], ipp), "K/BB": div(b["SO"], b["BB"]), "K%": div(b["SO"], b["BF"]), "BB%": div(b["BB"], b["BF"]),
                "FIP": div(13 * b["HR"] + 3 * (b["BB"] - b["IBB"] + b["HB"]) - 2 * b["SO"], ipp)}
        if allv["FIP"] is not None:
            allv["FIP"] += c_fip
        if allv["K%"] is not None:
            allv["K-BB%"] = allv["K%"] - allv["BB%"]
        splits = {}
        for sp, l in p["splits"].items():
            r = bat_rates(l, lw, lg_r_pa)
            d = {"TBF": l["PA"], "Pitches": l["Pitches"], "WPA": round(l["WPA"], 3), "RE24": round(l["RE24"], 2),
                 **{k: r[k] for k in ("AVG", "OBP", "SLG", "OPS", "BABIP", "wOBA", "GB%", "LD%", "FB%", "PU%", "Hard%", "Soft%")},
                 **{k: r[k] for k in discipline(l)}}
            d["oppK%"], d["oppBB%"] = r["K%"], r["BB%"]
            if sp == "all":
                d.update(allv)
            else:
                d.update({"K%": r["K%"], "BB%": r["BB%"], "SO": l["SO"], "BB": l["BB"], "H": l["H"], "HR": l["HR"]})
            d.pop("oppK%"), d.pop("oppBB%")
            splits[sp] = clean(d)
        if "all" not in splits:
            splits["all"] = clean(allv)
        pit_rows.append({"id": pid, "name": names[pid], "team": p["teams"][-1], "teams": p["teams"], "num": p["num"], "hand": hand(p["hand"]), "splits": splits})
        tot = sum(a["n"] for a in ars[pid].values())
        if tot:
            arsenal[pid] = {t: clean({"n": a["n"], "pct": a["n"] / tot, "velo": div(sum(a["velo"]), len(a["velo"])), "max": max(a["velo"]) if a["velo"] else None,
                                      "whiff": div(a["whiffs"], a["swings"]), "csw": div(a["csw"], a["n"]), "zone": div(a["inzone"], a["located"])})
                            for t, a in sorted(ars[pid].items(), key=lambda x: -x[1]["n"])}
    meta = {"woba": {"weights": clean(lw["w"]), "scale": round(lw["scale"], 4), "lgwOBA": round(lw["woba"], 4)}, "cFIP": round(c_fip, 3), "lgR/PA": round(lg_r_pa, 4)}
    return bat_rows, pit_rows, arsenal, meta


def hand(c):
    hs = {h for h, n in c.items() if h and n}
    if not hs:
        return None
    return "S" if len(hs) > 1 and min(c[h] for h in hs) >= 3 else max(hs, key=lambda h: c[h])


def clean(d):
    return {k: (round(v, 4) if isinstance(v, float) and not v.is_integer() else (int(v) if isinstance(v, float) else v)) for k, v in d.items() if v is not None}


def runs(g, side):
    return sum(int(x or 0) for x in g[side + "Scores"])


def standings(games, teams):
    """W-L-T per team. CPBL ranks by win% = W / (W + L); ties don't count. GB = ((W1-W) + (L-L1)) / 2."""
    t = {tid: {"id": tid, "W": 0, "L": 0, "T": 0, "RS": 0, "RA": 0, "home": [0, 0, 0], "away": [0, 0, 0], "res": []} for tid in teams}
    for g in sorted(games, key=lambda g: (g["date"], g["seq"])):
        a, h = runs(g, "away"), runs(g, "home")
        for side, me, them in (("away", a, h), ("home", h, a)):
            r = t[g[side + "TeamId"]]
            r["RS"] += me
            r["RA"] += them
            k = 0 if me > them else 1 if me < them else 2
            r["WLT"[k]] += 1
            r[side][k] += 1
            r["res"].append("WLT"[k])
    rows = []
    for r in t.values():
        pct = div(r["W"], r["W"] + r["L"])
        res = r.pop("res")
        last10 = res[-10:]
        streak = ""
        if res:
            n = 0
            for x in reversed(res):
                if x != res[-1]:
                    break
                n += 1
            streak = f"{'連勝' if res[-1] == 'W' else '連敗' if res[-1] == 'L' else '和'}{n}"
        rows.append({**r, "G": r["W"] + r["L"] + r["T"], "pct": round(pct, 3) if pct is not None else None, "home": "-".join(map(str, r["home"])),
                     "away": "-".join(map(str, r["away"])), "L10": f"{last10.count('W')}-{last10.count('L')}-{last10.count('T')}", "streak": streak})
    rows.sort(key=lambda r: -(r["pct"] or 0))
    if rows:
        top = rows[0]
        for r in rows:
            r["GB"] = ((top["W"] - r["W"]) + (r["L"] - top["L"])) / 2
    return rows
