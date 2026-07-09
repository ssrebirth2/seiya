import re
from pathlib import Path

LEVEL_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/level/LevelConfig.lua')
AWARD_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/award/AwardConfig.lua')
ITEM_FILE = Path('C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/item/ItemConfig.lua')

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

def parse_template_table(source):
    m = re.search(r'local T=\{([\s\S]*?)\n\}\nreturn _G', source)
    t = {}
    if not m:
        return m
    for tpl, body in re.findall(r'(t_\d+)=\{([^\n]+)\}', m.group(1)):
        entries = []
        for chunk in re.findall(r'\{([^\}]+)\}', body):
            entries.append([p.strip() for p in chunk.split(',')])
        t[tpl] = entries
    return t

def resolve_token(token, s, t):
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
    m = re.match(r'^T\.(t_\d+)$', token)
    if m:
        tpl = t.get(m.group(1))
        if tpl:
            return [parse_award_tuple(e, s, t) for e in tpl]
    return None

def parse_award_tuple(parts, s, t):
    if len(parts) < 6:
        return None
    typ = resolve_token(parts[5], s, t)
    if typ != 'prop':
        return None
    sid = resolve_token(parts[3], s, t)
    num = resolve_token(parts[1], s, t)
    if sid is None or int(sid) <= 0:
        return None
    return {'sid': int(sid), 'qty': int(num) if num and int(num) > 0 else 1}

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
award_src = AWARD_FILE.read_text(encoding='utf-8', errors='ignore')
ls = parse_symbol_table(level_src)
as_ = parse_symbol_table(award_src)
at = parse_template_table(award_src)

body = extract_row(level_src, 150005)
fields = split_fields(body)
print('Level 150005 fields count:', len(fields))
for i, f in enumerate(fields[:20]):
    print(f'  [{i}] {f[:100]}')
print('...')
for i in [13, 14]:
    print(f'  [{i}] {fields[i]}')

chapter = resolve_token(fields[2], ls, {})
serial = resolve_token(fields[6], ls, {})
ftype = resolve_token(fields[1], ls, {})
first = resolve_token(fields[13], ls, {})
sweep = resolve_token(fields[14], ls, {})
print('chapter', chapter, 'serial', serial, 'function_type', ftype)
print('first_award_id', first, 'sweep_award_id', sweep)

def award_items(aid):
    body = extract_row(award_src, aid)
    if not body:
        return []
    fields = split_fields(body)
    award_field = fields[1]
    items = []
    if award_field.startswith('T.'):
        items = resolve_token(award_field, as_, at) or []
    elif award_field.startswith('{{'):
        for chunk in re.findall(r'\{([^\}]+)\}', award_field):
            p = parse_award_tuple([x.strip() for x in chunk.split(',')], as_, at)
            if p:
                items.append(p)
    return items

print('first_award items:', award_items(first))
print('sweep_award items:', award_items(sweep))

# Find all levels that grant item 10003
print('\nAll levels granting item 10003:')
for row in re.finditer(r'\[(\d+)\]=\{', level_src):
    lid = int(row.group(1))
    body = extract_row(level_src, lid)
    if not body:
        continue
    fields = split_fields(body)
    if len(fields) <= 14:
        continue
    first = resolve_token(fields[13], ls, {})
    sweep = resolve_token(fields[14], ls, {})
    for kind, aid in [('first', first), ('sweep', sweep)]:
        if not aid:
            continue
        for item in award_items(aid):
            if item['sid'] == 10003:
                ch = resolve_token(fields[2], ls, {})
                ser = resolve_token(fields[6], ls, {})
                print(f'  level {lid} ({kind}) chapter={ch} serial={ser} qty={item["qty"]} award={aid}')
