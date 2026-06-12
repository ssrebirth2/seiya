#!/usr/bin/env python3
"""
Import Spirit* Lua configs into Supabase.

Usage:
  python scripts/import-spirit-configs.py --dry-run
  python scripts/import-spirit-configs.py --lua-dir "C:/path/to/TextAsset"

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

SPIRIT_FILES = [
    ("SpiritConfig", "SpiritConfig.lua"),
    ("SpiritStarIndexConfig", "SpiritStarIndexConfig.lua"),
    ("SpiritStarConfig", "SpiritStarConfig.lua"),
    ("SpiritAttrConfig", "SpiritAttrConfig.lua"),
    ("SpiritLevelConfig", "SpiritLevelConfig.lua"),
    ("SpiritStarLevelConfig", "SpiritStarLevelConfig.lua"),
    ("SpiritRiseQualityInfoConfig", "SpiritRiseQualityInfoConfig.lua"),
    ("SpiritStarLossConfig", "SpiritStarLossConfig.lua"),
]

EXPECTED_COUNTS = {
    "SpiritConfig": 31,
    "SpiritStarIndexConfig": 4,
    "SpiritStarConfig": 22,
    "SpiritAttrConfig": 5,
    "SpiritLevelConfig": 140,
    "SpiritStarLevelConfig": 70,
    "SpiritRiseQualityInfoConfig": 3,
    "SpiritStarLossConfig": 7,
}

SPIRIT_RESOURCE_ID_MIN = 82010
SPIRIT_RESOURCE_ID_MAX = 82310


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

        if table_name == "SpiritConfig":
            record["name"] = safe_get(row, col, "name")
            record["desc"] = safe_get(row, col, "desc")
            record["init_quality"] = safe_get(row, col, "init_quality")
            record["score_min"] = safe_get(row, col, "score_min")
            record["score_max"] = safe_get(row, col, "score_max")
            record["skill_id"] = safe_get(row, col, "skill_id")
            record["skins"] = safe_get(row, col, "skins")
            is_rare = safe_get(row, col, "isRare", default=False)
            record["isRare"] = bool(is_rare) if is_rare is not None else False

        elif table_name == "SpiritStarIndexConfig":
            raw_list = safe_get(row, col, "list", default=[])
            record["list"] = list(raw_list) if raw_list else []

        elif table_name == "SpiritStarConfig":
            record["star_min"] = safe_get(row, col, "star_min")
            record["star_max"] = safe_get(row, col, "star_max")
            record["spirit_team_attribute"] = normalize_attribute(
                safe_get(row, col, "spirit_team_attribute", default=[])
            ) or None
            record["spirit_team_attribute_percent"] = normalize_attribute(
                safe_get(row, col, "spirit_team_attribute_percent", default=[])
            ) or None
            record["spirit_team_attribute_sum"] = normalize_attribute(
                safe_get(row, col, "spirit_team_attribute_sum", default=[])
            ) or None
            record["soul_consume"] = normalize_consume(
                safe_get(row, col, "soul_consume", default=[])
            ) or None
            record["skill_level"] = safe_get(row, col, "skill_level")
            record["lv_max"] = safe_get(row, col, "lv_max")

        elif table_name == "SpiritAttrConfig":
            record["spirit_attribute"] = normalize_attribute(
                safe_get(row, col, "spirit_attribute", default=[])
            )
            record["spirit_foundation_attribute"] = normalize_attribute(
                safe_get(row, col, "spirit_foundation_attribute", default=[])
            )

        elif table_name in ("SpiritLevelConfig", "SpiritStarLevelConfig"):
            record["exp"] = safe_get(row, col, "exp")
            record["sumexp"] = safe_get(row, col, "sumexp")

        elif table_name == "SpiritRiseQualityInfoConfig":
            record["unlock_self"] = normalize_unlock(
                safe_get(row, col, "unlock_self", default=[])
            ) or None
            record["unlock_material"] = normalize_unlock(
                safe_get(row, col, "unlock_material", default=[])
            ) or None
            record["num"] = safe_get(row, col, "num")

        elif table_name == "SpiritStarLossConfig":
            record["min"] = safe_get(row, col, "min")
            record["max"] = safe_get(row, col, "max")
            record["value"] = safe_get(row, col, "value")

        rows.append(record)

    return rows


def rows_from_artifact_resources(file_path: Path) -> list[dict[str, Any]]:
    data, col = load_constclass_config(file_path)
    rows: list[dict[str, Any]] = []

    for key, row in data.items():
        if key in ("format", "xc_col_index") or not isinstance(key, int):
            continue
        if key < SPIRIT_RESOURCE_ID_MIN or key > SPIRIT_RESOURCE_ID_MAX:
            continue
        if not isinstance(row, (list, tuple)):
            continue

        rows.append(
            {
                "id": key,
                "model": safe_get(row, col, "model"),
                "preview_icon": safe_get(row, col, "preview_icon"),
                "show_icon": safe_get(row, col, "show_icon"),
                "item_icon": safe_get(row, col, "item_icon"),
            }
        )

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
            "Supabase Dashboard → Project Settings → API → service_role (secret)."
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
                    "  supabase/migrations/20250612000000_spirit_tables.sql\n",
                    file=sys.stderr,
                )
            raise


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Spirit Lua configs to Supabase")
    parser.add_argument("--lua-dir", type=Path, default=DEFAULT_LUA_DIR)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--export-json", type=Path, help="Export parsed rows to JSON directory")
    parser.add_argument("--no-upload", action="store_true", help="With --export-json, skip Supabase upload")
    parser.add_argument("--table", help="Import only one table")
    parser.add_argument(
        "--import-resources",
        action="store_true",
        help="Also upsert spirit rows into ArtifactResourcesConfig",
    )
    args = parser.parse_args()

    lua_dir: Path = args.lua_dir
    if not lua_dir.is_dir():
        print(f"ERROR: lua dir not found: {lua_dir}", file=sys.stderr)
        return 1

    targets = SPIRIT_FILES
    if args.table:
        targets = [t for t in SPIRIT_FILES if t[0] == args.table]
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

    resource_path = lua_dir / "ArtifactResourcesConfig.lua"
    resource_rows: list[dict[str, Any]] = []
    if args.import_resources and resource_path.exists():
        resource_rows = rows_from_artifact_resources(resource_path)
        print(f"[OK] ArtifactResourcesConfig (spirit slice): {len(resource_rows)} rows")

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
        if resource_rows:
            path = out_dir / "ArtifactResourcesConfig_spirit.json"
            path.write_text(
                json.dumps(resource_rows, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"Exported {len(resource_rows)} rows -> {path}")
        if args.no_upload:
            return 0

    client = get_supabase_client()
    for table_name, rows in all_rows.items():
        print(f"Upserting {len(rows)} rows into {table_name}...")
        upsert_rows(client, table_name, rows)
        print("  done.")

    if resource_rows:
        print(f"Upserting {len(resource_rows)} spirit resource rows into ArtifactResourcesConfig...")
        upsert_rows(client, "ArtifactResourcesConfig", resource_rows)
        print("  done.")

    print("Import complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
