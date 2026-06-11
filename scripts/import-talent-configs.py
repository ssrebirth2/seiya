#!/usr/bin/env python3
"""
Import HeroTalent* Lua configs into Supabase.

Usage:
  python scripts/import-talent-configs.py --dry-run
  python scripts/import-talent-configs.py --lua-dir "C:/path/to/TextAsset"

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_* from .env.local)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from slpp import slpp as lua

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LUA_DIR = Path(r"C:\Users\multp\Documents\MuMuSharedFolder\Download\TextAsset")

TALENT_FILES = [
    ("HeroTalentConfig", "HeroTalentConfig.lua"),
    ("HeroTalentLayersConfig", "HeroTalentLayersConfig.lua"),
    ("HeroTalentAttributeConfig", "HeroTalentAttributeConfig.lua"),
    ("HeroTalentAttributeLevelConfig", "HeroTalentAttributeLevelConfig.lua"),
    ("HeroTalentSkillConfig", "HeroTalentSkillConfig.lua"),
]

EXPECTED_COUNTS = {
    "HeroTalentConfig": 136,
    "HeroTalentLayersConfig": 54,
    "HeroTalentAttributeConfig": 270,
    "HeroTalentAttributeLevelConfig": 1350,
    "HeroTalentSkillConfig": 1224,
}


def extract_braced_assignment(content: str, var_name: str) -> str | None:
    pattern = rf"local\s+{re.escape(var_name)}\s*=\s*\{{"
    m = re.search(pattern, content)
    if not m:
        return None
    start = m.end() - 1
    depth = 0
    for i in range(start, len(content)):
        ch = content[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return content[start : i + 1]
    raise ValueError(f"Unclosed brace for local {var_name}")


def lua_literal(value: Any) -> str:
    if value is None:
        return "nil"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    if isinstance(value, (list, tuple)):
        return "{" + ",".join(lua_literal(v) for v in value) + "}"
    if isinstance(value, dict):
        parts = []
        for k, v in value.items():
            key = f"[{lua_literal(k)}]" if isinstance(k, (int, str)) else str(k)
            parts.append(f"{key}={lua_literal(v)}")
        return "{" + ",".join(parts) + "}"
    return str(value)


def substitute_env_refs(text: str, env: dict[str, dict[str, Any]]) -> str:
    def repl(m: re.Match[str]) -> str:
        table, key = m.group(1), m.group(2)
        if table not in env or key not in env[table]:
            return m.group(0)
        return lua_literal(env[table][key])

    return re.sub(r"\b([ST])\.(\w+)\b", repl, text)


def parse_local_env(content: str) -> dict[str, dict[str, Any]]:
    env: dict[str, dict[str, Any]] = {}
    for var in ("S", "T"):
        block = extract_braced_assignment(content, var)
        if not block:
            continue
        resolved = substitute_env_refs(block, env)
        env[var] = lua.decode(resolved)
    return env


def extract_return_block(content: str) -> str:
    m = re.search(r"\breturn\b", content)
    if not m:
        raise ValueError("return block not found")
    start = content.find("{", m.end())
    if start == -1:
        raise ValueError("return table not found")
    depth = 0
    for i in range(start, len(content)):
        ch = content[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return content[start : i + 1]
    raise ValueError("unclosed return block")


def load_constclass_config(file_path: Path) -> tuple[dict[str, Any], dict[str, int]]:
    content = Path(file_path).read_text(encoding="utf-8")
    env = parse_local_env(content)
    return_text = extract_return_block(content)
    return_text = substitute_env_refs(return_text, env)
    return_text = re.sub(r"--[^\n]*", "", return_text)
    return_text = return_text.replace("\n", "").replace("\r", "")
    data = lua.decode(return_text)

    col_index: dict[str, int] = {}
    fmt = data.get("format") or {}
    if isinstance(fmt, dict):
        for field, spec in fmt.items():
            if isinstance(spec, dict) and "v_i" in spec:
                col_index[field] = int(spec["v_i"])

    return data, col_index


def safe_get(row: Any, col_index: dict[str, int], key: str, default=None):
    idx = col_index.get(key)
    if not idx:
        return default
    pos = int(idx) - 1
    if isinstance(row, (list, tuple)) and 0 <= pos < len(row):
        return row[pos]
    return default


def normalize_unlock(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not isinstance(raw, (list, tuple)):
        return out
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) < 4:
            continue
        desc, object_id, typ, value = item[0], item[1], item[2], item[3]
        out.append(
            {
                "desc": desc,
                "object_id": object_id,
                "type": typ,
                "value": value,
            }
        )
    return out


def normalize_consume(raw: Any) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not isinstance(raw, (list, tuple)):
        return out
    for item in raw:
        if isinstance(item, (list, tuple)) and len(item) >= 3:
            out.append({"num": item[0], "sid": item[1], "type": item[2]})
        elif isinstance(item, dict):
            out.append(
                {
                    "num": item.get("num"),
                    "sid": item.get("sid"),
                    "type": item.get("type"),
                }
            )
    return out


def normalize_skill_ref(raw: Any) -> dict[str, Any] | None:
    if raw is None:
        return None
    if isinstance(raw, (list, tuple)) and len(raw) >= 1:
        return {"skill_id": raw[0], "skill_lv": raw[1] if len(raw) > 1 else None}
    if isinstance(raw, dict):
        return {"skill_id": raw.get("skill_id"), "skill_lv": raw.get("skill_lv")}
    return None


def normalize_attribute(raw: Any) -> list[list[Any]]:
    out: list[list[Any]] = []
    if not isinstance(raw, (list, tuple)):
        return out
    for item in raw:
        if isinstance(item, (list, tuple)) and len(item) >= 3:
            out.append([item[0], item[1], item[2]])
    return out


def rows_from_config(table_name: str, file_path: Path) -> list[dict[str, Any]]:
    data, col = load_constclass_config(file_path)
    rows: list[dict[str, Any]] = []

    for key, row in data.items():
        if key in ("format", "xc_col_index") or not isinstance(key, int):
            continue
        if not isinstance(row, (list, tuple)):
            continue

        record: dict[str, Any] = {"id": key}

        if table_name == "HeroTalentConfig":
            record["talent_layers"] = list(safe_get(row, col, "talent_layers", default=[]))
            record["skill_layers"] = list(safe_get(row, col, "skill_layers", default=[]))

        elif table_name == "HeroTalentLayersConfig":
            record["attribute_id"] = list(safe_get(row, col, "attribute_id", default=[]))
            record["max_level"] = safe_get(row, col, "max_level", default=5)
            record["unlock"] = normalize_unlock(safe_get(row, col, "unlock", default=[]))

        elif table_name == "HeroTalentAttributeConfig":
            record["attribute_level_id"] = list(safe_get(row, col, "attribute_level_id", default=[]))

        elif table_name == "HeroTalentAttributeLevelConfig":
            record["consume"] = normalize_consume(safe_get(row, col, "consume", default=[]))
            record["attribute"] = normalize_attribute(safe_get(row, col, "attribute", default=[]))

        elif table_name == "HeroTalentSkillConfig":
            record["consume"] = normalize_consume(safe_get(row, col, "consume", default=[])) or None
            record["hero_consume"] = normalize_consume(safe_get(row, col, "hero_consume", default=[])) or None
            record["general_item"] = safe_get(row, col, "general_item", default=None)
            record["showskill"] = normalize_skill_ref(safe_get(row, col, "showskill", default=None))
            record["skill"] = normalize_skill_ref(safe_get(row, col, "skill", default=None))

        rows.append(record)

    return rows


def get_supabase_client():
    load_dotenv(ROOT / ".env.local")
    load_dotenv(ROOT / ".env")
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url:
        raise RuntimeError(
            "Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env.local"
        )
    if not key:
        raise RuntimeError(
            "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n"
            "Imports require the service role key (bypasses RLS).\n"
            "Supabase Dashboard → Project Settings → API → service_role (secret).\n"
            "Do NOT use NEXT_PUBLIC_SUPABASE_ANON_KEY — it is read-only for these tables."
        )
    from supabase import create_client

    return create_client(url, key)


def upsert_rows(client, table: str, rows: list[dict[str, Any]], batch_size: int = 500) -> None:
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            client.table(table).upsert(batch, on_conflict="id").execute()
        except Exception as exc:
            print(f"ERROR upserting {table}: {exc}", file=sys.stderr)
            err = str(exc)
            if "PGRST205" in err or "schema cache" in err:
                print(
                    "\nTables missing in Supabase. Run the migration first:\n"
                    "  supabase/migrations/20250611000000_hero_talent_tables.sql\n",
                    file=sys.stderr,
                )
            elif "42501" in err or "row-level security" in err.lower():
                print(
                    "\nRLS blocked the write. Set SUPABASE_SERVICE_ROLE_KEY in .env.local\n"
                    "(Supabase Dashboard → Settings → API → service_role secret).\n"
                    "The anon key only has SELECT on HeroTalent* tables.\n",
                    file=sys.stderr,
                )
            raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Import HeroTalent Lua configs to Supabase")
    parser.add_argument("--lua-dir", type=Path, default=DEFAULT_LUA_DIR)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--export-json", type=Path, help="Export parsed rows to JSON directory")
    parser.add_argument("--no-upload", action="store_true", help="With --export-json, skip Supabase upload")
    parser.add_argument("--table", help="Import only one table")
    args = parser.parse_args()

    lua_dir: Path = args.lua_dir
    if not lua_dir.is_dir():
        print(f"ERROR: lua dir not found: {lua_dir}", file=sys.stderr)
        return 1

    targets = TALENT_FILES
    if args.table:
        targets = [t for t in TALENT_FILES if t[0] == args.table]
        if not targets:
            print(f"ERROR: unknown table {args.table}", file=sys.stderr)
            return 1

    all_rows: dict[str, list[dict[str, Any]]] = {}
    for table_name, file_name in targets:
        path = lua_dir / file_name
        if not path.exists():
            print(f"ERROR: missing {path}", file=sys.stderr)
            return 1
        rows = rows_from_config(table_name, path)
        all_rows[table_name] = rows
        expected = EXPECTED_COUNTS.get(table_name)
        status = "OK" if expected is None or len(rows) == expected else "WARN"
        print(f"[{status}] {table_name}: {len(rows)} rows from {file_name}")

    # Spot-check hero 1001 layer 1
    htc = {r["id"]: r for r in all_rows.get("HeroTalentConfig", [])}
    if 1001 in htc:
        cfg = htc[1001]
        print(f"Spot-check hero 1001: talent_layers[0]={cfg['talent_layers'][0]}, skill_layers[0]={cfg['skill_layers'][0]}")

    if args.dry_run:
        print("Dry run complete — no Supabase writes.")
        return 0

    if args.export_json:
        out_dir = args.export_json
        out_dir.mkdir(parents=True, exist_ok=True)
        for table_name, rows in all_rows.items():
            path = out_dir / f"{table_name}.json"
            path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"Exported {len(rows)} rows -> {path}")
        if not args.no_upload:
            print("Export complete.")
        if args.no_upload:
            return 0

    client = get_supabase_client()
    for table_name, rows in all_rows.items():
        print(f"Upserting {len(rows)} rows into {table_name}...")
        upsert_rows(client, table_name, rows)
        print(f"  done.")

    print("Import complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
