#!/usr/bin/env python3
"""公開されている表(raw/ に保存した JPL・NASA のページ)から、アプリが使う数値を機械的に抜き出す。

数値を手で書き写さないための道具。出力: app/data/solar-data.js

  raw/approx_pos.html        JPL SSD  Approximate Positions of the Planets(軌道要素と変化率)
  raw/planets_phys_par.html  JPL SSD  Planetary Physical Parameters
  raw/sats_elem.html         JPL SSD  Planetary Satellite Mean Elements
  raw/sats_phys_par.html     JPL SSD  Planetary Satellite Physical Parameters
  raw/sbdb_*.json            JPL SBDB API(準惑星の接触軌道要素)
  raw/factsheet.html, fact_*.html, satringfact.html   NASA NSSDCA Planetary Fact Sheets
  raw/pck00011.tpc           NAIF 汎用 PCK(IAU の自転軸・本初子午線)
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")


def read(name):
    with open(os.path.join(RAW, name), encoding="utf-8", errors="replace") as f:
        return f.read()


def text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def num(s):
    """'12,104' '2440.53 [D] ±0.04' '-5832.5' → float"""
    m = re.search(r"-?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?|-?\.\d+", s.replace("−", "-"))
    if not m:
        return None
    return float(m.group(0).replace(",", ""))


def table_rows(page, index=None, table_id=None):
    tables = re.findall(r"<table([^>]*)>(.*?)</table>", page, re.S)
    if table_id:
        tables = [t for t in tables if table_id in t[0]]
        index = 0
    rows = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", tables[index][1], re.S):
        rows.append([text(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)])
    return rows


# ---- 1. 惑星の軌道要素(JPL: Standish の近似式) -------------------------------------
KEYS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]
pres = [html.unescape(re.sub(r"<[^>]+>", "", m)) for m in re.findall(r"<pre[^>]*>(.*?)</pre>", read("approx_pos.html"), re.S)]
assert len(pres) >= 3, "approx_pos.html の表が見つからない"


def parse_elements(pre):
    lines = [l for l in pre.split("\n") if re.search(r"\d\.\d{6}", l)]
    assert len(lines) == 16, len(lines)
    out = {}
    for i, key in enumerate(KEYS):
        a = [float(x) for x in re.findall(r"-?\d+\.\d+", lines[2 * i])]
        b = [float(x) for x in re.findall(r"-?\d+\.\d+", lines[2 * i + 1])]
        assert len(a) == 6 and len(b) == 6, (key, a, b)
        out[key] = {"a": [a[0], b[0]], "e": [a[1], b[1]], "I": [a[2], b[2]], "L": [a[3], b[3]], "peri": [a[4], b[4]], "node": [a[5], b[5]]}
    return out


el1 = parse_elements(pres[0])  # 1800 AD – 2050 AD
el2 = parse_elements(pres[1])  # 3000 BC – 3000 AD
for line in pres[2].split("\n"):
    m = re.match(r"\s*(Jupiter|Saturn|Uranus|Neptune)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)", line)
    if m:
        el2[m.group(1).lower()]["bcsf"] = [float(m.group(k)) for k in range(2, 6)]

# ---- 2. 惑星・準惑星の物理量(JPL) ----------------------------------------------------
phys = {}
for row in table_rows(read("planets_phys_par.html"), 0) + table_rows(read("planets_phys_par.html"), 1):
    if len(row) == 11 and row[0] not in ("Planet", "DwarfPlanet", ""):
        phys[row[0].lower()] = {
            "eqRadius": num(row[1]), "meanRadius": num(row[2]), "mass": num(row[3]), "density": num(row[4]),
            "rotPeriodDays": num(row[5]), "orbPeriodYears": num(row[6]), "albedo": num(row[8]), "gravity": num(row[9]), "escapeV": num(row[10]),
        }
dwarf_names = ["ceres", "pluto", "eris", "makemake", "haumea"]
for k in dwarf_names:  # 準惑星の質量は 10^18 kg 単位の表 → 10^24 kg にそろえる
    phys[k]["mass"] = phys[k]["mass"] * 1e-6

# ---- 3. NASA ファクトシート(比較表・自転軸・太陽) ------------------------------------
fs = table_rows(read("factsheet.html"), 0)
cols = [c.lower() for c in fs[0][1:]]
fact = {c: {} for c in cols}
labels = {
    "Obliquity to Orbit": "obliquity", "Mean Temperature": "meanTempC", "Number of Moons": "moons", "Length of Day": "dayHours",
    "Orbital Velocity": "orbVelocity", "Surface Pressure": "pressureBar", "Rotation Period": "rotHours",
}
for row in fs[1:]:
    for label, key in labels.items():
        if row and row[0].startswith(label):
            for c, v in zip(cols, row[1:]):
                fact[c][key] = num(v)

poles = {}
for name in KEYS + ["pluto", "sun"]:
    t = text(read(f"fact_{name}.html"))
    ra = re.search(r"Right Ascension\s*:\s*(-?[\d.]+)(?:\s*([-+])\s*([\d.]+)\s*T)?", t)
    de = re.search(r"Declination\s*:\s*(-?[\d.]+)(?:\s*([-+])\s*([\d.]+)\s*T)?", t)
    assert ra and de, name
    rate = lambda m: (float(m.group(3)) * (-1 if m.group(2) == "-" else 1)) if m.group(3) else 0.0
    poles[name] = {"ra": [float(ra.group(1)), rate(ra)], "dec": [float(de.group(1)), rate(de)]}

sun_t = text(read("fact_sun.html"))
sun = {
    "meanRadius": num(re.search(r"Volumetric mean radius \(km\)\s+([\d,.]+)", sun_t).group(1)),
    "mass": num(re.search(r"Mass \(10\s*24 kg\)\s+([\d,.]+)", sun_t).group(1)),
    "rotHours": num(re.search(r"Sidereal rotation period \(hrs\)\*?\s+([\d,.]+)", sun_t).group(1)),
    "obliquityToEcliptic": num(re.search(r"Obliquity to ecliptic \(deg\.?\)\s+([\d,.]+)", sun_t).group(1)),
    "pole": poles["sun"],
}
teff = re.search(r"Effective temperature \(K\)\s+([\d,.]+)", sun_t)
if teff:
    sun["effTempK"] = num(teff.group(1))

# ---- 4. 衛星(JPL: 平均軌道要素と物理量) ----------------------------------------------
WANT = {
    301: "moon", 401: "phobos", 402: "deimos", 501: "io", 502: "europa", 503: "ganymede", 504: "callisto",
    601: "mimas", 602: "enceladus", 603: "tethys", 604: "dione", 605: "rhea", 606: "titan", 608: "iapetus",
    701: "ariel", 702: "umbriel", 703: "titania", 704: "oberon", 705: "miranda", 801: "triton", 901: "charon",
}
sat_phys = {}
for row in table_rows(read("sats_phys_par.html"), 0):
    if len(row) >= 6 and row[2].isdigit():
        gm = row[3].split()
        rad = row[4].split()
        den = row[5].split()
        val = lambda parts: float(parts[0]) if parts and re.match(r"[\d.]+$", parts[0]) else None
        sat_phys[int(row[2])] = {"gm": val(gm), "meanRadius": val(rad), "density": val(den)}
planet_gm = {}
for row in table_rows(read("sats_phys_par.html"), 1):
    if len(row) == 3 and row[0] != "Planet":
        planet_gm[row[0].lower()] = num(row[1])

moons = []
seen = set()
for row in table_rows(read("sats_elem.html"), table_id="sat_elem"):
    if len(row) < 19 or not row[3].isdigit():
        continue
    code = int(row[3])
    if code not in WANT or code in seen:
        continue
    seen.add(code)
    f = lambda i: num(row[i])
    moons.append({
        "id": WANT[code], "code": code, "parent": row[1].lower(), "name": row[2], "ephemeris": row[4], "frame": row[5].lower(), "epoch": row[6],
        "a": f(7), "e": f(8), "w": f(9), "M": f(10), "i": f(11), "node": f(12), "P": f(13), "Pw": f(14), "Pnode": f(15),
        "poleRA": f(16), "poleDec": f(17), "tilt": f(18),
        **sat_phys.get(code, {}),
    })
moons.sort(key=lambda m: m["code"])
missing = set(WANT) - seen
assert not missing, f"衛星が表に無い: {missing}"

# ---- 5. 準惑星(JPL SBDB の接触軌道要素) ----------------------------------------------
SBDB = {"pluto": 134340, "ceres": 1, "eris": 136199, "haumea": 136108, "makemake": 136472}
dwarfs = []
for key, ident in SBDB.items():
    d = json.load(open(os.path.join(RAW, f"sbdb_{ident}.json")))
    el = {e["name"]: float(e["value"]) for e in d["orbit"]["elements"]}
    dwarfs.append({
        "id": key, "fullname": d["object"]["fullname"].strip(), "epochJD": float(d["orbit"]["epoch"]),
        "a": el["a"], "e": el["e"], "i": el["i"], "node": el["om"], "w": el["w"], "M": el["ma"], "n": el["n"],
        "phys": phys[key],
    })

# ---- 6. 土星の環(NASA ファクトシートの半径 km) ----------------------------------------
ring_t = text(read("satringfact.html"))
ring = {}
for label, key in [("D inner edge", "dIn"), ("C inner edge", "cIn"), ("B inner edge", "bIn"), ("B outer edge", "bOut"), ("A inner edge", "aIn"),
                   ("Encke gap", "encke"), ("Keeler gap", "keeler"), ("A outer edge", "aOut"), ("F ring", "f")]:
    m = re.search(re.escape(label) + r"\s+([\d,]+)", ring_t)
    assert m, label
    ring[key] = num(m.group(1))

# ---- 7. 自転モデル(NAIF PCK: IAU の自転軸と本初子午線) --------------------------------
# W = W0 + Wdot * d(度、d は J2000 からの日数)。α0, δ0 は T(世紀)の 1 次式。
pck = read("pck00011.tpc")
NAIF = {"sun": 10, "mercury": 199, "venus": 299, "earth": 399, "mars": 499, "jupiter": 599, "saturn": 699, "uranus": 799, "neptune": 899, "pluto": 999}
rot = {}
for key, code in NAIF.items():
    def last(kind):
        ms = re.findall(r"BODY%d_%s\s*=\s*\(([^)]*)\)" % (code, kind), pck)
        assert ms, (key, kind)
        return [float(x.replace("D", "E")) for x in ms[-1].split()][:2]
    rot[key] = {"ra": last("POLE_RA"), "dec": last("POLE_DEC"), "pm": last("PM")}

# 火星だけは IAU 2015 の周期項のうち振幅の大きい長周期項(事実上の定数)を足す必要がある
def pck_list(name):
    m = re.findall(r"%s\s*=\s*\(([^)]*)\)" % name, pck)
    return [float(x.replace("D", "E")) for x in m[-1].split()]
angles = pck_list("BODY4_NUT_PREC_ANGLES")
def big_term(kind):
    coef = pck_list("BODY499_NUT_PREC_" + kind)
    i = max(range(len(coef)), key=lambda k: abs(coef[k]))
    return {"amp": coef[i], "angle": [angles[3 * i], angles[3 * i + 1]]}
rot["mars"]["extra"] = {"ra": big_term("RA"), "dec": big_term("DEC"), "pm": big_term("PM")}

data = {
    "generatedFrom": {
        "rotation": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc",
        "elements": "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
        "planetPhys": "https://ssd.jpl.nasa.gov/planets/phys_par.html",
        "satElements": "https://ssd.jpl.nasa.gov/sats/elem/",
        "satPhys": "https://ssd.jpl.nasa.gov/sats/phys_par/",
        "dwarfElements": "https://ssd-api.jpl.nasa.gov/sbdb.api",
        "factSheets": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
        "retrieved": "2026-11-11",
    },
    "planets": {k: {"el1": el1[k], "el2": el2[k], "phys": phys[k], "fact": fact[k], "pole": poles[k]} for k in KEYS},
    "sun": sun,
    "moons": moons,
    "moonFact": fact["moon"],
    "planetGM": planet_gm,
    "dwarfs": dwarfs,
    "plutoPole": poles["pluto"],
    "plutoFact": fact["pluto"],
    "saturnRings": ring,
    "rotation": rot,
}
out = os.path.join(ROOT, "app", "data", "solar-data.js")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write("// 生成物: tools/build_data.py が JPL / NASA の公開表から抜き出した数値。手で編集しない。\n")
    f.write("export const DATA = ")
    json.dump(data, f, ensure_ascii=False, indent=1)
    f.write(";\n")

print("planets:", {k: (el1[k]["a"][0], phys[k]["meanRadius"], fact[k].get("obliquity")) for k in KEYS})
print("poles:", poles)
print("sun:", sun)
print("moons:", [(m["id"], m["parent"], m["frame"], m["a"], m["P"], m.get("meanRadius")) for m in moons])
print("dwarfs:", [(d["id"], d["epochJD"], round(d["a"], 3), d["phys"]["meanRadius"]) for d in dwarfs])
print("rings:", ring, "| planetGM:", planet_gm)
print("rotation:", rot)
print("wrote", out, os.path.getsize(out), "bytes")
