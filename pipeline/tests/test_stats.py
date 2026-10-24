"""python pipeline/tests/test_stats.py — checks the stat math on a hand-made game."""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import fetch, history, stats


def pa(batter, pitcher, result, bh="R", ph="R", re24="0", wpa="0", codes=("B", "H"), traj="", rbi=0):
    evs = [{"type": "PITCH", "pitchCode": c, "pitcherName": pitcher, "pitchType": "FF", "velocity": "145", "coordX": "0", "coordY": "0"} for c in codes]
    return {"batterName": batter, "batterHand": bh, "pitcherName": pitcher, "pitcherHand": ph, "result": result, "RE24": re24, "WPA": wpa,
            "trajectory": traj, "hardness": "", "RBI": rbi, "events": evs}


def box(pid, name, **k):
    return {"playerId": pid, "playerName": name, "playerNumber": "1", "order": 1, **k}


def game(seq, away_runs, home_runs, away_pas, home_pas):
    return {"seq": seq, "date": f"2025-04-{seq:02d} 18:35", "awayTeamId": "A", "awayTeam": "A隊", "homeTeamId": "H", "homeTeam": "H隊",
            "awayScores": [str(away_runs)] + ["0"] * 8, "homeScores": [str(home_runs)] + ["0"] * 8,
            "awayBatterBox": [box("a1", "甲", R=away_runs)], "homeBatterBox": [box("h1", "乙", R=home_runs)],
            "awayPitcherBox": [box("ap", "丙", IPOuts=27, BF=4, H=1, HR=1, BB=0, IBB=0, HB=0, SO=1, R=1, ER=1)],
            "homePitcherBox": [box("hp", "丁", IPOuts=24, BF=4, H=2, HR=0, BB=1, IBB=0, HB=0, SO=1, R=0, ER=0)],
            "awayPAList": away_pas, "homePAList": home_pas}


def test():
    g = game(1, 2, 1,
             [pa("甲", "丁", "1B", ph="L", re24="0.5", traj="L"), pa("甲", "丁", "2B", re24="0.8", traj="F", codes=("SW", "H")),
              pa("甲", "丁", "uBB", re24="0.3", codes=("B", "B", "B", "B")), pa("甲", "丁", "SO", re24="-0.3", codes=("S", "SW", "SW")), pa("甲", "丁", "")],
             [pa("乙", "丙", "HR", re24="1.4", traj="F"), pa("乙", "丙", "GO", re24="-0.25", traj="G"), pa("乙", "丙", "SF", re24="-0.1", traj="F"), pa("乙", "丙", "SO", re24="-0.3", codes=("S", "S", "SW"))])
    bat, pit, ars, meta = stats.season_tables([g])
    a = next(r for r in bat if r["id"] == "a1")["splits"]
    assert a["all"]["PA"] == 4 and a["all"]["AB"] == 3 and a["all"]["H"] == 2, a["all"]  # empty result is not a PA
    assert abs(a["all"]["AVG"] - 2 / 3) < 1e-3 and abs(a["all"]["OBP"] - 3 / 4) < 1e-3 and abs(a["all"]["SLG"] - 1) < 1e-3
    assert a["vsL"]["PA"] == 1 and a["vsR"]["PA"] == 3
    assert a["all"]["Whiff%"] == 0.5, a["all"]  # 3 whiffs / 6 swings (pitches of a non-PA still count)
    b = next(r for r in bat if r["id"] == "h1")["splits"]["all"]
    assert b["AB"] == 3 and b["SF"] == 1 and abs(b["OBP"] - 1 / 4) < 1e-3
    p = next(r for r in pit if r["id"] == "hp")["splits"]["all"]
    assert p["IP"] == 8.0 and p["ERA"] == 0 and p["TBF"] == 4
    assert set(ars["hp"]) == {"FF"} and ars["hp"]["FF"]["velo"] == 145
    st = stats.standings([g, game(2, 0, 0, [], []), game(3, 0, 5, [], [])], {"A": "A隊", "H": "H隊"})
    top = st[0]
    assert (top["id"], top["W"], top["L"], top["T"], top["pct"]) == ("H", 1, 1, 1, 0.5) or (top["id"], top["W"], top["L"], top["T"]) == ("A", 1, 1, 1)
    assert all(r["T"] == 1 and r["GB"] == 0 for r in st)
    assert stats.ip_str(20) == 6.2
    rel = [{"tag_name": "v0.1.0-2023.0", "assets": [{"name": "CPBL-2023-G1-G150-OpenData.zip"}, {"name": "CPBL-2023-G1-G150-OpenData.rar"}]},
           {"tag_name": "v0.1.0-2023.1", "assets": [{"name": "CPBL-2023-G151-G300-OpenData.zip"}, {"name": "CPBL-2023-TaiwanSeries-OpenData.zip"}, {"name": "CPBL-2023-Challenge-OpenData.zip"}]}]
    assert fetch.group(rel) == {"2023": {"challenge": ["v0.1.0-2023.1/CPBL-2023-Challenge-OpenData.zip"],
                                         "regular": ["v0.1.0-2023.0/CPBL-2023-G1-G150-OpenData.zip", "v0.1.0-2023.1/CPBL-2023-G151-G300-OpenData.zip"],
                                         "taiwan": ["v0.1.0-2023.1/CPBL-2023-TaiwanSeries-OpenData.zip"]}}
    assert history.outs("58.1") == 175 and history.outs("0.2") == 2 and history.fid("ACC") == "HCHks"
    r = lambda i, team, name: {"id": i, "team": team, "name": name}
    m = history.match({2023: [r("r1", "HCHks", "甲"), r("r2", "hThSB", "乙"), r("r3", "hThSB", "乙")]},
                      {2023: [r("h1", "HCHks", "甲"), r("h2", "hThSB", "乙")]})
    assert m == {"r1": "h1"}, m  # r2/r3 share a name on one team: ambiguous, skipped
    row = history.pit_row("p", {"_name": "丙", "_teams": {"ACN": 30}, "IP": 30, "ER": 3, "H": 8, "BB": 2, "SO": 9, "HR": 1, "IBB": 0, "HBP": 0, "BF": 40,
                                "G": 1, "GS": 1, "W": 1, "L": 0, "SV": 0, "HLD": 0, "R": 3, "GR": 0, "CG": 0, "SHO": 0, "NP": 0, "WP": 0, "BK": 0, "GO": 0, "FO": 0},
                         {}, {"era": 3.0, "cfip": 3.1})["splits"]["all"]
    assert row["IP"] == 10.0 and row["ERA"] == 2.7 and row["W"] == 1 and "NP" not in row, row
    print("ok")


if __name__ == "__main__":
    test()
