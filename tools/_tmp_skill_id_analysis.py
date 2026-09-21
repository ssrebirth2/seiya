"""One-off SkillConfig ID-band / incompleteness analysis. Delete when done."""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path

SKILL_CFG = Path(
    r"C:\rb2\assets\resources\luascriptwithoutcodecomments\luaconfig\game\skill\skillconfig.lua"
)
ROLE_CFG = Path(
    r"C:\rb2\assets\resources\luascriptwithoutcodecomments\luaconfig\game\role\roleconfig.lua"
)
PUBLIC_ICONS = Path(
    r"c:\rb2\seiya\public\assets\resources\textures\hero\skillicon\texture"
)
PUBLIC_ART = Path(
    r"c:\rb2\seiya\public\assets\resources\textures\artifact\artifactskill\skillicon"
)
LUA_ROOT = Path(r"C:\rb2\assets\resources\luascriptwithoutcodecomments\luaconfig")
OUT = Path(r"c:\rb2\seiya\tools\_tmp_skill_id_analysis_out.txt")


def resolve_val(tok: str, S: dict[str, str]):
    tok = tok.strip()
    if tok == "nil":
        return None
    if len(tok) >= 2 and tok[0] == '"' and tok[-1] == '"':
        return tok[1:-1]
    if re.fullmatch(r"-?\d+(\.\d+)?", tok):
        return float(tok) if "." in tok else int(tok)
    if tok.startswith("S.") and tok[2:] in S:
        return S[tok[2:]]
    if tok.startswith("T."):
        return tok
    return tok


