import re
from pathlib import Path

LEVEL_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/level/LevelConfig.lua')
ITEM_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/item/ItemConfig.lua')
ITEM_GET_PATH_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/item/ItemGetPathConfig.lua')

DUPLICATE_TYPE = {
    1: 'normal_level',
    2: 'hard_level',
    3: 'nightmare_level',
    4: 'npc_fight',
    5: 'natural_trial',
}

def parse_symbol_table(source):
    m = re.search(r'^local S=\{([^}]*)\}', source, re.M)
    s = {}
    if not m:
        return s
    for kind, num, raw in re.findall(r'(?:([nsb])_(\d+))=([^,}]+)', m.group(1)):
        key = f'{kind}_{num}'
        if raw.startswith('"'):
            s[key] = raw[1:-1]
        elif raw == 'true':
            s[key] = True
        elif raw == 'false':
            s[key] = False
        elif re.fullmatch(r'-?\d+', raw):
            s[key] = int(raw)
    return s

def resolve_token(token, s):
    token = str(token or '').strip()
    if not token or token == 'nil':
        return None
    if re.fullmatch(r'-?\d+', token):
        return int(token)
    if token.startswith('"'):
        return token[1:-1]
    m = re.match(r'^S\.(b_\d+|n_\d+|s_\d+)$', token)
    if m:
        return s.get(m.group(1))
    return None

def split_fields(body):
    fields, cur, depth = [], '', 0
    for ch in body:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        if ch == ',' and depth == 0:
            fields.append(cur.strip())
            cur = ''
            continue
        cur += ch
    if cur.strip():
        fields.append(cur.strip())
    return fields

def extract_row(source, row_id):
    m = re.search(rf'\[{row_id}\]=\{{', source)
    if not m:
        return None
    i = m.end()
    depth = 1
    while i < len(source) and depth > 0:
        if source[i] == '{':
            depth += 1
        elif source[i] == '}':
            depth -= 1
        i += 1
    return source[m.end() : i - 1]

level_src = LEVEL_FILE.read_text(encoding='utf-8', errors='ignore')
ls = parse_symbol_table(level_src)

print('Levels 150001-150010:')
for lid in range(150001, 150011):
    body = extract_row(level_src, lid)
    if not body:
        continue
    fields = split_fields(body)
    ftype = resolve_token(fields[1], ls)
    chapter = resolve_token(fields[2], ls)
    serial = resolve_token(fields[6], ls)
    first = resolve_token(fields[13], ls)
    sweep = resolve_token(fields[14], ls)
    get_path = fields[11] if len(fields) > 11 else None
    print(
        f'  {lid}: type={ftype} ({DUPLICATE_TYPE.get(ftype, "?")}) '
        f'chapter={chapter} serial={serial} first={first} sweep={sweep} get_path={get_path}'
    )

item_src = ITEM_FILE.read_text(encoding='utf-8', errors='ignore')
body = extract_row(item_src, 10003)
fields = split_fields(body)
print('\nItem 10003 fields:')
for i, f in enumerate(fields):
    print(f'  [{i}] {f[:120]}')

# Compare with a real story level around chapter 1
print('\nSample normal story levels in chapter 1:')
count = 0
for row in re.finditer(r'\[(\d+)\]=\{', level_src):
    lid = int(row.group(1))
    body = extract_row(level_src, lid)
    if not body:
        continue
    fields = split_fields(body)
    if len(fields) <= 14:
        continue
    ftype = resolve_token(fields[1], ls)
    chapter = resolve_token(fields[2], ls)
    if ftype == 1 and chapter == 1:
        serial = resolve_token(fields[6], ls)
        first = resolve_token(fields[13], ls)
        print(f'  {lid}: serial={serial} first_award={first}')
        count += 1
        if count >= 8:
            break
