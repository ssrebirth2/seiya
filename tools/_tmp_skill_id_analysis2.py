"""Follow-up SkillConfig band deep-dive."""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path
import sys

sys.path.insert(0, r"c:\rb2\seiya\tools")
from _tmp_skill_id_analysis import parse_skill_rows, SKILL_CFG, ROLE_CFG, collect_icon_ids, PUBLIC_ICONS, PUBLIC_ART

OUT = Path(r"c:\rb2\seiya\tools\_tmp_skill_id_analysis_out2.txt")
LUA = Path(r"C:\rb2\assets\resources\luascriptwithoutcodecomments\luaconfig")


def main():
    lines = []
    def out(*a):
        lines.append(" ".join(str(x) for x in a))

    rows = parse_skill_rows(SKILL_CFG.read_text(encoding="utf-8", errors="replace"))
    role_text = ROLE_CFG.read_text(encoding="utf-8", errors="replace")
    hero_ids = {int(x) for x in re.findall(r"\[(\d+)\]\s*=\s*\{", role_text) if 1000 <= int(x) <= 1999}

    # Hero examples
    for hid in [1001, 1021, 1100, 1136]:
        out(f"\n=== HERO {hid} skills ===")
        for slot in range(10):
            sid = hid * 10 + slot
            if sid not in rows:
                continue
            r = rows[sid]
            out(
                f"  {sid} type={r['skill_type']} name={r['name_present']} icon={r['icon_present']} des={r['des_present']} "
                f"name={r['name']} path={r['iconpath']}"
            )

    # Slot 7 meaning
    slot7 = sorted(s for s in rows if 10000 <= s <= 19999 and s % 10 == 7)
    out("\n=== SLOT 7 (quality skills?) ===")
    out("count", len(slot7), "all type3?", all(rows[s]["skill_type"] == 3 for s in slot7))
    out("sample", [(s, rows[s]["name"], rows[s]["iconpath"]) for s in slot7[:8]])

    # 31 heroes with nil everything except maybe icon on slots - incomplete heroes
    incomplete_heroes = []
    for hid in sorted({s // 10 for s in rows if 10000 <= s <= 19999}):
        slots = [s for s in range(10) if hid * 10 + s in rows]
        named = sum(1 for sl in slots if rows[hid * 10 + sl]["name_present"])
        if named == 0:
            incomplete_heroes.append(hid)
    out("\nheroes with ALL skill names nil (WIP roster?):", len(incomplete_heroes), incomplete_heroes)

    # 10xxxx - subskills?
    band10 = sorted(s for s in rows if 100000 <= s <= 109999)
    out("\n=== 10xxxx ===")
    out("n", len(band10), "range", band10[0], band10[-1])
    # pattern: often skillid*10 + level? or parent*10+n
    # Check if //10 exists as parent skill
    parents = Counter()
    for s in band10:
        p = s // 10
        parents["parent_in_config" if p in rows else "parent_missing"] += 1
    out("parent = id//10 in SkillConfig:", dict(parents))
    out("sample:")
    for s in band10[:12]:
        r = rows[s]
        out(f"  {s} parent={s//10} in={s//10 in rows} name={r['name']} type={r['skill_type']}")

    band11 = sorted(s for s in rows if 110000 <= s <= 119999)
    out("\n=== 11xxxx ===", len(band11), band11)

    # 51xxxx 52xxxx 50xxxx 60xxxx
    for lo, hi, label in [
        (500000, 509999, "50xxxx"),
        (510000, 519999, "51xxxx"),
        (520000, 529999, "52xxxx"),
        (600000, 609999, "60xxxx"),
    ]:
        ids = sorted(s for s in rows if lo <= s <= hi)
        out(f"\n=== {label} n={len(ids)} ===")
        for s in ids[:6]:
            r = rows[s]
            out(f"  {s} name={r['name']} icon={r['iconpath']} des={r['des_present']} type={r['skill_type']}")
        if len(ids) > 6:
            out("  ...", ids[-3:])
        # completeness
        out(
            "  named",
            sum(1 for s in ids if rows[s]["name_present"]),
            "icon",
            sum(1 for s in ids if rows[s]["icon_present"]),
            "des",
            sum(1 for s in ids if rows[s]["des_present"]),
        )

    # Talent: HeroTalentSkillConfig key vs showskill
    tal = (LUA / "game/herotalent/herotalentskillconfig.lua").read_text(encoding="utf-8", errors="replace")
    # keys like [100101]=
    tal_keys = sorted(int(x) for x in re.findall(r"\[(\d+)\]\s*=\s*\{", tal))
    out("\n=== TALENT KEY PATTERN ===")
    out("n keys", len(tal_keys), "sample", tal_keys[:20], "...", tal_keys[-10:])
    # Decode: 100101 -> hero 1001, layer?
    # 100101 // 100 = 1001 hero? 100101 = hero*100 + ??
    decoded = []
    for k in tal_keys[:30]:
        decoded.append((k, k // 100, k % 100))
    out("key//100, key%100 sample:", decoded[:15])
    # Are keys in SkillConfig?
    out("talent keys in SkillConfig:", sum(1 for k in tal_keys if k in rows), "/", len(tal_keys))
    # showskill IDs ending in 04?
    mills = sorted(s for s in rows if s >= 1_000_000)
    out("1M+ %100:", Counter(s % 100 for s in mills).most_common(10))
    out("1M+ //100 unique (hero-ish):", len({s // 100 for s in mills}))
    # 1001304 -> 10013 + 04? or 1001 + 304?
    # HeroTalent often: showskill = heroId*1000 + slot*100 + something
    # 1001304 / 1000 = 1001.304 -> hero 1001?
    out("1M+ //1000 sample:", sorted({s // 1000 for s in mills})[:30])
    # Check: for hero 1001, talent display ids
    h1001 = [s for s in mills if s // 1000 == 1001 or str(s).startswith("1001")]
    out("related to 1001:", [s for s in mills if 1001000 <= s <= 1001999][:20])
    out("1001xxx:", [s for s in mills if 1001000 <= s <= 1001999])

    # Actually pattern from sample: 1001304, 1001404, 1001504, 1001604
    # = skill 10013/10014/... + 04? OR hero1001 slot3/4/5/6 + 04 suffix
    # skillid 10013 exists (slot 3). So display = skillId * 100 + 04?
    # 10013 * 100 + 4 = 1001304 YES!
    derived_ok = 0
    derived_bad = []
    for s in mills:
        parent = s // 100
        suffix = s % 100
        if parent in rows:
            derived_ok += 1
        else:
            derived_bad.append(s)
    out("1M+ = parentSkill*100 + xx; parent in SkillConfig:", derived_ok, "/", len(mills))
    out("suffixes:", Counter(s % 100 for s in mills))
    out("bad sample:", derived_bad[:10])

    # Which parents? mostly slot 3-6 hero skills?
    parents_of_mill = Counter()
    for s in mills:
        p = s // 100
        if 10000 <= p <= 19999:
            parents_of_mill[f"hero_slot_{p % 10}"] += 1
        else:
            parents_of_mill[f"other_{p}"] += 1
    out("1M+ parent slots:", dict(parents_of_mill))

    # 8xxxx talent combat skills vs talent keys
    eights = sorted(s for s in rows if 80000 <= s <= 89999)
    out("\n=== 8xxxx detail ===")
    out("subranges:", Counter(s // 1000 for s in eights))
    out("84000-84999:", sum(1 for s in eights if 84000 <= s <= 84999))
    out("sample 80:", eights[:10])
    out("sample 84:", [s for s in eights if 84000 <= s <= 84999][:15])
    out("sample 89:", [s for s in eights if 89000 <= s <= 89999])

    # Awaken 6xxxx pattern
    aw = sorted(s for s in rows if 60000 <= s <= 69999)
    out("\n=== 6xxxx awaken ===")
    out("subranges:", Counter(s // 1000 for s in aw))
    # 60001 related to hero 1001? 60xxx often awaken skill id independent
    out("sample with names:")
    for s in aw[:8]:
        out(f"  {s} {rows[s]['name']} icon={rows[s]['iconpath']}")
    # icon_only awakens
    aw_icon_only = [s for s in aw if rows[s]["icon_present"] and not rows[s]["name_present"]]
    out("awaken icon_only WIP:", aw_icon_only)

    # Combo 7xxxx - relation skill_id often different from row id
    rel = (LUA / "game/hero/herorelationskillconfig.lua").read_text(encoding="utf-8", errors="replace")
    out("\n=== 7xxxx combo ===")
    # Parse with brace walker for skill_id field - format id,name,type,hero_id,hero_list,skill_id
    # Simple: for each [id]={ ... } extract numbers after last }
    for m in re.finditer(r"\[(\d+)\]\s*=\s*\{", rel):
        rid = int(m.group(1))
        i = m.end() - 1
        depth = 0
        j = i
        while j < len(rel):
            c = rel[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    body = rel[i + 1 : j]
                    break
            elif c == '"':
                j += 1
                while j < len(rel) and rel[j] != '"':
                    if rel[j] == "\\":
                        j += 1
                    j += 1
            j += 1
        else:
            continue
        # top-level fields
        fields = []
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
        if len(fields) >= 6:
            sk = fields[5]
            if sk.isdigit():
                skid = int(sk)
                if rid < 70010:  # sample
                    out(f"  relation {rid} -> skill_id {skid} in_cfg={skid in rows} type_field={fields[2]}")

    # Force card: des only
    fc = sorted(s for s in rows if 90000 <= s <= 99999)
    out("\n=== FORCE 9xxxx ===")
    out("all name nil?", all(not rows[s]["name_present"] for s in fc))
    out("all icon nil?", all(not rows[s]["icon_present"] for s in fc))
    out("all des present?", all(rows[s]["des_present"] for s in fc))
    out("skill_types:", Counter(rows[s]["skill_type"] for s in fc))
    out("subranges:", Counter(s // 1000 for s in fc))

    # System 5xxxx - cosmo?
    sy = sorted(s for s in rows if 50000 <= s <= 59999)
    out("\n=== SYSTEM 5xxxx ===")
    out("subranges:", Counter(s // 1000 for s in sy))
    # named vs not
    out("named", sum(1 for s in sy if rows[s]["name_present"]))
    out("icon", sum(1 for s in sy if rows[s]["icon_present"]))
    # sample named with icon
    for s in sy:
        if rows[s]["name_present"] and rows[s]["icon_present"]:
            out(f"  named+icon {s} {rows[s]['name']} {rows[s]['iconpath']}")
            break
    # iconpath kinds for system
    prefs = Counter()
    for s in sy:
        ip = rows[s]["iconpath"]
        if not ip:
            prefs["nil"] += 1
        elif "Common" in ip:
            prefs["UI/Sprites/Common"] += 1
        elif "SkillIcon" in ip:
            prefs["SkillIcon"] += 1
        elif "Buff" in ip:
            prefs["Buff"] += 1
        else:
            prefs[ip[:50]] += 1
    out("iconpath kinds:", dict(prefs))

    # Artifact pattern 400100 = artifactId * 100?
    arts = sorted(s for s in rows if 400000 <= s <= 499999)
    out("\n=== ARTIFACT ===")
    out("ids:", arts)
    out("all end with 00?", all(s % 100 == 0 for s in arts))

    # Spirit 820100 = spiritId * 100?
    spirits = sorted(s for s in rows if 820000 <= s <= 829999)
    out("\n=== SPIRIT ===")
    out("ids:", spirits)
    out("step 100?", all((spirits[i] - spirits[i - 1]) == 100 for i in range(1, len(spirits))))

    # StreamingResources icon count
    stream = Path(r"C:\rb2\assets\StreamingResources\textures\hero\skillicon")
    out("\n=== STREAMING ICONS ===")
    out("stream dir exists", stream.exists(), stream)
    if stream.exists():
        # may be texture/ subfolder or assetbundles
        for p in sorted(stream.rglob("*"))[:30]:
            out(" ", p.relative_to(stream), "file" if p.is_file() else "dir")
        pngs = list(stream.rglob("*.png"))
        out("png count", len(pngs))
        # also check texture subfolder naming
        tex = stream / "texture"
        if tex.exists():
            ids = collect_icon_ids(tex)
            out("stream texture SkillIcon_*.png", len(ids))
            pub = collect_icon_ids(PUBLIC_ICONS)
            only_stream = sorted(set(ids) - set(pub))
            only_pub = sorted(set(pub) - set(ids))
            out("only in stream not public", len(only_stream), only_stream[:20])
            out("only in public not stream", len(only_pub), only_pub[:20])
            # stream vs config
            out("stream icons not in SkillConfig keys", len(set(ids) - set(rows.keys())))

    # Missing public files breakdown by band / AA stub
    pub = collect_icon_ids(PUBLIC_ICONS)
    artpub = collect_icon_ids(PUBLIC_ART)
    missing_by_band = Counter()
    missing_aa = 0
    missing_non_aa = 0
    no_id = 0
    for s, r in rows.items():
        ip = r["iconpath"]
        if not ip:
            continue
        low = ip.replace("\\", "/").lower()
        m = re.search(r"skillicon_(\d+)$", low.split("/")[-1], re.I)
        if not m:
            if "skillicon" not in low:
                no_id += 1  # common sprites etc
            continue
        iid = int(m.group(1))
        if "artifact" in low:
            ok = iid in artpub
            band = "artifact"
        else:
            ok = iid in pub
            if 10000 <= s <= 19999 and s % 10 == 0:
                band = "hero_AA"
            elif 10000 <= s <= 19999:
                band = "hero_other"
            elif 20000 <= s <= 39999:
                band = "npc"
            elif 60000 <= s <= 69999:
                band = "awaken"
            elif s >= 1_000_000:
                band = "talent_display"
            elif 80000 <= s <= 89999:
                band = "talent"
            else:
                band = "other"
        if not ok:
            missing_by_band[band] += 1
            if band == "hero_AA":
                missing_aa += 1
            else:
                missing_non_aa += 1
    out("\n=== MISSING PUBLIC FILE BREAKDOWN (SkillIcon_* only) ===")
    out(dict(missing_by_band))
    out("non-SkillIcon iconpaths (common/buff):", no_id)

    # Config has icon SkillIcon_X but X file missing; vs AA stubs specifically
    # How many missing are AA where iconpath points to own id
    aa_missing_own = sum(
        1
        for s in rows
        if 10000 <= s <= 19999
        and s % 10 == 0
        and rows[s]["iconpath"]
        and f"SkillIcon_{s}" in (rows[s]["iconpath"] or "")
        and s not in pub
    )
    out("AA stubs missing own icon file:", aa_missing_own)

    # Orphan files detail
    orphans = sorted(set(pub) | set(artpub) - set(rows.keys()))
    out("\n=== ORPHAN ICON FILES DETAIL ===")
    for oid in orphans:
        # referenced by some other skill's iconpath?
        refs = [s for s, r in rows.items() if r["iconpath"] and f"SkillIcon_{oid}" in r["iconpath"]]
        out(f"  file SkillIcon_{oid} refs_from_skills={refs[:8]} nrefs={len(refs)}")

    # skill_type meanings beyond SkillIconType
    out("\n=== SKILL_TYPE BY BAND ===")
    for bname, pred in [
        ("hero", lambda s: 10000 <= s <= 19999),
        ("npc", lambda s: 20000 <= s <= 39999),
        ("system5", lambda s: 50000 <= s <= 59999),
        ("awaken", lambda s: 60000 <= s <= 69999),
        ("combo", lambda s: 70000 <= s <= 79999),
        ("talent8", lambda s: 80000 <= s <= 89999),
        ("force", lambda s: 90000 <= s <= 99999),
        ("artifact", lambda s: 400000 <= s <= 499999),
        ("spirit", lambda s: 820000 <= s <= 829999),
        ("1M+", lambda s: s >= 1000000),
        ("10xxxx", lambda s: 100000 <= s <= 109999),
    ]:
        ids = [s for s in rows if pred(s)]
        out(bname, dict(Counter(rows[s]["skill_type"] for s in ids)))

    # Search GameDefine for skill type numbers 4,5,7,8
    gd = Path(r"C:\rb2\assets\resources\luascriptwithoutcodecomments\game\define\gamedefine.lua")
    gt = gd.read_text(encoding="utf-8", errors="replace")
    for pat in [r"SkillType\s*=\s*\{[^}]+\}", r"BattleSkillType\s*=\s*\{[^}]+\}", r"HeroSkillType\s*=\s*\{[^}]+\}"]:
        m = re.search(pat, gt, re.S)
        if m:
            out("FOUND", m.group(0)[:500])

    # broader search
    for m in re.finditer(r"GameDefine\.\w*[Ss]kill\w*\s*=\s*\{[^}]{0,400}\}", gt):
        out("ENUM", m.group(0).replace("\n", " ")[:300])

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT}")
    print("\n".join(lines[:100]))


if __name__ == "__main__":
    main()
