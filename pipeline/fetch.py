"""Download 野球革命 (rebas.tw) open-data release zips listed in sources.json into pipeline/cache/<season>/<kind>/.

python pipeline/fetch.py --discover   rewrite sources.json from the repo's GitHub releases (new seasons appear automatically)
python pipeline/fetch.py [2025 ...]   download (skips a kind whose asset list is already cached)

Data: https://github.com/rebas-tw/rebas.tw-open-data (ODC-By: credit 野球革命 rebas.tw)."""
import io, json, os, pathlib, re, sys, urllib.request, zipfile

HERE = pathlib.Path(__file__).resolve().parent
CACHE = HERE / "cache"
REPO = "rebas-tw/rebas.tw-open-data"


def sources():
    return json.loads((HERE / "sources.json").read_text())


def kind_of(name):
    n = name.lower()
    return "challenge" if "challenge" in n else "taiwan" if "taiwan" in n else "regular"


def discover():
    """Every .zip asset of every release, grouped by season (year in the file name) and kind."""
    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/releases?per_page=100", headers={"Accept": "application/vnd.github+json"})
    if os.environ.get("GITHUB_TOKEN"):
        req.add_header("Authorization", "Bearer " + os.environ["GITHUB_TOKEN"])
    with urllib.request.urlopen(req, timeout=60) as r:
        releases = json.load(r)
    seasons = group(releases)
    (HERE / "sources.json").write_text(json.dumps({"base": f"https://github.com/{REPO}/releases/download", "seasons": seasons}, indent=2) + "\n")
    return seasons


def group(releases):
    seasons = {}
    for rel in releases:
        for a in rel["assets"]:
            m = re.search(r"(20\d\d)", a["name"])
            if a["name"].endswith(".zip") and m:
                seasons.setdefault(m.group(1), {}).setdefault(kind_of(a["name"]), []).append(f"{rel['tag_name']}/{a['name']}")
    return {y: {k: sorted(v) for k, v in sorted(ks.items())} for y, ks in sorted(seasons.items())}


def fetch(season: str):
    src = sources()
    for kind, assets in src["seasons"][season].items():
        out = CACHE / season / kind
        stamp = out / ".assets"
        if stamp.exists() and json.loads(stamp.read_text()) == assets:
            continue
        if out.exists():
            for f in out.glob("*.json"):
                f.unlink()
        out.mkdir(parents=True, exist_ok=True)
        for a in assets:
            url = f"{src['base']}/{a}"
            print("GET", url, file=sys.stderr)
            with urllib.request.urlopen(url, timeout=600) as r:
                z = zipfile.ZipFile(io.BytesIO(r.read()))
            for info in z.infolist():
                name = pathlib.PurePosixPath(info.filename).name
                # per-game files only (the combined *-OpenData.json duplicates them)
                if name.endswith(".json") and "-G" in name and not name.endswith("OpenData.json"):
                    (out / name.split("-G")[-1]).write_bytes(z.read(info))  # -> "<seq>.json"
        stamp.write_text(json.dumps(assets))


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--discover" in args:
        print(json.dumps(discover(), indent=1))
        args.remove("--discover")
    for s in args or sources()["seasons"].keys():
        fetch(s)
