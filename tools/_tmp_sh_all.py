import re
from pathlib import Path

sh_txt = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
m = re.search(r"local S=\{(.+?)\}\nlocal T=", sh_txt, re.S)
sh_s = {k: int(v) for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1))}
for k, v in re.findall(r'(s_\d+)="([^"]+)"', m.group(1)):
    sh_s[k] = v

t_block = re.search(r"local T=\{([\s\S]*?)\}\nreturn", sh_txt).group(1)
tmap = {}
for tm in re.finditer(r"(t_\d+)=\{([^\}]+)\}", t_block):
    entries = []
    for chunk in re.finditer(r"\{([^\}]+)\}", tm.group(2)):
        parts = [p.strip() for p in chunk.group(1).split(",")]
        entries.append(parts)
    tmap[tm.group(1)] = entries


def resolve(token):
    token = token.strip()
    if re.fullmatch(r"\d+", token):
        return int(token)
    mm = re.match(r"S\.(n_\d+|s_\d+)", token)
    return sh_s.get(mm.group(1), token) if mm else token


def all_resource_sids(body):
    sids = set()
    for field in re.findall(r"\{S\.n_\d+,S\.n_\d+,S\.s_\d+\}|\{\d+,S\.n_\d+,S\.s_\d+\}|\{\d+,\d+,S\.s_\d+\}|\{S\.n_\d+,\d+,S\.s_\d+\}", body):
        parts = field.strip("{}").split(",")
        if len(parts) >= 2:
            sid = resolve(parts[1])
            if isinstance(sid, int):
                sids.add(sid)
    for tref, entries in tmap.items():
        if tref in body:
            for parts in entries:
                if len(parts) >= 2:
                    sid = resolve(parts[1])
                    if isinstance(sid, int):
                        sids.add(sid)
    return sids

TARGET = set(range(10031, 10080))
found = {}
for row in re.finditer(r"\[(\d+)\]=\{", sh_txt):
    eid = int(row.group(1))
    i = row.end()
    depth = 1
    while i < len(sh_txt) and depth > 0:
        if sh_txt[i] == "{":
            depth += 1
        elif sh_txt[i] == "}":
            depth -= 1
        i += 1
    body = sh_txt[row.end() : i - 1]
    sids = all_resource_sids(body)
    hits = sids & TARGET
    if hits:
        name = re.search(r'"(LC_stronghold_name_\d+)"', body)
        found[eid] = (name.group(1) if name else "?", sorted(hits))

print(f"Strongholds with 10031-10079 resources: {len(found)}")
for eid, (name, hits) in sorted(found.items()):
    print(f"  {eid} {name}: {hits}")

# Also grep entire luaconfig for level ids 10040 as stronghold link
level_txt = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/level/LevelConfig.lua").read_text(encoding="utf-8")
ls = {k: int(v) for k, v in re.findall(r"(n_\d+)=(\d+)", re.search(r"local S=\{(.+?)\}\n", level_txt).group(1))}
for iid in range(10039, 10044):
    m2 = re.search(rf"\[{iid}\]=\{{([^}}]+)\}}", level_txt)
    if not m2:
        print(f"level {iid}: missing")
        continue
    parts = [p.strip() for p in m2.group(1).split(",")]
    sh = resolve(parts[7], ls) if len(parts) > 7 else None
    print(f"level {iid}: stronghold field={sh}")
