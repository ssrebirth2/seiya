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


def entry(txt, eid):
    m = re.search(rf"\[{eid}\]=\{{([^}}]+)\}}", txt)
    return m.group(1) if m else None


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


task_txt = (LUA / "game/task/TaskConfig.lua").read_text(encoding="utf-8")
task_s = load_s(LUA / "game/task/TaskConfig.lua")
level_txt = (LUA / "game/level/LevelConfig.lua").read_text(encoding="utf-8")
level_s = load_s(LUA / "game/level/LevelConfig.lua")
item_txt = (LUA / "game/item/ItemConfig.lua").read_text(encoding="utf-8")
item_s = load_s(LUA / "game/item/ItemConfig.lua")
sh_txt = (LUA / "game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
sh_s = load_s(LUA / "game/scene/StrongHoldConfig.lua")
explore_txt = (LUA / "game/level/LevelExploreConditionConfig.lua").read_text(encoding="utf-8")
explore_s = load_s(LUA / "game/level/LevelExploreConditionConfig.lua")
scene_main = (LUA / "game/scenetask/SceneMainTaskConfig.lua").read_text(encoding="utf-8")

TARGET_ITEMS = list(range(10039, 10044))

print("=== ITEM METADATA ===")
for iid in TARGET_ITEMS:
    body = entry(item_txt, iid)
    gp = re.search(r"\{([^}]+)\},S\.n_5,", body or "")
    keys = []
    if gp:
        keys = [resolve(x, item_s) for x in gp.group(1).split(",")]
    print(f"{iid}: areaKeys={keys}")

print("\n=== LEVEL NODES (same id as item) ===")
for iid in TARGET_ITEMS:
    body = entry(level_txt, iid)
    if not body:
        print(f"  level {iid}: MISSING")
        continue
    parts = [p.strip() for p in body.split(",")]
    ft = resolve(parts[1], level_s)
    fa = resolve(parts[4].strip("{}"), level_s) if parts[4].startswith("{") else None
    extra = resolve(parts[14], level_s) if len(parts) > 14 else None
    print(f"  level {iid}: function_type={ft}, first_award={fa}, field15={extra}")

print("\n=== EXPLORE CONDITIONS referencing target levels ===")
for m in re.finditer(r"\[(\d+)\]=\{([^}]+)\}", explore_txt):
    cid = int(m.group(1))
    parts = [p.strip() for p in m.group(2).split(",")]
    cond_type = resolve(parts[1], explore_s)
    cond_levels = []
    lm = re.search(r"\{([^}]*)\}", parts[2])
    if lm:
        cond_levels = [resolve(x, explore_s) for x in lm.group(1).split(",") if x.strip()]
    des = resolve(parts[3], explore_s)
    skill = resolve(parts[4], explore_s) if len(parts) > 4 else None
    if any(l in TARGET_ITEMS for l in cond_levels if isinstance(l, int)):
        print(f"  cond {cid}: type={cond_type} levels={cond_levels} des={des} skill={skill}")

print("\n=== EXPLORE CONDITIONS referencing target levels (in template lists) ===")
# parse T table level lists
t_block = re.search(r"local T=\{([\s\S]*?)\}\nreturn", explore_txt).group(1)
tmap = {}
for tm in re.finditer(r"(t_\d+)=\{([^\}]+)\}", t_block):
    levels = [resolve(x, explore_s) for x in tm.group(2).split(",")]
    tmap[tm.group(1)] = levels

for m in re.finditer(r"\[(\d+)\]=\{([^}]+)\}", explore_txt):
    cid = int(m.group(1))
    parts = [p.strip() for p in m.group(2).split(",")]
    cond_type = resolve(parts[1], explore_s)
    levels = []
    if parts[2].startswith("T."):
        levels = tmap.get(parts[2], [])
    elif parts[2].startswith("{"):
        levels = [resolve(x, explore_s) for x in parts[2].strip("{}").split(",") if x.strip()]
    if any(l in TARGET_ITEMS for l in levels if isinstance(l, int)):
        des = resolve(parts[3], explore_s)
        skill = resolve(parts[4], explore_s) if len(parts) > 4 else None
        print(f"  cond {cid}: type={cond_type} levels={levels} des={des} skill={skill}")

print("\n=== OFFER REWARD COLLECT TASKS ===")
collect_tasks = []
for m in re.finditer(r"\[(\d+)\]=\{(\d+),[^}]*\{([^}]+)\}", scene_main):
    main_id = int(m.group(1))
    for tid in [int(x) for x in re.findall(r"(\d{6})", m.group(3))]:
        body = entry(task_txt, tid)
        if body and "S.n_1410" in body:
            collect_tasks.append((main_id, tid, body))

for main_id, tid, body in collect_tasks:
    parts = [p.strip() for p in body.split(",")]
    event_id = resolve(parts[3], task_s)
    map_id = resolve(parts[11], task_s)
    name = re.search(r'"(LC_Task_Map_reward_name_\d+)"', body)
  # stronghold name key from StrongHoldConfig
    sh_body = entry(sh_txt, map_id) if isinstance(map_id, int) else None
    sh_name = None
    if sh_body:
        nk = re.search(r'"(LC_stronghold_name_\d+)"', sh_body)
        sh_name = nk.group(1) if nk else None
    print(f"  main {main_id} task {tid}: collectEvent={event_id} stronghold={map_id} ({sh_name}) {name.group(1) if name else ''}")
