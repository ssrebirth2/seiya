import re
from pathlib import Path

LUA = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig")
sh_txt = (LUA / "game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
m = re.search(r"local S=\{(.+?)\}\nlocal T=", sh_txt, re.S)
sh_s = {}
for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1)):
    sh_s[k] = int(v)
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


def parse_resources(field):
    if field.startswith("T."):
        entries = tmap.get(field, [])
        out = []
        for parts in entries:
            if len(parts) >= 3:
                out.append((resolve(parts[0]), resolve(parts[1]), resolve(parts[2])))
        return out
    out = []
    for chunk in re.finditer(r"\{([^\}]+)\}", field):
        parts = [p.strip() for p in chunk.group(1).split(",")]
        if len(parts) >= 3:
            out.append((resolve(parts[0]), resolve(parts[1]), resolve(parts[2])))
    return out


TARGET = set(range(10031, 10080))

# split stronghold rows by field index - resources is field 13 (0-based 12)
print("=== ALL STRONGHOLD RESOURCES (items 10031-10079) ===")
item_to_sh = {}
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
    fields = []
    cur = ""
    depth = 0
    for ch in body:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        if ch == "," and depth == 0:
            fields.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur:
        fields.append(cur.strip())
    if len(fields) < 13:
        continue
    res_field = fields[12]
    if res_field == "nil":
        continue
    resources = parse_resources(res_field)
    hits = [(n, sid, typ) for n, sid, typ in resources if isinstance(sid, int) and sid in TARGET]
    if hits:
        name = fields[9].strip('"')
        scene = fields[2].strip('"') if fields[2].startswith('"') else fields[2]
        print(f"\nStronghold {eid} — {name} (scene: {scene})")
        for n, sid, typ in hits:
            print(f"  item {sid} qty={n} type={typ}")
            item_to_sh.setdefault(sid, []).append((eid, name))

print("\n=== TARGET ITEMS 10039-10043 MAP ===")
for iid in range(10039, 10044):
    locs = item_to_sh.get(iid, [])
    print(f"  {iid}: {locs if locs else 'NOT in stronghold resources'}")
