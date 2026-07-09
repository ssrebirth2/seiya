import re
from pathlib import Path

LUA = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig")


def load_s(path):
    txt = path.read_text(encoding="utf-8")
    m = re.search(r"local S=\{(.+?)\}\n", txt)
    d = {}
    for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1)):
        d[k] = int(v)
    for k, v in re.findall(r'(s_\d+)="([^"]+)"', m.group(1)):
        d[k] = v
    return d


def resolve(token, smap):
    token = token.strip()
    if token == "nil":
        return None
    if re.fullmatch(r"-?\d+", token):
        return int(token)
    m = re.match(r"S\.(n_\d+|s_\d+)", token)
    if m:
        return smap.get(m.group(1), token)
    return token


def extract_rows(txt):
    rows = []
    for m in re.finditer(r"\[(\d+)\]=\{", txt):
        eid = int(m.group(1))
        i = m.end()
        depth = 1
        start = i
        while i < len(txt) and depth > 0:
            if txt[i] == "{":
                depth += 1
            elif txt[i] == "}":
                depth -= 1
            i += 1
        rows.append((eid, txt[start : i - 1]))
    return rows


sh_txt = (LUA / "game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
sh_s = load_s(LUA / "game/scene/StrongHoldConfig.lua")
level_s = load_s(LUA / "game/level/LevelConfig.lua")

TARGET = set(range(10039, 10044))

print("=== STRONGHOLDS with duplicate_list containing target levels ===")
for eid, body in extract_rows(sh_txt):
    if "10039" in body or "10040" in body or "10041" in body or "10042" in body or "10043" in body:
        # only if in duplicate_list context - check raw
        hits = [x for x in TARGET if str(x) in body]
        if hits:
            name = re.search(r'"(LC_stronghold_name_\d+)"', body)
            dup = re.search(r"duplicate_list[^}]*\{([^}]*)\}", body)
            res = re.search(r"resources[^}]*(\{[^}]*\})", body)
            print(f"  SH {eid} {name.group(1) if name else ''}: hits={hits}")
            if dup:
                print(f"    duplicate_list: {dup.group(1)[:200]}")

print("\n=== ALL strongholds with resources field ===")
for eid, body in extract_rows(sh_txt):
    if "resources" in body and "sid" not in body:
        # find {num,sid,type} patterns
        pass
    chunks = re.findall(r"\{(\d+),(\d+),\"([^\"]+)\"\}", body)
    for num, sid, typ in chunks:
        if int(sid) in TARGET:
            name = re.search(r'"(LC_stronghold_name_\d+)"', body)
            print(f"  SH {eid} {name.group(1) if name else ''}: resource item {sid} x{num} type={typ}")

# Chapter config linking?
ch_txt = (LUA / "game/chapter/ChapterConfig.lua").read_text(encoding="utf-8") if (LUA / "game/chapter/ChapterConfig.lua").exists() else ""
if ch_txt:
    print("\n=== CHAPTER duplicate lists with target ===")
    for eid, body in extract_rows(ch_txt):
        if any(str(x) in body for x in TARGET):
            hits = [x for x in TARGET if str(x) in body]
            print(f"  chapter {eid}: {hits}")

# Item get_path from ItemConfig - field uses same id repeated 5x + bool
item_txt = (LUA / "game/item/ItemConfig.lua").read_text(encoding="utf-8")
item_s = load_s(LUA / "game/item/ItemConfig.lua")
area_txt = (LUA / "game/areaformat/AreaKeyConfig.lua").read_text(encoding="utf-8")
area_s = load_s(LUA / "game/areaformat/AreaKeyConfig.lua")

print("\n=== ITEM get_path area keys ===")
for iid in sorted(TARGET):
    m = re.search(rf"\[{iid}\]=\{{([^}}]+)\}}", item_txt)
    if not m:
        continue
    gp = re.search(r"\{([^}]+)\},S\.n_5,", m.group(1))
    if gp:
        keys = [resolve(x, item_s) for x in gp.group(1).split(",")]
        print(f"  item {iid}: areaKeyIds={keys}")
        for ak in keys:
            if isinstance(ak, int):
                am = re.search(rf"\[{ak}\]=\{{([^}}]+)\}}", area_txt)
                if am:
                    tref = re.search(r"(T\.t_\d+)", am.group(1))
                    print(f"    areaKey {ak}: template={tref.group(1) if tref else 'none'} body={am.group(1)[:120]}")
