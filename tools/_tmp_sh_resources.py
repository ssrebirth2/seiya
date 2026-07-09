import re
from pathlib import Path

LUA = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig")
sh_txt = (LUA / "game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
sh_s = load_s = {}
m = re.search(r"local S=\{(.+?)\}\n", sh_txt)
for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1)):
    load_s[k] = int(v)


def resolve(token):
    token = token.strip()
    if re.fullmatch(r"\d+", token):
        return int(token)
    mm = re.match(r"S\.(n_\d+)", token)
    return load_s.get(mm.group(1), token) if mm else token


TARGET = set(range(10039, 10044))

print("=== STRONGHOLD resources with target items ===")
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
    name = re.search(r'"(LC_stronghold_name_\d+)"', body)
    # resources like {{1,10040,"prop"},{...}} or {{nil,S.n_X,{...}}}
    for chunk in re.findall(r"\{(\d+),(\d+),\"([^\"]+)\"\}", body):
        sid = int(chunk[1])
        if sid in TARGET:
            print(f"  SH {eid} {name.group(1) if name else ''}: {chunk[0]}x item {sid} type={chunk[2]}")
    for chunk in re.findall(r"\{(\d+),S\.(n_\d+),\"([^\"]+)\"\}", body):
        sid = resolve(f"S.{chunk[1]}")
        if sid in TARGET:
            print(f"  SH {eid} {name.group(1) if name else ''}: {chunk[0]}x item {sid} type={chunk[2]}")

# Also search duplicate_list for level ids
print("\n=== STRONGHOLD duplicate_list with target levels ===")
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
    hits = [x for x in TARGET if re.search(rf"(?<!\d){x}(?!\d)", body)]
    if hits:
        name = re.search(r'"(LC_stronghold_name_\d+)"', body)
        # extract duplicate_list only
        dm = re.search(r"duplicate_list[^,]*,\{([^}]+)\}", body)
        if dm and any(str(h) in dm.group(1) for h in hits):
            print(f"  SH {eid} {name.group(1) if name else ''}: levels {hits} in {dm.group(1)[:150]}")

# sample strongholds with any resources at all
print("\n=== Sample strongholds with resources (first 15) ===")
count = 0
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
  # field 13 resources - look for pattern after many nils... simpler: find {num,sid,type}
    res = re.findall(r"\{(\d+),(\d+),\"([^\"]+)\"\}", body)
    if res:
        name = re.search(r'"(LC_stronghold_name_\d+)"', body)
        print(f"  SH {eid} {name.group(1) if name else ''}: {res[:5]}")
        count += 1
        if count >= 15:
            break