def parse_skill_rows(text: str) -> dict[int, dict]:
    pool_src = text.split("return _G.ConstClass", 1)[0]
    S: dict[str, str] = {}
    for m in re.finditer(
        r'(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"', pool_src
    ):
        S[m.group(1)] = m.group(2)

    rows: dict[int, dict] = {}
    for m in re.finditer(r"\[(\d+)\]\s*=\s*\{", text):
        sid = int(m.group(1))
        i = m.end() - 1
        depth = 0
        j = i
        body = None
        while j < len(text):
            c = text[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    body = text[i + 1 : j]
                    break
            elif c == '"':
                j += 1
                while j < len(text) and text[j] != '"':
                    if text[j] == "\\":
                        j += 1
                    j += 1
            j += 1
        if body is None:
            continue

        fields: list[str] = []
        depth = 0
        start = 0
        in_str = False
        k = 0
        while k < len(body):
            c = body[k]
            if in_str:
                if c == "\\":
                    k += 2
                    continue
                if c == '"':
                    in_str = False
                k += 1
                continue
            if c == '"':
                in_str = True
                k += 1
                continue
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
            elif c == "," and depth == 0:
                fields.append(body[start:k].strip())
                start = k + 1
            k += 1
        last = body[start:].strip()
        if last:
            fields.append(last)
        while len(fields) < 20:
            fields.append("nil")

        name = resolve_val(fields[1], S)
        icon = resolve_val(fields[2], S)
        skill_type = resolve_val(fields[5], S)
        skill_des = fields[10].strip()
        des_present = skill_des not in ("nil", "")
        rows[sid] = {
            "name": name,
            "iconpath": icon if isinstance(icon, str) else None,
            "skill_type": skill_type,
            "des_present": des_present,
            "name_present": name is not None and name != "",
            "icon_present": isinstance(icon, str) and icon != "",
        }
    return rows


def band(sid: int) -> str:
    if sid >= 1_000_000:
        return "talent_display_1M+"
    if 820_000 <= sid <= 829_999:
        return "spirit_82xxxx"
    if 400_000 <= sid <= 499_999:
        return "artifact_4xxxxx"
    if 90_000 <= sid <= 99_999:
        return "force_card_9xxxx"
    if 80_000 <= sid <= 89_999:
        return "talent_8xxxx"
    if 70_000 <= sid <= 79_999:
        return "combo_bond_7xxxx"
    if 60_000 <= sid <= 69_999:
        return "awaken_6xxxx"
    if 50_000 <= sid <= 59_999:
        return "system_5xxxx"
    if 20_000 <= sid <= 39_999:
        return "npc_2_3xxxx"
    if 10_000 <= sid <= 19_999:
        return "hero_1xxxx"
    if 1_000 <= sid <= 9_999:
        return "misc_4digit"
    return f"other_{sid // 10_000}xxxx"


def collect_icon_ids(folder: Path) -> dict[int, str]:
    ids: dict[int, str] = {}
    if not folder.exists():
        return ids
    for p in folder.iterdir():
        if not p.is_file():
            continue
        m = re.match(r"(?i)skillicon_(\d+)\.png$", p.name)
        if m:
            ids[int(m.group(1))] = p.name
    return ids


def extract_config_ids(path: Path, field_patterns: list[str]) -> list[int]:
    if not path.exists():
        return []
    t = path.read_text(encoding="utf-8", errors="replace")
    ids: set[int] = set()
    # row keys
    for m in re.finditer(r"\[(\d+)\]\s*=\s*\{", t):
        ids.add(int(m.group(1)))
    # also skill_id fields as numbers appearing after skill_id=
    for pat in field_patterns:
        for m in re.finditer(pat, t):
            ids.add(int(m.group(1)))
    return sorted(ids)


def main() -> None:
    lines: list[str] = []

    def out(*a):
        lines.append(" ".join(str(x) for x in a))

    text = SKILL_CFG.read_text(encoding="utf-8", errors="replace")
    rows = parse_skill_rows(text)
    out("TOTAL_SKILLS", len(rows))
    out("MIN_ID", min(rows), "MAX_ID", max(rows))

    role_text = ROLE_CFG.read_text(encoding="utf-8", errors="replace")
    # RoleConfig keys only (after format)
    role_keys = [int(x) for x in re.findall(r"\[(\d+)\]\s*=\s*\{", role_text)]
    # Role ids are typically 1000-1999 heroes; keep all numeric keys that look like roles
    hero_ids = {h for h in role_keys if 1000 <= h <= 1999}
    npc_role_ids = {h for h in role_keys if 2000 <= h <= 3999}
    out("HERO_ROLE_IDS", len(hero_ids), "min", min(hero_ids), "max", max(hero_ids))
    out(
        "NPC_ROLE_IDS",
        len(npc_role_ids),
        "min",
        min(npc_role_ids) if npc_role_ids else None,
        "max",
        max(npc_role_ids) if npc_role_ids else None,
    )

    band_counts = Counter(band(s) for s in rows)
    out("\n=== BAND COUNTS ===")
    for b, c in sorted(band_counts.items(), key=lambda x: -x[1]):
        ids = [s for s in rows if band(s) == b]
        out(f"{b}: {c}  range=[{min(ids)}-{max(ids)}]")

    out("\n=== THOUSAND HISTOGRAM ===")
    decade: Counter[str] = Counter()
    for s in rows:
        if s >= 1_000_000:
            decade["1M+"] += 1
        elif s >= 100_000:
            decade[f"{s // 10_000:02d}xxxx"] += 1
        else:
            decade[f"{s // 1000}xxx"] += 1
    for k, v in sorted(decade.items()):
        out(k, v)

    # Finer: empty thousands in hero/npc
    out("\n=== HERO 1xxxx sub-bands (per 100 hero ids) ===")
    for base in range(1000, 1200, 10):
        lo, hi = base * 10, base * 10 + 99
        n = sum(1 for s in rows if lo <= s <= hi)
        if n:
            out(f"{lo}-{hi}: {n}")

    out("\n=== HERO BAND SLOT ANALYSIS ===")
    hero_band = [s for s in rows if 10_000 <= s <= 19_999]
    slot_counts = Counter(s % 10 for s in hero_band)
    out("slot digit counts:", dict(sorted(slot_counts.items())))

    matched = 0
    unmatched = []
    slot_by_match: Counter[int] = Counter()
    type_by_slot: dict[int, Counter] = defaultdict(Counter)
    name_by_slot: dict[int, Counter] = defaultdict(Counter)
    for s in hero_band:
        hid = s // 10
        slot = s % 10
        if hid in hero_ids:
            matched += 1
            slot_by_match[slot] += 1
            type_by_slot[slot][rows[s]["skill_type"]] += 1
            name_by_slot[slot]["named" if rows[s]["name_present"] else "nil"] += 1
        else:
            unmatched.append(s)
    out("matched to RoleConfig hero:", matched, "/", len(hero_band))
    out("unmatched total", len(unmatched), "sample", unmatched[:40])
    out("slots among matched:", dict(sorted(slot_by_match.items())))
    out("skill_type by slot (matched):")
    for slot in sorted(type_by_slot):
        out(f"  slot {slot}:", dict(type_by_slot[slot]), "names:", dict(name_by_slot[slot]))

    aa = [s for s in hero_band if s % 10 == 0]
    out(
        "AA stubs (*0):",
        len(aa),
        "nil_name=",
        sum(1 for s in aa if not rows[s]["name_present"]),
        "has_icon=",
        sum(1 for s in aa if rows[s]["icon_present"]),
        "has_des=",
        sum(1 for s in aa if rows[s]["des_present"]),
    )

    heroes_with_skills: dict[int, list[int]] = defaultdict(list)
    for s in hero_band:
        heroes_with_skills[s // 10].append(s % 10)
    out("unique hero bases in skill band:", len(heroes_with_skills))
    slot_sets = Counter(tuple(sorted(v)) for v in heroes_with_skills.values())
    out("common slot patterns (top 20):")
    for pat, c in slot_sets.most_common(20):
        out(f"  {pat}: {c}")

    # Verify formula for every RoleConfig hero skills field if possible
    # Extract skills arrays from RoleConfig is hard; instead check hid*10+slot for slots 0-9
    formula_hits = 0
    formula_miss_heroes = []
    for hid in sorted(hero_ids):
        present = [slot for slot in range(10) if hid * 10 + slot in rows]
        if present:
            formula_hits += 1
        else:
            formula_miss_heroes.append(hid)
    out("heroes with at least one hid*10+slot skill:", formula_hits, "/", len(hero_ids))
    out("heroes with NO such skills sample:", formula_miss_heroes[:30])

    # NPC band
    out("\n=== NPC 2-3xxxx ===")
    npc_band = [s for s in rows if 20_000 <= s <= 39_999]
    out("count", len(npc_band), "range", min(npc_band) if npc_band else None, max(npc_band) if npc_band else None)
    npc_slot = Counter(s % 10 for s in npc_band)
    out("npc slot digits:", dict(sorted(npc_slot.items())))
    npc_matched = sum(1 for s in npc_band if (s // 10) in npc_role_ids or (s // 10) in hero_ids)
    out("npc skills whose id//10 in RoleConfig:", npc_matched)

    # Cross-owner sampling via related configs
    out("\n=== OWNER CONFIG CROSS-CHECK ===")
    related = {
        "HeroAwakenInfoConfig skill_ids": (
            LUA_ROOT / "game/hero/heroawakeninfoconfig.lua",
            [r"skill_id\s*=\s*(\d+)", r"\{(\d+),\d+\}"],
        ),
        "HeroRelationSkillConfig ids": (
            LUA_ROOT / "game/hero/herorelationskillconfig.lua",
            [],
        ),
        "HeroTalentSkillConfig ids": (
            LUA_ROOT / "game/herotalent/herotalentskillconfig.lua",
            [r"skill_id\s*=\s*(\d+)"],
        ),
        "ForceCard configs": (
            LUA_ROOT / "game/forcecard",
            [],
        ),
    }

    # Awaken: pull skill_id numbers from file by scanning {NNNNN,lv} patterns in add_skill
    awaken_path = LUA_ROOT / "game/hero/heroawakeninfoconfig.lua"
    if awaken_path.exists():
        at = awaken_path.read_text(encoding="utf-8", errors="replace")
        # skill_show field and add_skill skill_ids — look for 6xxxx numbers
        awaken_skill_ids = set(int(x) for x in re.findall(r"\b(6\d{4})\b", at))
        # also skill_show as lone field values near end of rows is hard; sample from SkillConfig 6xxxx referenced
        out("HeroAwakenInfoConfig mentions of 6xxxx literals:", len(awaken_skill_ids))
        in_cfg = sum(1 for x in awaken_skill_ids if x in rows)
        out("  of which in SkillConfig:", in_cfg)

    rel_path = LUA_ROOT / "game/hero/herorelationskillconfig.lua"
    if rel_path.exists():
        rt = rel_path.read_text(encoding="utf-8", errors="replace")
        rel_ids = sorted(int(x) for x in re.findall(r"\[(\d+)\]\s*=\s*\{", rt))
        # skill_id is field 6 — parse roughly: after id,name,type,hero_id,hero_list comes skill_id
        # Extract all 7xxxx from file
        rel_skill_refs = sorted(set(int(x) for x in re.findall(r"\b(7\d{4})\b", rt)))
        out("HeroRelationSkillConfig row keys:", len(rel_ids), "range", rel_ids[0] if rel_ids else None, rel_ids[-1] if rel_ids else None)
        out("7xxxx literals in relation config:", len(rel_skill_refs), "in SkillConfig", sum(1 for x in rel_skill_refs if x in rows))
        # relation row id vs skill_id: often skill_id == id?
        # Parse rows simply
        same = 0
        diff = 0
        for m in re.finditer(r"\[(\d+)\]\s*=\s*\{([^}]*)\}", rt):
            rid = int(m.group(1))
            parts = [p.strip() for p in m.group(2).split(",")]
            # format: id,name,type,hero_id,hero_list,skill_id — hero_list is {...}
            # skip complex; look for last number
            nums = re.findall(r"\d+", m.group(2))
            if len(nums) >= 2:
                # last number often skill_id
                sk = int(nums[-1])
                if sk == rid:
                    same += 1
                else:
                    diff += 1
        out("relation id==last_num:", same, "diff:", diff)

    tal_path = LUA_ROOT / "game/herotalent/herotalentskillconfig.lua"
    if tal_path.exists():
        tt = tal_path.read_text(encoding="utf-8", errors="replace")
        tal_keys = sorted(int(x) for x in re.findall(r"\[(\d+)\]\s*=\s*\{", tt))
        out("HeroTalentSkillConfig keys:", len(tal_keys), "range", tal_keys[0] if tal_keys else None, tal_keys[-1] if tal_keys else None)
        # showskill / skill skill_ids — 8xxxx and 1M+
        eights = sorted(set(int(x) for x in re.findall(r"\b(8\d{4})\b", tt)))
        millions = sorted(set(int(x) for x in re.findall(r"\b(1\d{6,})\b", tt)))
        out("8xxxx in talent cfg:", len(eights), "in SkillConfig", sum(1 for x in eights if x in rows))
        out("1M+ in talent cfg:", len(millions), "sample", millions[:10], "in SkillConfig", sum(1 for x in millions if x in rows))

    # Force card skill refs
    fc_dir = LUA_ROOT / "game/forcecard"
    if fc_dir.exists():
        nines = set()
        for p in fc_dir.glob("*.lua"):
            nines |= set(int(x) for x in re.findall(r"\b(9\d{4})\b", p.read_text(encoding="utf-8", errors="replace")))
        out("9xxxx literals in forcecard configs:", len(nines), "in SkillConfig", sum(1 for x in nines if x in rows))
        out("9xxxx sample:", sorted(nines)[:20])

    # Artifact
    art_dir = LUA_ROOT / "game/artifact"
    if art_dir.exists():
        arts = set()
        for p in art_dir.glob("*.lua"):
            arts |= set(int(x) for x in re.findall(r"\b(40\d{4})\b", p.read_text(encoding="utf-8", errors="replace")))
        out("40xxxx in artifact configs:", len(arts), "in SkillConfig", sum(1 for x in arts if x in rows))

    # Spirit
    spirit_hits = sorted(s for s in rows if 820_000 <= s <= 829_999)
    out("spirit skills in SkillConfig:", len(spirit_hits), "sample", spirit_hits[:15])

    # System 5xxxx
    sys5 = sorted(s for s in rows if 50_000 <= s <= 59_999)
    out("system 5xxxx:", len(sys5), "range", sys5[0] if sys5 else None, sys5[-1] if sys5 else None)
    out("5xxxx skill_type:", Counter(rows[s]["skill_type"] for s in sys5))
    out("5xxxx named:", sum(1 for s in sys5 if rows[s]["name_present"]))

    # Incompleteness
    out("\n=== INCOMPLETENESS GLOBAL ===")
    n = len(rows)
    name_nil = sum(1 for r in rows.values() if not r["name_present"])
    icon_nil = sum(1 for r in rows.values() if not r["icon_present"])
    des_nil = sum(1 for r in rows.values() if not r["des_present"])
    out(f"name nil: {name_nil} ({100 * name_nil / n:.1f}%)")
    out(f"iconpath nil: {icon_nil} ({100 * icon_nil / n:.1f}%)")
    out(f"skill_des nil: {des_nil} ({100 * des_nil / n:.1f}%)")

    combos: Counter[str] = Counter()
    for r in rows.values():
        key = (
            ("N" if r["name_present"] else "-")
            + ("I" if r["icon_present"] else "-")
            + ("D" if r["des_present"] else "-")
        )
        combos[key] += 1
    out("combos (N=name I=icon D=des):")
    for k, v in combos.most_common():
        label = {
            "NID": "full",
            "---": "empty",
            "-I-": "icon_only",
            "N--": "name_only",
            "--D": "des_only",
            "NI-": "name+icon",
            "N-D": "name+des",
            "-ID": "icon+des",
        }.get(k, k)
        out(f"  {k} ({label}): {v}")

    out("\n=== INCOMPLETENESS BY BAND ===")
    for b, _ in sorted(band_counts.items(), key=lambda x: -x[1]):
        subset = [rows[s] for s in rows if band(s) == b]
        nn = sum(1 for r in subset if not r["name_present"])
        ii = sum(1 for r in subset if not r["icon_present"])
        dd = sum(1 for r in subset if not r["des_present"])
        full = sum(
            1
            for r in subset
            if r["name_present"] and r["icon_present"] and r["des_present"]
        )
        empty = sum(
            1
            for r in subset
            if not r["name_present"] and not r["icon_present"] and not r["des_present"]
        )
        icon_only = sum(
            1
            for r in subset
            if (not r["name_present"]) and r["icon_present"] and (not r["des_present"])
        )
        out(
            f"{b}: n={len(subset)} name_nil={nn} icon_nil={ii} des_nil={dd} full={full} empty={empty} icon_only={icon_only}"
        )

    # Icons on disk
    public_hero_icons = collect_icon_ids(PUBLIC_ICONS)
    public_art_icons = collect_icon_ids(PUBLIC_ART)
    out("\n=== PUBLIC ICONS ===")
    out("hero skillicon files:", len(public_hero_icons))
    out("artifact skillicon files:", len(public_art_icons))

    config_icon_ids: set[int] = set()
    config_with_iconpath = 0
    path_pref: Counter[str] = Counter()
    for s, r in rows.items():
        ip = r["iconpath"]
        if not ip:
            path_pref["(nil)"] += 1
            continue
        config_with_iconpath += 1
        m = re.search(r"(?i)SkillIcon_(\d+)", ip)
        if m:
            config_icon_ids.add(int(m.group(1)))
        parts = ip.replace("\\", "/").split("/")
        path_pref["/".join(parts[:4]) if len(parts) >= 4 else ip] += 1

    all_public = {**public_hero_icons, **public_art_icons}
    file_not_in_config_keys = sorted(set(all_public) - set(rows.keys()))
    file_not_in_iconpath_or_keys = sorted(
        set(all_public) - config_icon_ids - set(rows.keys())
    )

    missing_files = []
    for s, r in rows.items():
        ip = r["iconpath"]
        if not ip:
            continue
        low = ip.replace("\\", "/").lower()
        m = re.search(r"skillicon_(\d+)$", low.split("/")[-1], re.I)
        if not m:
            missing_files.append((s, ip, "no_id_in_path"))
            continue
        iid = int(m.group(1))
        if "artifact" in low:
            if iid not in public_art_icons:
                missing_files.append((s, ip, "missing_artifact"))
        else:
            if iid not in public_hero_icons:
                missing_files.append((s, ip, "missing_hero"))

    out(f"config rows with iconpath: {config_with_iconpath}")
    out(f"icon files whose ID not in SkillConfig keys: {len(file_not_in_config_keys)}")
    out("  sample:", file_not_in_config_keys[:50])
    out(
        f"icon files not matching any skillid OR iconpath id: {len(file_not_in_iconpath_or_keys)}"
    )
    out("  sample:", file_not_in_iconpath_or_keys[:50])
    out(f"config iconpath missing file on public: {len(missing_files)}")
    out("  reasons:", dict(Counter(x[2] for x in missing_files)))
    out("  sample:", missing_files[:30])

    # Band of orphan icon files
    orphan_bands = Counter(band(s) for s in file_not_in_config_keys)
    out("orphan icon file bands:", dict(orphan_bands))

    out("\n=== ICONPATH PREFIXES ===")
    for k, v in path_pref.most_common(25):
        out(f"  {k}: {v}")

    mismatch = []
    for s, r in rows.items():
        ip = r["iconpath"]
        if not ip:
            continue
        m = re.search(r"(?i)SkillIcon_(\d+)", ip)
        if m and int(m.group(1)) != s:
            mismatch.append((s, int(m.group(1)), ip))
    out(f"\niconpath SkillIcon_id != skillid: {len(mismatch)}")
    out("samples:", mismatch[:25])

    # Search StreamingResources for SkillIcon
    out("\n=== STREAMING / GAME BUNDLE SEARCH ===")
    search_roots = [
        Path(r"C:\rb2\assets\resources"),
        Path(r"C:\rb2\assets"),
    ]
    found_dirs: list[str] = []
    for root in search_roots:
        if not root.exists():
            continue
        for p in root.rglob("*SkillIcon*"):
            if p.is_dir():
                found_dirs.append(str(p))
            if len(found_dirs) >= 30:
                break
        if found_dirs:
            break
    out("SkillIcon dirs found (up to 30):", found_dirs[:30])

    # Also count assetbundles mentioning skillicon
    bundle_hits = []
    for root_name in ("StreamingResources_cn", "StreamingResources_global"):
        root = Path(r"C:\rb2\assets\resources") / root_name
        if not root.exists():
            # try alternate
            root = Path(r"C:\rb2\assets") / root_name
        if root.exists():
            hits = list(root.rglob("*skillicon*"))[:40]
            bundle_hits.append((str(root), len(list(root.rglob("*skillicon*"))), [str(h) for h in hits[:15]]))
    out("bundle skillicon hits:", bundle_hits)

    # GameDefine comments search
    gd = Path(
        r"C:\rb2\assets\resources\luascriptwithoutcodecomments\game\define\gamedefine.lua"
    )
    out("\n=== GAMEDEFINE SKILL-RELATED ===")
    if gd.exists():
        gt = gd.read_text(encoding="utf-8", errors="replace")
        for pat in [
            r"SkillIconType\s*=\s*\{[^}]+\}",
            r"HeroRelationSkillType\s*=\s*\{[^}]+\}",
        ]:
            m = re.search(pat, gt, re.S)
            if m:
                out(m.group(0).replace("\n", " "))

    # Look for ID range comments anywhere
    out("\n=== COMMENT / ENUM SEARCH (skill id ranges) ===")
    comment_hits = []
    search_dirs = [
        Path(r"C:\rb2\assets\resources\luascriptwithoutcodecomments\game"),
        Path(r"C:\rb2\assets\resources\luascriptwithoutcodecomments\luaconfig\game\skill"),
    ]
    patterns = [
        r".{0,40}skillid.{0,40}",
        r".{0,40}SkillId.{0,40}",
        r".{0,60}1xxxx.{0,40}",
        r".{0,60}60000.{0,40}",
        r".{0,40}skill.?id.?range.{0,40}",
    ]
    for d in search_dirs:
        if not d.exists():
            continue
        for p in d.rglob("*.lua"):
            try:
                t = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            # only comment lines
            for i, line in enumerate(t.splitlines()):
                if "--" not in line and "SkillIconType" not in line:
                    continue
                low = line.lower()
                if any(
                    k in low
                    for k in (
                        "skill id",
                        "skillid",
                        "1xxxx",
                        "skill range",
                        "技能id",
                        "技能编号",
                    )
                ):
                    comment_hits.append(f"{p.name}:{i+1}: {line.strip()[:120]}")
                    if len(comment_hits) >= 40:
                        break
            if len(comment_hits) >= 40:
                break
        if len(comment_hits) >= 40:
            break
    out("comment hits:", len(comment_hits))
    for h in comment_hits[:40]:
        out(" ", h)

    # Extra: 4xxxxx incompleteness detail + 82xxxx
    out("\n=== ARTIFACT / SPIRIT DETAIL ===")
    for bname, pred in [
        ("artifact", lambda s: 400_000 <= s <= 499_999),
        ("spirit", lambda s: 820_000 <= s <= 829_999),
        ("talent_display", lambda s: s >= 1_000_000),
        ("talent_8", lambda s: 80_000 <= s <= 89_999),
        ("force", lambda s: 90_000 <= s <= 99_999),
        ("awaken", lambda s: 60_000 <= s <= 69_999),
        ("combo", lambda s: 70_000 <= s <= 79_999),
    ]:
        ids = [s for s in rows if pred(s)]
        if not ids:
            out(bname, "NONE")
            continue
        out(
            bname,
            "n=",
            len(ids),
            "min=",
            min(ids),
            "max=",
            max(ids),
            "named%",
            round(100 * sum(1 for s in ids if rows[s]["name_present"]) / len(ids), 1),
            "icon%",
            round(100 * sum(1 for s in ids if rows[s]["icon_present"]) / len(ids), 1),
            "des%",
            round(100 * sum(1 for s in ids if rows[s]["des_present"]) / len(ids), 1),
        )
        out("  sample ids:", ids[:8], "...", ids[-4:])

    # Hero band WIP candidates: icon present, name nil (sneak peek)
    sneak = [
        s
        for s in hero_band
        if rows[s]["icon_present"] and not rows[s]["name_present"]
    ]
    out("\n=== SNEAK-PEEK CANDIDATES (hero band: icon, no name) ===")
    out("count", len(sneak), "sample", sneak[:40])
    sneak2 = [
        s
        for s in rows
        if rows[s]["icon_present"] and not rows[s]["name_present"]
    ]
    out("all bands icon+no_name:", len(sneak2))
    sneak_bands = Counter(band(s) for s in sneak2)
    out("by band:", dict(sneak_bands))

    # skill_type enum distribution
    out("\n=== SKILL_TYPE DISTRIBUTION ===")
    out(dict(Counter(r["skill_type"] for r in rows.values())))

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")
    print("\n".join(lines[:80]))


if __name__ == "__main__":
    main()
