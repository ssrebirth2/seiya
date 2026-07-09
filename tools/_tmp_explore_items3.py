import re
from pathlib import Path

LUA = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig")


def load_s(path):
    txt = path.read_text(encoding="utf-8")
    m = re.search(r"local S=\{(.+?)\}\n", txt)
    d = {}
    for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1)):
        d[k] = int(v)
    for k, v in re.findall(r"(b_\d+)=(true|false)", m.group(1)):
        d[k] = v == "true"
    return d


def resolve(token, smap):
    token = token.strip()
    m = re.match(r"S\.(n_\d+|b_\d+)", token)
    return smap.get(m.group(1), token) if m else token


item_s = load_s(LUA / "game/item/ItemConfig.lua")
area_s = load_s(LUA / "game/areaformat/AreaKeyConfig.lua")
level_s = load_s(LUA / "game/level/LevelConfig.lua")
explore_txt = (LUA / "game/level/LevelExploreConditionConfig.lua").read_text(encoding="utf-8")
explore_s = load_s(LUA / "game/level/LevelExploreConditionConfig.lua")
lang_pt = (LUA / "language/LanguagePackage_PT.lua").read_text(encoding="utf-8")

# skill names for time conditions
skill_names = {}
for m in re.finditer(r'\["(LC_SKILL_skill_name_\d+)"\]= "([^"]+)"', lang_pt):
    skill_names[m.group(1)] = m.group(2)

item_map = {
    10039: "n_48",
    10040: "n_49",
    10041: "n_50",
    10042: "n_51",
    10043: "n_52",
}

print("=== ITEM -> AREA KEY ===")
for iid, ref in item_map.items():
    ak = item_s[ref]
    print(f"{iid}: areaKey {ak}")

# parse area key t_100 template
area_txt = (LUA / "game/areaformat/AreaKeyConfig.lua").read_text(encoding="utf-8")
t100 = re.search(r"t_100=\{([^\}]+)\}", area_txt)
if t100:
    parts = [resolve(x, area_s) for x in t100.group(1).split(",")]
    print(f"\nAreaKey t_100 template: {parts}")

print("\n=== AREA KEY 10221-10234 entries ===")
for ak in [10221, 10230, 10231, 10232, 10234]:
    m = re.search(rf"\[{ak}\]=\{{([^}}]+)\}}", area_txt)
    if m:
        print(f"  {ak}: {m.group(1)}")

# Find explore conditions where contion includes level ids 10040-10043
# Parse all condition rows properly
print("\n=== EXPLORE CONDITIONS for levels 10040-10043 ===")
t_block = re.search(r"local T=\{([\s\S]*?)\}\nreturn", explore_txt).group(1)
tmap = {}
for tm in re.finditer(r"(t_\d+)=\{([^\}]+)\}", t_block):
    levels = [resolve(x, explore_s) for x in tm.group(2).split(",")]
    tmap[tm.group(1)] = levels

TARGET = {10040, 10041, 10042, 10043}

for m in re.finditer(r"\[(\d+)\]=\{([^}]+)\}", explore_txt):
    cid = int(m.group(1))
    parts = [p.strip() for p in m.group(2).split(",")]
    if len(parts) < 4:
        continue
    levels = tmap.get(parts[2], [])
    if not levels and parts[2].startswith("{"):
        levels = [resolve(x, explore_s) for x in parts[2].strip("{}").split(",") if x.strip()]
    if not any(l in TARGET for l in levels if isinstance(l, int)):
        continue
    ctype = resolve(parts[1], explore_s)
    des = resolve(parts[3], explore_s)
    skill = resolve(parts[4], explore_s) if len(parts) > 4 else None
    skill_key = f"LC_SKILL_skill_name_{skill}" if isinstance(skill, int) else None
    print(f"  cond {cid}: type={ctype} levels={levels}")
    print(f"    des={des} skill={skill} ({skill_names.get(skill_key, '?')})")

# Level 10039 - check 100390
print("\n=== LEVEL 100390 (possible 10039 node) ===")
level_txt = (LUA / "game/level/LevelConfig.lua").read_text(encoding="utf-8")
m = re.search(r"\[100390\]=\{([^}]+)\}", level_txt)
if m:
    parts = [p.strip() for p in m.group(1).split(",")]
    print("  parts:", [resolve(p, level_s) for p in parts[:8]])

# grep skill ids 148-154 in explore config (from earlier reading)
for sid in [148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163]:
    key = f"LC_SKILL_skill_name_{sid}"
    if key in skill_names:
        print(f"  skill {sid}: {skill_names[key]}")
