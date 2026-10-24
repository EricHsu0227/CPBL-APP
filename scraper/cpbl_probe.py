"""Probe the CPBL official site (www.cpbl.com.tw) and save the raw responses, so the 2026 scraper can be written against real data.

Run it on a computer in Taiwan (the site blocks cloud IPs and, since 2026-06, runs a JavaScript anti-bot check, so a real
browser window is used):

    pip install playwright && playwright install chromium
    python scraper/cpbl_probe.py            # opens a browser window; leave it alone until it finishes (a few minutes)

Output goes to scraper/out/probe/ (schedule responses, a few box/getlive responses, summary.json). It makes ~15 requests,
spaced out, and reads only public pages. Nothing is logged in or posted.
"""
import json, pathlib, re, sys, time
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

BASE = "https://www.cpbl.com.tw"
YEAR = 2026
TOKEN_RE = re.compile(r"RequestVerificationToken:\s*'([^']+)'")
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out" / "probe"
PROFILE = HERE / "out" / "profile"  # kept between runs: the site treats a returning browser better than a new one
KINDS = ["A", "B", "C", "D", "E", "F", "G"]  # one-army regular season is A; the post-season codes are what we want to find out

_JS_POST = """async ({path, headers, body}) => {
  try {
    const r = await fetch(path, { method: 'POST', headers, body, credentials: 'include' });
    return { status: r.status, text: await r.text() };
  } catch (e) { return { status: -1, text: String(e) }; }
}"""


class Site:
    def __init__(self, ctx):
        self.page = ctx.new_page()
        self.log = []

    def html(self, path, need=None, tries=4):
        """Open a page, retrying (with growing pauses) while the anti-bot page is shown instead of the real one."""
        for i in range(tries):
            try:
                resp = self.page.goto(BASE + path, wait_until="domcontentloaded", timeout=60000)
                self.page.wait_for_timeout(2500)
                text = self.page.content()
                status = resp.status if resp else None
            except Exception as e:  # noqa: BLE001 — challenge redirects raise
                text, status = "", f"error: {e}"[:200]
            ok = bool(text) and (need is None or need.search(text))
            self.log.append({"page": path, "try": i + 1, "status": status, "ok": bool(ok), "bytes": len(text)})
            if ok:
                return text
            time.sleep(3 * (i + 1) ** 2)
        return None

    def post(self, page_path, path, form, token, tries=3):
        for i in range(tries):
            r = self.page.evaluate(_JS_POST, {
                "path": path, "body": urlencode(form),
                "headers": {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "RequestVerificationToken": token,
                            "X-Requested-With": "XMLHttpRequest"}})
            self.log.append({"post": path, "form": form, "try": i + 1, "status": r["status"], "bytes": len(r["text"])})
            if r["status"] == 200:
                return r["text"]
            time.sleep(4 * (i + 1))
        return None


def token_of(site, path):
    html = site.html(path, TOKEN_RE)
    m = TOKEN_RE.search(html or "")
    return m.group(1) if m else None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PROFILE.mkdir(parents=True, exist_ok=True)
    summary = {"year": YEAR, "kinds": {}, "box": {}}
    with sync_playwright() as p:
        opts = dict(user_data_dir=str(PROFILE), headless=False, locale="zh-TW", timezone_id="Asia/Taipei", viewport={"width": 1280, "height": 900})
        try:
            ctx = p.chromium.launch_persistent_context(channel="chrome", **opts)  # the real Chrome when installed
        except Exception:  # noqa: BLE001
            ctx = p.chromium.launch_persistent_context(**opts)
        site = Site(ctx)
        tok = token_of(site, "/schedule")
        summary["schedule_token_found"] = bool(tok)
        if not tok:
            print("Could not get past the site's anti-bot check. Wait ~20 minutes and run again.")
        games = {}
        for kind in KINDS if tok else []:
            text = site.post("/schedule", "/schedule/getgamedatas", {"calendar": f"{YEAR}/01/01", "location": "", "kindCode": kind}, tok)
            if text is None:
                summary["kinds"][kind] = {"error": "no 200 response"}
                continue
            (OUT / f"schedule-{kind}.json").write_text(text, encoding="utf-8")
            try:
                data = json.loads(json.loads(text)["GameDatas"])
            except Exception as e:  # noqa: BLE001
                summary["kinds"][kind] = {"error": f"unparsable: {e}"[:200]}
                continue
            done = [g for g in data if g.get("WinningPitcherName") or (g.get("HomeScore") or g.get("VisitingScore"))]
            games[kind] = done
            summary["kinds"][kind] = {"games": len(data), "with_result": len(done), "keys": sorted(data[0]) if data else []}
            time.sleep(2)
        # box/getlive for a few finished games: first and last of the regular season, plus one post-season game if any
        picks = []
        for kind, done in games.items():
            if done:
                picks += [(kind, done[0]), (kind, done[-1])] if kind == "A" else [(kind, done[-1])]
        for kind, g in picks[:4]:
            sno = g["GameSno"]
            box = f"/box?year={YEAR}&kindCode={kind}&gameSno={sno}"
            btok = token_of(site, box) or tok
            text = site.post(box, "/box/getlive", {"GameSno": str(sno), "Year": str(YEAR), "KindCode": kind}, btok)
            key = f"{kind}-{sno}"
            if text is None:
                summary["box"][key] = {"error": "no 200 response"}
                continue
            (OUT / f"getlive-{key}.json").write_text(text, encoding="utf-8")
            try:
                j = json.loads(text)
                summary["box"][key] = {"keys": sorted(j), "sizes": {k: len(v) if isinstance(v, str) else None for k, v in j.items()}}
            except Exception as e:  # noqa: BLE001
                summary["box"][key] = {"error": f"unparsable: {e}"[:200]}
            time.sleep(3)
        summary["requests"] = site.log
        ctx.close()
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in summary.items() if k != "requests"}, ensure_ascii=False, indent=1))
    print(f"\nSaved to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
