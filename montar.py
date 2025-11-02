# montar.py
# Novo pipeline: extrai tudo dos .lua -> grava em CSV (EN e CN)
# e gera dois HTMLs "esqueleto" que leem o CSV no client (fetch).
#
# Novidade deste patch:
# - Integração com RoleResourcesConfig.lua via RoleConfig.role_initial_skins (ID numérica)
# - Campo novo no CSV: hero_card_icon
# - Cabeçalho do herói exibe a imagem (alinhada à esquerda) no tamanho natural do PNG.
# - (NOVO) Card "Relations": Bonds / Combine Skill / Combine States
#
# Mantido:
# - RoleConfig como fonte central de skills.
# - Awaken usa awaken_skill_des (todas as linhas), sem sketch/conditions.
# - Quality — Extra skill (last stage).
# - UI sempre em EN (mesmo no HTML CN).
# - Rótulos bonitos no Profile e remoção dos campos indesejados.
# - Normalização de <color>, <link>, labels/taxonomias (HeroTypeDescConfig),
#   SkillValue/Features/Labels e substituição de valores {0}.
#
# Saídas:
# - heroes_EN.csv, heroes_CN.csv (1 linha por herói):
#   hero_id, hero_name, hero_card_icon, profile_json, quality_extra_skill_json,
#   awaken_added_skills_json, normal_skills_json, relations_json
# - herois_e_skills_EN.html, herois_e_skills_CN.html (esqueleto + JS)
#
# Observação: ícones de skills continuam em assets/resources/textures/hero/skillicon/texture

import os
import re
import json
import csv
from slpp import slpp as lua

# ----------------------------- Utilidades de parsing de LUA -----------------------------
def resolve_path(base, *relative_candidates):
    tried = []
    for rel in relative_candidates:
        p1 = os.path.join(base, rel)
        tried.append(p1)
        if os.path.exists(p1):
            return p1
        tried.append(rel)
        if os.path.isabs(rel) and os.path.exists(rel):
            return rel
    raise FileNotFoundError("Nenhum caminho válido encontrado. Tentativas:\n  " + "\n  ".join(tried))

def parse_lua_constants(lines):
    constants = {}
    pattern = re.compile(r'local\s+(f\d+)\s*=\s*(.+)')
    for raw in lines:
        line = raw.strip()
        m = pattern.match(line)
        if not m:
            continue
        key = m.group(1)
        val = m.group(2).strip()
        try:
            if val.startswith("{") and val.endswith("}"):
                constants[key] = lua.decode(val)
            else:
                constants[key] = lua.decode(val) if (val.startswith("{") or val.startswith('"') or val.startswith("'")) else eval(val)
        except Exception:
            constants[key] = val
    return constants

def replace_constants_in_text(text, constants):
    keys_sorted = sorted(constants.keys(), key=len, reverse=True)

    def encode_lua(v):
        if isinstance(v, (list, tuple, dict)):
            return lua.encode(v)
        if isinstance(v, str):
            s = v.replace('\\', '\\\\').replace('"', '\\"')
            return f'"{s}"'
        if isinstance(v, bool):
            return 'true' if v else 'false'
        return str(v)

    for key in keys_sorted:
        rep_str = encode_lua(constants[key])
        pattern = r'\b' + re.escape(key) + r'\b'
        text = re.sub(pattern, lambda m: rep_str, text)
    return text

def extract_return_block(lines):
    start_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith("return"):
            start_idx = i
            break
    if start_idx is None:
        raise ValueError("Bloco 'return' não encontrado")
    brace = 0
    started = False
    out = []
    for line in lines[start_idx:]:
        if "{" in line:
            brace += line.count("{")
            started = True
        if "}" in line:
            brace -= line.count("}")
        out.append(line)
        if started and brace == 0:
            break
    return out

def clean_return_text(return_lines, constants):
    txt = "".join(return_lines)
    if txt.strip().startswith("return"):
        txt = txt.strip()[6:].strip()
    txt = replace_constants_in_text(txt, constants)
    txt = re.sub(r'--.*', '', txt)
    txt = txt.replace('\n', '').replace('\r', '')
    return txt

def load_lua_table_with_index(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    constants = parse_lua_constants(lines)
    block = extract_return_block(lines)
    txt = clean_return_text(block, constants)
    data = lua.decode(txt)
    col_index = data.get("xc_col_index", {})
    if not col_index:
        print("⚠ Atenção: 'xc_col_index' ausente ou vazio em {}".format(file_path))
    return data, col_index, constants

# ----------------------------- Normalização de <color> -----------------------------
def normalize_color_tags(text: str) -> str:
    if text is None or not isinstance(text, str) or not text:
        return text
    text = text.replace('</span></color>', '</span>')
    text = re.sub(r'<\s*color\s*=\s*#[0-9A-Fa-f]{6}\s*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</\s*color\s*>', '', text, flags=re.IGNORECASE)
    return text

# ----------------------------- Traduções + formatações -----------------------------
def load_translations(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    start = content.find('{')
    end = content.rfind('}')
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Não encontrou o bloco de traduções entre chaves")
    block = content[start+1:end]
    pattern = re.compile(r'\[\s*"([^"]+)"\s*\]\s*=\s*"((?:[^"\\]|\\.)*)"')
    translations = {}
    for m in pattern.finditer(block):
        key = m.group(1)
        val = m.group(2)
        try:
            val = val.replace(r'\n', '<br>')
            val = bytes(val, 'latin1').decode('utf-8')
        except Exception:
            pass
        val = normalize_color_tags(val)
        translations[key] = val
    return translations

def substitute_values(text, values):
    if not text:
        return text
    if not isinstance(values, (list, tuple)):
        values = [values]
    out = text
    for i, v in enumerate(values):
        out = out.replace("{" + str(i) + "}", str(v))
    return normalize_color_tags(out)

def replace_link_tags(text, features, translations):
    pattern = re.compile(r'<link=(\d+)>(.*?)</link>')
    def repl(m):
        try:
            feature_id = int(m.group(1))
        except:
            return m.group(2)
        feature_data = features.get(feature_id)
        if not feature_data or len(feature_data) < 3:
            return m.group(2)
        name_key = feature_data[1]
        desc_key = feature_data[2]
        name_text = translations.get(name_key, "[{}]".format(name_key))
        desc_text = translations.get(desc_key, "[{}]".format(desc_key))
        html = (
            '<span class="tooltip-container" onclick="event.stopPropagation(); closeAllTooltips(); this.classList.toggle(\'active\');">'
            '<span style="cursor:pointer; font-weight:bold; color:#800080">{}</span>'
            '<span class="tooltip-text">{}</span>'
            '</span>'
        ).format(name_text, desc_text)
        return html
    out = pattern.sub(repl, text)
    return normalize_color_tags(out)

def is_empty_placeholder(val):
    if val in (None, '', []):
        return True
    if isinstance(val, str) and val.strip().upper().startswith('_DEFAULT_EMPTY_T'):
        return True
    return False

def load_skill_label_config(file_path):
    data, _, _ = load_lua_table_with_index(file_path)
    if "xc_col_index" in data:
        del data["xc_col_index"]
    label_map = {}
    for k, v in data.items():
        if isinstance(k, int) and isinstance(v, (list, tuple)) and len(v) >= 3:
            label_map[k] = v[2]
    return label_map

def safe_get(row, col_index, key, default=None):
    idx = col_index.get(key)
    if not idx:
        return default
    pos = int(idx) - 1
    if isinstance(row, (list, tuple)) and 0 <= pos < len(row):
        return row[pos]
    return default

# ----------------------------- Awaken (somente Added Skills) -----------------------------
def load_hero_awaken_config(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    out = {}
    for k, v in data.items():
        if k == "xc_col_index" or not isinstance(k, int):
            continue
        unlock = safe_get(v, col, "unlock", default=None)
        a_list = safe_get(v, col, "awaken_list", default=[])
        a_show = safe_get(v, col, "awaken_show_list", default=[])
        out[k] = {
            "unlock": unlock,
            "awaken_list": list(a_list) if isinstance(a_list, (list, tuple)) else [],
            "awaken_show_list": list(a_show) if isinstance(a_show, (list, tuple)) else [],
        }
    return out, col

def load_hero_awaken_info(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    return data, col

# ----------------------------- Helpers de formatação -----------------------------
def format_cd(cd_val, ui):
    try:
        cd_num = int(cd_val)
        return ui["no_cd"] if cd_num == -1 else str(cd_num)
    except Exception:
        return "-" if cd_val in (None, '') else str(cd_val)

def translate_skill_type(val, translations):
    try:
        id_num = int(val)
        key = f"LC_SKILL_type_des_{id_num}"
        out = translations.get(key, f"[{key}]")
        return "Normal Attack" if out == "Nomal Attack" else out
    except Exception:
        return "" if val is None else str(val)

def pretty_placeholder(val):
    if val in (None, ''):
        return "-"
    if isinstance(val, (list, tuple)):
        return ", ".join([pretty_placeholder(v) for v in val]) if val else "-"
    if isinstance(val, dict):
        return "; ".join([f"{k}:{pretty_placeholder(v)}" for k, v in val.items()]) if val else "-"
    return str(val)

def resolve_values_ref(values, skill_values):
    if isinstance(values, int) or (isinstance(values, str) and values.isdigit()):
        vid = int(values)
        return skill_values.get(vid, [])
    if isinstance(values, (list, tuple)) and len(values) == 1:
        v0 = values[0]
        if isinstance(v0, int) or (isinstance(v0, str) and str(v0).isdigit()):
            vid = int(v0)
            return skill_values.get(vid, [])
    return values

def strip_br_inline(html_text):
    if not isinstance(html_text, str):
        return html_text
    return re.sub(r'\s*<br\s*/?>\s*', ' ', html_text).strip()

def build_sketch_lines_from_raw(sketch_val, translations, features, skill_values):
    lines = []
    if isinstance(sketch_val, list) and sketch_val and isinstance(sketch_val[0], dict):
        for item in sketch_val:
            des_key = item.get('des')
            if is_empty_placeholder(des_key):
                text = "-"
            else:
                base = translations.get(des_key, des_key)
                if is_empty_placeholder(base):
                    text = des_key
                else:
                    values_entry = resolve_values_ref(item.get('value'), skill_values)
                    text = substitute_values(base, values_entry if values_entry is not None else [])
                    text = replace_link_tags(text, features, translations)
                    text = strip_br_inline(text)
            lines.append(normalize_color_tags(text if text else "-"))
    else:
        html = str(sketch_val) if sketch_val is not None else ""
        if is_empty_placeholder(html.strip()):
            return []
        parts = [p.strip() for p in re.split(r'<br\s*/?>', html) if p.strip()]
        lines = ["-" if is_empty_placeholder(p) else strip_br_inline(normalize_color_tags(p)) for p in parts] if parts else []
    return lines

def build_condition_lines_from_raw(cond_val, translations, ui):
    out = []
    if isinstance(cond_val, list) and cond_val and isinstance(cond_val[0], dict):
        for it in cond_val:
            cond_key = it.get('condition')
            lv_val = it.get('lv', None)
            base = translations.get(cond_key, cond_key if cond_key else ui["not_found"])
            if is_empty_placeholder(base):
                base = cond_key if cond_key else ui["not_found"]
            if lv_val is not None:
                txt = substitute_values(base, lv_val) if "{0}" in base else f"{base} (Lv {lv_val})"
            else:
                txt = base
            out.append(strip_br_inline(normalize_color_tags(txt)))
    else:
        html = str(cond_val) if cond_val is not None else ""
        if is_empty_placeholder(html.strip()):
            return []
        parts = [p.strip() for p in re.split(r'<br\s*/?>', html) if p.strip()]
        out = ["-" if is_empty_placeholder(p) else strip_br_inline(normalize_color_tags(p)) for p in parts] if parts else []
    return out

def _cond_to_stars_prefix(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = text.strip()
    t = t.replace("（", "(").replace("）", ")")
    t = re.sub(r'\(\s*Lv\s*\d+\s*\)', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\(\s*等级\s*\d+\s*\)', '', t)
    patterns = [
        r'(\d+)\s*star[s]?',
        r'(\d+)\s*★',
        r'★\s*(\d+)',
        r'(\d+)\s*星(?:级)?',
    ]
    for pat in patterns:
        m = re.search(pat, t, flags=re.IGNORECASE)
        if m:
            try:
                return f"{int(m.group(1))}★"
            except:
                pass
    return ""

def pair_sketch_with_conditions_struct(sketch_lines, cond_lines, ui):
    out = []
    n = max(len(sketch_lines), len(cond_lines))
    for i in range(n):
        s = sketch_lines[i] if i < len(sketch_lines) else "-"
        c = cond_lines[i] if i < len(cond_lines) else ""
        prefix = _cond_to_stars_prefix(c)
        if prefix:
            out.append(f'{prefix} {s}')
        else:
            out.append(f'{s}')
    return out

def render_value_cell(val, translations, features, ui, skill_values, prefer_awaken=False):
    if isinstance(val, list) and val and isinstance(val[0], dict) and 'des' in val[0]:
        descricoes = []
        for item in val:
            des_key = item['des']
            base = translations.get(des_key, des_key)
            if is_empty_placeholder(base):
                base = des_key
            values_entry = resolve_values_ref(item.get('value'), skill_values)
            texto_final = substitute_values(base, values_entry if values_entry is not None else [])
            texto_final = replace_link_tags(texto_final, features, translations)
            descricoes.append(normalize_color_tags(texto_final))
        return descricoes if prefer_awaken else "<br><br>".join(descricoes) if descricoes else "-"
    if isinstance(val, str):
        v = translations.get(val, val)
        if is_empty_placeholder(v):
            v = val
        v = replace_link_tags(v, features, translations)
        return normalize_color_tags(v)
    return "" if val is None else str(val)

# ----------------------------- HTML base (esqueleto que lê CSV) -----------------------------
CSS_BASE = '''
    body { font-family: Arial, sans-serif; background-color: #f9f9f9; color: #222; padding: 20px; }
    h1 { color: #333366; margin-top: 0; }
    h2 { color: #444; margin: 0 0 6px 0; }
    h3 { color: #555; margin-bottom: 6px; }
    .card { background:#fff; border:1px solid #ddd; border-radius:8px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
    .muted { color:#666; }
    label { font-weight:600; }
    select, button { padding:6px 8px; border-radius:6px; border:1px solid #bbb; background:#fff; cursor:pointer; }
    button:hover { background:#f2f2f2; }
    .hero-layout { display:flex; gap:16px; align-items:flex-start; }
    .hero-left { flex:0 0 auto; }
    .hero-left img { display:block; }
    .hero-right { flex:1 1 auto; display:flex; flex-direction:column; gap:12px; min-width:0; }
    .stack { display:flex; flex-direction:column; gap:12px; }
    .two { display:flex; gap:12px; flex-wrap:wrap; }
    .two > .card { flex:1 1 420px; min-width:320px; }
    .tooltip-container { position:relative; display:inline-block; }
    .tooltip-container .tooltip-text { display:none; position:absolute; top:100%; left:0; background:#fff; border:1px solid #993399; padding:8px; max-width:600px; min-width:200px; min-height:80px; max-height:300px; overflow:auto; z-index:1000; user-select:text; white-space:normal; box-shadow:0 2px 8px rgba(0,0,0,0.2); border-radius:4px; margin-top:4px; }
    .tooltip-container.active .tooltip-text { display:block; }
    .hero-head { display:flex; align-items:center; gap:12px; }
    .hero-head img { display:block; }
    .small { font-size:12px; }
    .skill-mini { margin: 8px 0 0 0; padding:10px; border:1px solid #eee; border-radius:8px; }
    .skill-mini .meta { font-size:12px; color:#666; margin-bottom:6px; }
    .skill-mini ul { margin:6px 0 0 18px; }
    .subskills { margin-top:8px; margin-left:16px; border-left:2px solid #e5e5e5; padding-left:12px; }
    .subskills .skill-mini { margin-top:8px; }
    .warn { padding:8px 10px; border-radius:6px; background:#fff8e6; border:1px solid #f4d27b; color:#7a5b00; }
    .bond { margin: 6px 0; }
    .bond .title { font-weight:700; }
    .bond .meta { font-size:12px; color:#666; margin-top:2px; }
    .bond ul { margin:6px 0 0 18px; }
    @media (max-width: 900px){
      .hero-layout { flex-direction:column; }
    }  
'''

JS_SKELETON = r'''
<script>
const UI = {
  title: "Datamine - Hero",
  hero_label_ui: "Hero",
  role_profile: "Profile",
  quality_extra: "Quality Skill",
  awaken_added_skills: "Awaken Skill",
  skills: "Skills",
  relations: "Relations",
  bonds: "Bonds",
  combine_skill: "Combine Skill",
  combine_states: "Combine States",
  no_bonds: "No bonds.",
  no_combine_skill: "No combine skill.",
  no_combine_states: "No combine states.",
  no_skills: "No skills mapped for this hero.",
  type: "Type",
  cd: "Cooldown",
  no_cd: "-",
  tags: "Tags",
  level: "Level",
  condition: "Condition",
  partners: "Partners",
  bonuses: "Bonuses",
  sub_prefix: "SubSkill: ",
  not_found: "[not found]"
};

function closeAllTooltips(){ document.querySelectorAll('.tooltip-container.active').forEach(el => el.classList.remove('active')); }
document.addEventListener('click', () => closeAllTooltips());

function byId(id){ return document.getElementById(id); }

function makeEl(tag, attrs={}, html=""){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){ el.setAttribute(k, v); }
  if (html) el.innerHTML = html;
  return el;
}

// CSV parser simples
function parseCSV(text){
  const rows = [];
  let i=0, cur="", row=[], inQuotes=false;
  while(i<text.length){
    const ch = text[i];
    if (inQuotes){
      if (ch === '"'){
        if (text[i+1] === '"'){ cur+='"'; i+=2; continue; }
        inQuotes = false; i++; continue;
      } else { cur += ch; i++; continue; }
    } else {
      if (ch === '"'){ inQuotes = true; i++; continue; }
      if (ch === ','){ row.push(cur); cur=""; i++; continue; }
      if (ch === '\n'){
        row.push(cur); rows.push(row); row=[]; cur=""; i++; continue;
      }
      if (ch === '\r'){ i++; continue; }
      cur += ch; i++;
    }
  }
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  if (!rows.length) return {header:[], data:[]};
  const header = rows.shift();
  return { header, data: rows };
}

function safeJSON(str, fallback=null){
  try { return JSON.parse(str); } catch(e){ return fallback; }
}

let HEROES = [];

function renderAll(){
  const sel = byId('hero-select');
  const container = byId('heroes-container');
  sel.innerHTML = "";
  container.innerHTML = "";

  HEROES.sort((a,b) => (a.hero_id - b.hero_id));
  for (const h of HEROES){
    const opt = makeEl('option', { value: h.hero_id }, `${h.hero_name} (ID ${h.hero_id})`);
    sel.appendChild(opt);
    container.appendChild(renderHero(h));
  }
  if (sel.options.length>0) showHero(sel.value);
}

function showHero(id){
  document.querySelectorAll('.hero').forEach(d => d.style.display = 'none');
  const t = byId('hero-'+id);
  if(t){ t.style.display = 'block'; }
}

function esc(s){ return s == null ? "" : String(s); }

function renderSkillCardHTML(s, includeSub){
  const icon = s.icon ? `<img src="${s.icon}" alt="Icon ${esc(s.id)}" style="width:48px;height:48px;margin-right:6px;">` : "";
  const meta = `<div class="meta"><strong>${UI.type}:</strong> ${esc(s.type)} &nbsp;|&nbsp; <strong>${UI.cd}:</strong> ${esc(s.cd)} &nbsp;|&nbsp; <strong>${UI.tags}:</strong> ${esc(s.tags || '-')}</div>`;
  let body = "";
  if (s.prefer_awaken){
    if (Array.isArray(s.description_lines) && s.description_lines.length){
      body = `<div>` + s.description_lines.map(t => `<div>${t}</div>`).join('') + `</div>`;
    } else {
      body = `<div>${esc(s.description)}</div>`;
    }
  } else {
    const firstLine = s.description_first || s.description || "-";
    body = `<div>${firstLine}</div>`;
    if (Array.isArray(s.sketch_lines) && s.sketch_lines.length){
      body += `<ul>` + s.sketch_lines.map(l => `<li>${l}</li>`).join('') + `</ul>`;
    }
  }

  let sub = "";
  if (includeSub && Array.isArray(s.subskills) && s.subskills.length){
    sub = `<div class="subskills">` + s.subskills.map(x => renderSkillCardHTML(x, false)).join('') + `</div>`;
  }

  const titleExtra = s.relation_name ? `<div class="muted small">${esc(s.relation_name)} — <strong>${UI.partners}:</strong> ${esc((s.partners||[]).join(', ') || '-')}</div>` : "";
  const header = `
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
    ${icon}<div><strong>${esc(s.name_prefix || '')}${esc(s.name)}</strong> <span class="muted small">(Skill ID ${esc(s.id)})</span>${titleExtra}</div>
  </div>`;

  return `<div class="skill-mini">${header}${meta}${body}${sub}</div>`;
}

function renderRelationsCard(hero){
  const box = makeEl('div', { class:'card' });
  box.innerHTML = `<h3>${UI.relations}</h3>`;

  const rel = safeJSON(hero.relations_json, { bonds:[], combine_skills:[], combine_states:[] });

  // Bonds
  const bondsWrap = makeEl('div');
  bondsWrap.innerHTML = `<h4 style="margin:8px 0 4px">${UI.bonds}</h4>`;
  if (!rel.bonds || !rel.bonds.length){
    bondsWrap.innerHTML += `<div class="muted small">${UI.no_bonds}</div>`;
  } else {
    rel.bonds.forEach(b => {
      const li = document.createElement('div');
      li.className = 'bond';
      const bonuses = (b.attributes||[]).map(x => `<li>${x}</li>`).join('');
      li.innerHTML = `
        <div class="title">${esc(b.name)}</div>
        <div class="meta"><strong>${UI.partners}:</strong> ${esc((b.partners||[]).join(', ') || '-')}</div>
        <div class="meta"><strong>${UI.bonuses}:</strong></div>
        <ul>${bonuses}</ul>
      `;
      bondsWrap.appendChild(li);
    });
  }
  box.appendChild(bondsWrap);

  // Combine Skill
  const csWrap = makeEl('div');
  csWrap.innerHTML = `<h4 style="margin:12px 0 4px">${UI.combine_skill}</h4>`;
  if (!rel.combine_skills || !rel.combine_skills.length){
    csWrap.innerHTML += `<div class="muted small">${UI.no_combine_skill}</div>`;
  } else {
    csWrap.innerHTML += rel.combine_skills.map(s => renderSkillCardHTML(s, false)).join('');
  }
  box.appendChild(csWrap);

  // Combine States
  const stWrap = makeEl('div');
  stWrap.innerHTML = `<h4 style="margin:12px 0 4px">${UI.combine_states}</h4>`;
  if (!rel.combine_states || !rel.combine_states.length){
    stWrap.innerHTML += `<div class="muted small">${UI.no_combine_states}</div>`;
  } else {
    stWrap.innerHTML += rel.combine_states.map(s => renderSkillCardHTML(s, false)).join('');
  }
  box.appendChild(stWrap);

  return box;
}

function renderHero(hero){
  const wrap = makeEl('div', { id: 'hero-'+hero.hero_id, class: 'hero' });
  const layout = makeEl('div', { class: 'hero-layout' });

  const left = makeEl('div', { class: 'hero-left' });
  if (hero.hero_card_icon){
    const img = makeEl('img', { src: hero.hero_card_icon, alt: `Hero ${hero.hero_id} Card` });
    left.appendChild(img);
  }

  const right = makeEl('div', { class: 'hero-right' });

  const header = makeEl('div', { class: 'hero-head' }, `<div><h2>${hero.hero_name}</h2></div>`);

  const profTable = makeEl('table', { style:'width:100%; border-collapse:collapse;' });
  const profile = safeJSON(hero.profile_json, []);
  for (const [label, value] of profile){
    const tr = document.createElement('tr');
    const td1 = makeEl('td', { class:'small', style:'width:220px; padding:6px 8px; border-bottom:1px solid #eee;' }, `<strong>${label}</strong>`);
    const td2 = makeEl('td', { style:'padding:6px 8px; border-bottom:1px solid #eee;' }, value || '-');
    tr.appendChild(td1); tr.appendChild(td2);
    profTable.appendChild(tr);
  }
  const profileCard = makeEl('div', { class:'card' });
  profileCard.innerHTML = `<h3>${UI.role_profile}</h3>`;
  profileCard.appendChild(profTable);

  const qualitySkill = safeJSON(hero.quality_extra_skill_json, null);
  let qualityCard = null;
  if (qualitySkill){
    qualityCard = makeEl('div', { class:'card' });
    qualityCard.innerHTML = `<h3>${UI.quality_extra}</h3>` + renderSkillCardHTML(qualitySkill, false);
  }

  const awakenSkills = safeJSON(hero.awaken_added_skills_json, []);
  let awakenCard = null;
  if (awakenSkills && awakenSkills.length){
    awakenCard = makeEl('div', { class:'card' });
    awakenCard.innerHTML = `<h3>${UI.awaken_added_skills}</h3>` + awakenSkills.map(s => renderSkillCardHTML(s, false)).join('');
  }

  const normalSkills = safeJSON(hero.normal_skills_json, []);
  const skillsCard = makeEl('div', { class:'card' });
  skillsCard.innerHTML = `<h3>${UI.skills}</h3>`;
  if (!normalSkills.length){
    skillsCard.innerHTML += `<div class="muted small">${UI.no_skills}</div>`;
  } else {
    skillsCard.innerHTML += normalSkills.map(s => renderSkillCardHTML(s, true)).join('');
  }

  // (NOVO) Relations
  const relationsCard = renderRelationsCard(hero);

  right.appendChild(header);
  right.appendChild(profileCard);
  if (qualityCard) right.appendChild(qualityCard);
  if (awakenCard) right.appendChild(awakenCard);
  right.appendChild(skillsCard);
  right.appendChild(relationsCard);

  layout.appendChild(left);
  layout.appendChild(right);
  wrap.appendChild(layout);
  return wrap;
}

async function loadCSV(path){
  try{
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    const { header, data } = parseCSV(text);
    const idx = {};
    header.forEach((h,i) => idx[h] = i);
    HEROES = data.map(row => ({
      hero_id: Number(row[idx["hero_id"]]),
      hero_name: row[idx["hero_name"]],
      hero_card_icon: row[idx["hero_card_icon"]],
      profile_json: row[idx["profile_json"]],
      quality_extra_skill_json: row[idx["quality_extra_skill_json"]],
      awaken_added_skills_json: row[idx["awaken_added_skills_json"]],
      normal_skills_json: row[idx["normal_skills_json"]],
      relations_json: row[idx["relations_json"]],
    }));
    renderAll();
    byId('fallback').style.display='none';
  } catch(e){
    console.warn("Falha ao carregar CSV via fetch:", e);
    byId('fallback').style.display='block';
  }
}

function onCSVUpload(ev){
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const { header, data } = parseCSV(text);
    const idx = {};
    header.forEach((h,i) => idx[h] = i);
    HEROES = data.map(row => ({
      hero_id: Number(row[idx["hero_id"]]),
      hero_name: row[idx["hero_name"]],
      hero_card_icon: row[idx["hero_card_icon"]],
      profile_json: row[idx["profile_json"]],
      quality_extra_skill_json: row[idx["quality_extra_skill_json"]],
      awaken_added_skills_json: row[idx["awaken_added_skills_json"]],
      normal_skills_json: row[idx["normal_skills_json"]],
      relations_json: row[idx["relations_json"]],
    }));
    renderAll();
    byId('fallback').style.display='none';
  };
  reader.readAsText(file, 'utf-8');
}

window.addEventListener('DOMContentLoaded', () => {
  const csvPath = document.body.getAttribute('data-csv');
  if (csvPath){ loadCSV(csvPath); }
});
</script>
'''

HTML_TEMPLATE = r'''<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Heroes & Skills — EN</title>
<style>{CSS}</style>
</head>
<body data-csv="{CSV_PATH}">
<h1>Heroes & Skills — EN</h1>

<div class="card" style="margin-bottom:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
  <label for="hero-select">Hero:</label>
  <select id="hero-select" onchange="showHero(this.value)"></select>
</div>

<div id="fallback" class="warn" style="display:none; margin-bottom:12px;">
  Could not auto-load the CSV (browser blocked file:// or CORS). Choose the CSV manually:
  <input type="file" accept=".csv" onchange="onCSVUpload(event)">
</div>

<div id="heroes-container"></div>

<script>
{JS_TOP}
</script>
{JS_BODY}
</body>
</html>
'''.replace('{CSS}', CSS_BASE).replace('{JS_BODY}', JS_SKELETON)

# ----------------------------- UI strings (fixo EN) -----------------------------
UI_STR = {
    "EN": {
        "title": "Datamine: Hero",
        "hero_label_ui": "Hero:",
        "role_profile": "Profile",
        "quality_extra": "Quality Skill",
        "awaken_added_skills": "Awaken Skill",
        "skills": "Skills",
        "relations": "Relations",
        "bonds": "Bonds",
        "combine_skill": "Combine Skill",
        "combine_states": "Combine States",
        "no_bonds": "No bonds.",
        "no_combine_skill": "No combine skill.",
        "no_combine_states": "No combine states.",
        "no_skills": "No skills mapped for this hero.",
        "type": "Type",
        "cd": "Cooldown",
        "no_cd": "-",
        "tags": "Tags",
        "level": "Level",
        "condition": "Condition",
        "partners": "Partners",
        "bonuses": "Bonuses",
        "sub_prefix": "SubSkill:",
        "not_found": "[not found]",
    }
}
PROFILE_LABELS = {
    "role_constellation_name": "Constellation",
    "role_introduction": "Introduction",
    "role_features": "Features",
    "stance": "Stance",
    "damagetype": "Damage Type",
    "camp": "Camp",
    "occupation": "Occupation",
    "role_labels": "Labels",
}
_TAXONOMY_FIELDS = {"stance", "damagetype", "camp", "occupation"}
_TRANSLATABLE_ROLE_FIELDS = {
    "role_constellation_name": ("constellation", "constell"),
    "role_introduction": ("role_introduction",),
    "role_features": ("role_features", "role_feature"),
}

# ----------------------------- Helpers centrais -----------------------------
_name_short_re = re.compile(r'^LC_ROLE_role_name_short_(\d+)$', re.IGNORECASE)

def name_key_from_roleconfig(hid, rrow, role_col):
    """
    Regra (igual ao original):
    1) Se houver 'rolename' em RoleConfig, usa diretamente (é uma LC_*).
    2) Se houver 'rolename_short' = LC_ROLE_role_name_short_{N}, converte para LC_ROLE_role_name_{N}.
       (mantemos o short se não casar o padrão mas já for LC_*).
    3) Fallback: LC_ROLE_role_name_{hid}.
    """
    rk = safe_get(rrow, role_col, "rolename", default=None)
    if isinstance(rk, str) and rk.strip():
        return rk.strip()

    rs = safe_get(rrow, role_col, "rolename_short", default=None)
    if isinstance(rs, str) and rs.strip():
        m = _name_short_re.match(rs.strip())
        if m:
            return f"LC_ROLE_role_name_{m.group(1)}"
        if rs.strip().startswith("LC_"):
            return rs.strip()

    return f"LC_ROLE_role_name_{hid}"

def hero_name_from_id(hid, translations):
    """Fallback por ordem de preferência."""
    for key in (
        f"LC_ROLE_role_name_{hid}",          # nome canônico
        f"LC_ROLE_role_full_name_{hid}",     # alcunha/título
        f"LC_ROLE_role_name_short_{hid}",    # abreviado
    ):
        val = translations.get(key)
        if val:
            return normalize_color_tags(val)
    return str(hid)

def resolve_hero_display_name(hid, rrow, role_col, translations):
    """
    Ordem (espelha o projeto original):
    1) RoleConfig.rolename (já é LC_* do nome canônico) -> traduz
    2) RoleConfig.rolename_short = LC_ROLE_role_name_short_N -> converte p/ LC_ROLE_role_name_N
       (se não casar o padrão, traduz o que vier)
    3) Fallback por ID: name_{id} -> full_name_{id} -> name_short_{id}
    """
    rk = safe_get(rrow, role_col, "rolename", default=None)
    if isinstance(rk, str) and rk.strip():
        txt = translations.get(rk.strip())
        if txt:
            return normalize_color_tags(txt)

    rs = safe_get(rrow, role_col, "rolename_short", default=None)
    if isinstance(rs, str) and rs.strip():
        m = _name_short_re.match(rs.strip())
        if m:
            key = f"LC_ROLE_role_name_{m.group(1)}"
            txt = translations.get(key)
            if txt:
                return normalize_color_tags(txt)
        # se já veio LC_* mas não casou, tenta traduzir direto
        txt = translations.get(rs.strip())
        if txt:
            return normalize_color_tags(txt)

    # Fallbacks por ID
    return hero_name_from_id(hid, translations)

def _flatten(iterable):
    for it in iterable:
        if isinstance(it, (list, tuple)):
            for sub in _flatten(it):
                yield sub
        else:
            yield it

def extract_skill_ids(rrow, role_col):
    result = []
    def push(v):
        nonlocal result
        if isinstance(v, int):
            result.append(v)
        elif isinstance(v, str) and v.isdigit():
            result.append(int(v))
        elif isinstance(v, dict):
            sid = v.get('skillid') or v.get('id') or v.get('skill_id')
            if isinstance(sid, int) or (isinstance(sid, str) and sid.isdigit()):
                result.append(int(sid))
    raw = safe_get(rrow, role_col, "skills", default=[])
    for item in _flatten(raw if isinstance(raw, (list, tuple)) else [raw]):
        push(item)
    if not result:
        raw2 = safe_get(rrow, role_col, "battle_show_skills", default=[])
        for item in _flatten(raw2 if isinstance(raw2, (list, tuple)) else [raw2]):
            push(item)
    seen = set(); final = []
    for sid in result:
        if sid not in seen:
            seen.add(sid); final.append(sid)
    return final

def translate_role_field(field_key, raw_value, translations):
    if isinstance(raw_value, str) and not raw_value.startswith("LC_"):
        return normalize_color_tags(raw_value)
    if isinstance(raw_value, str) and raw_value.startswith("LC_"):
        tokens = _TRANSLATABLE_ROLE_FIELDS.get(field_key, ())
        if tokens:
            if any(tok in raw_value for tok in tokens):
                return normalize_color_tags(translations.get(raw_value, raw_value))
            else:
                return "-"
        if field_key in _TAXONOMY_FIELDS:
            return normalize_color_tags(translations.get(raw_value, raw_value))
        return normalize_color_tags(translations.get(raw_value, raw_value))
    return pretty_placeholder(raw_value)

def load_hero_type_desc_map(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    out = {}
    for k, v in data.items():
        if k == "xc_col_index":
            continue
        if isinstance(k, str) and isinstance(v, (list, tuple)):
            key = safe_get(v, col, "key", default=None)
            desc = safe_get(v, col, "desc", default=None)
            if isinstance(key, str) and isinstance(desc, str):
                out[key] = desc
    return out

def _norm_taxonomy_code(field_key: str, v) -> str | None:
    try:
        if isinstance(v, int) or (isinstance(v, str) and v.strip().isdigit()):
            return f"{field_key}_{int(v)}"
    except Exception:
        pass
    return None

def translate_taxonomy_field(raw_value, translations, hero_type_desc_map, field_key=None):
    if is_empty_placeholder(raw_value):
        return "-"
    if isinstance(raw_value, str) and raw_value.strip().startswith("LC_"):
        return normalize_color_tags(translations.get(raw_value.strip(), raw_value.strip()))
    if isinstance(raw_value, str) and raw_value.strip() in hero_type_desc_map:
        lc_key = hero_type_desc_map[raw_value.strip()]
        return normalize_color_tags(translations.get(lc_key, lc_key))
    if field_key in _TAXONOMY_FIELDS:
        code = _norm_taxonomy_code(field_key, raw_value)
        if code and code in hero_type_desc_map:
            lc_key = hero_type_desc_map[code]
            return normalize_color_tags(translations.get(lc_key, lc_key))
    return normalize_color_tags(pretty_placeholder(raw_value))

# ----------------------------- RoleResources (novo) -----------------------------
def convert_role_icon_path(src: str) -> str:
    if not isinstance(src, str) or not src.strip():
        return ""
    base = os.path.basename(src.replace('\\', '/'))
    if not base:
        return ""
    if not base.lower().endswith('.png'):
        base += '.png'
    return f"assets/resources/textures/hero/heroshowcard/{base}"

def load_role_resources_map(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    out = {}
    for k, v in data.items():
        if k == "xc_col_index" or not isinstance(k, int):
            continue
        p = safe_get(v, col, "role_icon_all_path", default=None)
        out[k] = p if isinstance(p, str) else None
    return out, col

# ----------------------------- Relações (NOVO) -----------------------------
def load_hero_relation_config(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    rel_map = {}
    for hid, row in data.items():
        if hid == "xc_col_index" or not isinstance(hid, int):
            continue
        rel_map[hid] = {
            "bond": list(safe_get(row, col, "bond", default=[])) or [],
            "combine_skill_list": list(safe_get(row, col, "combine_skill_list", default=[])) or [],
            "combine_state_list": list(safe_get(row, col, "combine_state_list", default=[])) or [],
        }
    return rel_map

def load_hero_fetters_config(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    fetter = {}
    for fid, row in data.items():
        if fid == "xc_col_index" or not isinstance(fid, int):
            continue
        name_key = safe_get(row, col, "name", default=None)
        cond = safe_get(row, col, "condition", default=[]) or []
        attr = safe_get(row, col, "attribute", default=[]) or []
        fetter[fid] = {"name_key": name_key, "condition": list(cond), "attribute": list(attr)}
    return fetter

def load_relation_skill_config(file_path):
    data, col, _ = load_lua_table_with_index(file_path)
    rs = {}
    for rid, row in data.items():
        if rid == "xc_col_index" or not isinstance(rid, int):
            continue
        name_key = safe_get(row, col, "name", default=None)
        hero_list = list(safe_get(row, col, "hero_list", default=[])) or []
        skill_id = safe_get(row, col, "skill_id", default=None)
        rs[rid] = {"name_key": name_key, "hero_list": hero_list, "skill_id": skill_id}
    return rs

def attribute_triplet_to_text(tri, translations):
    """
    tri = ["Max_Hp", 0, 1] -> usa LC_ATTRIBUTES_Max_Hp; valor 1 = 1%
    """
    try:
        key = str(tri[0])
        pct = float(tri[2])
        name = translations.get(f"LC_ATTRIBUTES_{key}", key)
        # nomes mais amigáveis (ex: "Max HP" → "HP" se o LanguagePack já não ajustar):
        name = name.replace("Max HP", "HP")
        # Se o LanguagePack devolver "Max Hp" ou similar, apenas passa adiante
        if pct.is_integer():
            pct_str = f"{int(pct)}%"
        else:
            pct_str = f"{pct}%"
        return f"{name} +{pct_str}"
    except Exception:
        return pretty_placeholder(tri)

# ----------------------------- Serialização de Skill para CSV (JSON) -----------------------------
def build_skill_dict(sid, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills, prefer_awaken_des):
    name_key = str(safe_get(srow, skill_col, "name", default=sid))
    title = translations.get(name_key, name_key)
    title = normalize_color_tags(title)

    icon_val = safe_get(srow, skill_col, "iconpath", default="")
    icon_file = ""
    if isinstance(icon_val, str) and icon_val.strip():
        icon_file = os.path.basename(icon_val)
        if not icon_file.lower().endswith(".png"):
            icon_file += ".png"

    skill_type = translate_skill_type(safe_get(srow, skill_col, "skill_type", default=""), translations)
    cd_txt = format_cd(safe_get(srow, skill_col, "cd", default=""), ui)

    labels_val = safe_get(srow, skill_col, "label_list", default=[])

    des_full = None
    des_lines = None
    if prefer_awaken_des:
        aw_val = safe_get(srow, skill_col, "awaken_skill_des", default=None)
        if not is_empty_placeholder(aw_val):
            res = render_value_cell(aw_val, translations, features, ui, skill_values, prefer_awaken=True)
            if isinstance(res, list):
                des_lines = [normalize_color_tags(x) for x in res]
                des_full = "<br>".join(des_lines)
            else:
                des_full = normalize_color_tags(res)

    if des_full is None:
        normal_val = safe_get(srow, skill_col, "skill_des", default=None)
        res = render_value_cell(normal_val, translations, features, ui, skill_values, prefer_awaken=False)
        if isinstance(res, list):
            des_lines = [normalize_color_tags(x) for x in res]
            des_full = "<br>".join(des_lines)
        else:
            des_full = normalize_color_tags(res)

    sketch_lines = []
    if not prefer_awaken_des:
        sketch_val = safe_get(srow, skill_col, "skill_sketch", default=None)
        cond_val   = safe_get(srow, skill_col, "skill_condition", default=None)
        sketch_lines_raw = build_sketch_lines_from_raw(sketch_val, translations, features, skill_values)
        cond_lines_raw   = build_condition_lines_from_raw(cond_val, translations, ui)
        sketch_lines = pair_sketch_with_conditions_struct(sketch_lines_raw, cond_lines_raw, ui)

    sub_list_out = []
    if include_subskills:
        sub_list = safe_get(srow, skill_col, "sub_skills", default=[])
        if isinstance(sub_list, (list, tuple)) and sub_list:
            sub_list_out = [int(x) if isinstance(x, str) and x.isdigit() else int(x) for x in sub_list if isinstance(x, (int, str)) and str(x).isdigit()]

    return {
        "id": int(sid),
        "name": title,
        "name_prefix": None,
        "icon": f"{base_icon_path}/{icon_file}" if icon_file else "",
        "type": skill_type,
        "cd": cd_txt,
        "tags_ids": labels_val,
        "description": des_full or "-",
        "description_first": (re.split(r'<br\s*/?>', des_full)[0].strip() if isinstance(des_full, str) and des_full else "-") if not prefer_awaken_des else None,
        "description_lines": des_lines if prefer_awaken_des else None,
        "sketch_lines": sketch_lines if not prefer_awaken_des else [],
        "subskills_ids": sub_list_out,
        "prefer_awaken": bool(prefer_awaken_des),
    }

def realize_subskills(skill_obj, skill_data, skill_col, translations, features, ui, skill_values, base_icon_path, label_text_resolver):
    real = []
    for sid in skill_obj.get("subskills_ids", []):
        srow = skill_data.get(sid)
        if not srow:
            continue
        sub = build_skill_dict(sid, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=False, prefer_awaken_des=False)
        sub["tags"] = label_text_resolver(sub.get("tags_ids", []))
        real.append(sub)
    skill_obj["subskills"] = real
    return skill_obj

# ----------------------------- Geração CSV + HTML -----------------------------
def generate_and_write_csv_and_html(all_data, lang="EN"):
    ui = UI_STR["EN"]
    translations = all_data["translations"][lang]

    role_data = all_data["role_data"]; role_col  = all_data["role_col"]
    hero_data = all_data["hero_data"]; hero_col  = all_data["hero_col"]
    skill_data = all_data["skill_data"]; skill_col  = all_data["skill_col"]
    skill_values = all_data["skill_values"]
    features = all_data["features"]
    label_map = all_data["label_map"]
    quality_skill, quality_skill_col = all_data["quality_skill"], all_data["quality_skill_col"]
    awaken_cfg_map, _ = all_data["awaken_cfg_map"], all_data["awaken_cfg_col"]
    awaken_info, awaken_info_col = all_data["awaken_info"], all_data["awaken_info_col"]
    hero_type_desc_map = all_data.get("hero_type_desc_map", {}) or {}
    role_resources_map = all_data["role_resources_map"]

    # (NOVO) relações
    relation_map = all_data["relation_map"]
    fetters = all_data["fetters"]
    relation_skill = all_data["relation_skill"]

    base_icon_path = "assets/resources/textures/hero/skillicon/texture"

    def tab_get(tab, _id):
        return tab.get(_id) if isinstance(_id, int) else tab.get(int(_id)) if isinstance(_id, str) and _id.isdigit() else None

    def label_text_resolver(ids):
        if not isinstance(ids, (list, tuple)) or not ids:
            return "-"
        texts = []
        for lid in ids:
            name_key = label_map.get(lid)
            if name_key:
                texts.append(translations.get(name_key, f"[{name_key}]"))
        return ", ".join(texts) if texts else "-"

    hero_ids = sorted([k for k in role_data.keys() if isinstance(k, int) and k < 1500])

    rows = []
    for hid in hero_ids:
        rrow = role_data.get(hid)

        # Nome
        fullname_key = f"LC_ROLE_role_full_name_{hid}"
        hero_display_name = normalize_color_tags(translations.get(fullname_key, fullname_key))

        # Imagem do card do herói
        hero_card_icon = ""
        skin_raw = safe_get(rrow, role_col, "role_initial_skins", default=[])
        skin_id = None
        if isinstance(skin_raw, (list, tuple)) and skin_raw:
            v = skin_raw[0]
            if isinstance(v, int) or (isinstance(v, str) and str(v).isdigit()):
                skin_id = int(v)
        elif isinstance(skin_raw, int) or (isinstance(skin_raw, str) and str(skin_raw).isdigit()):
            skin_id = int(skin_raw)
        if skin_id is not None:
            icon_src = role_resources_map.get(skin_id)
            if isinstance(icon_src, str) and icon_src:
                hero_card_icon = convert_role_icon_path(icon_src)

        # Profile
        profile_visible_fields = [
            "role_constellation_name",
            "role_introduction",
            "role_features",
            "stance","damagetype","camp","occupation",
            "role_labels"
        ]
        profile_rows = []
        for field in profile_visible_fields:
            raw_val = safe_get(rrow, role_col, field, default="-")
            if field in _TRANSLATABLE_ROLE_FIELDS:
                shown = translate_role_field(field, raw_val, translations)
            elif field == "role_labels":
                raw_list = (
                    raw_val if isinstance(raw_val, (list, tuple))
                    else ([raw_val] if raw_val not in (None, '', []) else [])
                )
                names = []
                for item in raw_list:
                    if isinstance(item, str) and item.strip().startswith("LC_"):
                        key = item.strip()
                        names.append(translations.get(key, key))
                        continue
                    try:
                        lid = int(item)
                        key = f"LC_SKILL_label_{lid}"
                        names.append(translations.get(key, key))
                    except Exception:
                        names.append(str(item))
                shown = ", ".join([n for n in names if n]) if names else "-"
            elif field in _TAXONOMY_FIELDS:
                shown = translate_taxonomy_field(raw_val, translations, hero_type_desc_map, field_key=field)
            else:
                shown = pretty_placeholder(raw_val)
            nice = PROFILE_LABELS.get(field, field)
            profile_rows.append([nice, shown])

        # Quality — Extra (último estágio)
        hrow = hero_data.get(hid)
        quality_extra_obj = None
        cfg_ids = safe_get(hrow, hero_col, "hero_quality_skill_ids", default=[]) if hrow else []
        if isinstance(cfg_ids, (list, tuple)) and cfg_ids:
            last_skill_pair = None
            for sid3 in cfg_ids:
                line = tab_get(quality_skill, sid3)
                if not line: continue
                info = safe_get(line, quality_skill_col, "skill_info", default=[])
                if isinstance(info, str) and is_empty_placeholder(info): continue
                if info in (None, '', []): continue
                skill_id = None; skill_lv = None
                if isinstance(info, (list, tuple)) and len(info) > 0:
                    for it in reversed(info):
                        if isinstance(it, dict) and it.get('skill_id') is not None:
                            skill_id = it.get('skill_id'); skill_lv = it.get("skill_lv") or it.get("lv"); break
                elif isinstance(info, dict) and info.get('skill_id') is not None:
                    skill_id = info.get('skill_id'); skill_lv = info.get("skill_lv") or it.get("lv")
                if skill_id is not None:
                    last_skill_pair = (skill_id, skill_lv)
            if last_skill_pair:
                sid_final, _ = last_skill_pair
                srow = tab_get(skill_data, sid_final)
                if srow:
                    tmp = build_skill_dict(sid_final, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=False, prefer_awaken_des=False)
                    tmp["tags"] = label_text_resolver(tmp.get("tags_ids", []))
                    quality_extra_obj = tmp

        # Awaken — Added skills
        awaken_skill_objs = []
        cfg = all_data["awaken_cfg_map"].get(hid)
        if cfg and cfg.get("awaken_list"):
            awaken_skill_ids = []
            for aid in cfg["awaken_list"]:
                arow = tab_get(all_data["awaken_info"], aid)
                if not arow:
                    continue
                addsk = safe_get(arow, all_data["awaken_info_col"], "add_skill", default=[])
                if isinstance(addsk, (list, tuple)):
                    for e in addsk:
                        if isinstance(e, dict) and e.get("skill_id") and e.get("skill_id") not in awaken_skill_ids:
                            awaken_skill_ids.append(e.get("skill_id"))
            for sid in awaken_skill_ids:
                srow = tab_get(skill_data, sid)
                if not srow:
                    continue
                tmp = build_skill_dict(sid, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=True, prefer_awaken_des=True)
                tmp["tags"] = label_text_resolver(tmp.get("tags_ids", []))
                tmp = realize_subskills(tmp, skill_data, skill_col, translations, features, ui, skill_values, base_icon_path, label_text_resolver)
                awaken_skill_objs.append(tmp)

        # Skills normais
        normal_skill_objs = []
        seq_ids = extract_skill_ids(rrow, role_col)
        seq = []
        for sid in seq_ids:
            srow = tab_get(skill_data, sid)
            if srow:
                seq.append((sid, srow))
        if not seq:
            guess = []
            for sid, srow in skill_data.items():
                if isinstance(sid, int) and sid < 60000 and sid // 10 == hid:
                    guess.append((sid, srow))
            guess.sort(key=lambda x: x[0])
            seq = guess

        for sid, srow in seq:
            tmp = build_skill_dict(sid, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=True, prefer_awaken_des=False)
            tmp["tags"] = label_text_resolver(tmp.get("tags_ids", []))
            tmp = realize_subskills(tmp, skill_data, skill_col, translations, features, ui, skill_values, base_icon_path, label_text_resolver)
            normal_skill_objs.append(tmp)

        # ---------------- Relations (Bonds / Combine Skill / States) ----------------
        relations_out = {"bonds": [], "combine_skills": [], "combine_states": []}
        rel_for_hero = relation_map.get(hid, {})

        # Bonds
        for fid in rel_for_hero.get("bond", []):
            frow = fetters.get(fid)
            if not frow:
                continue
            bond_title = translations.get(frow["name_key"], frow["name_key"])
            partners = [hero_name_from_id(p, translations) for p in (frow["condition"] or []) if isinstance(p, (int, str))]
            attrs = []
            for tri in (frow["attribute"] or []):
                if isinstance(tri, (list, tuple)) and len(tri) >= 3:
                    attrs.append(attribute_triplet_to_text(tri, translations))
            relations_out["bonds"].append({
                "id": int(fid),
                "name": normalize_color_tags(bond_title),
                "partners": partners,
                "attributes": attrs
            })

        # Helper p/ montar skill + metadados da relação
        def _build_relation_skill(rel_id):
            rel = relation_skill.get(rel_id)
            if not rel: return None
            s_id = rel.get("skill_id")
            srow = tab_get(skill_data, s_id)
            if not srow: return None
            sk = build_skill_dict(s_id, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=False, prefer_awaken_des=False)
            sk["tags"] = label_text_resolver(sk.get("tags_ids", []))
            sk["relation_name"] = normalize_color_tags(translations.get(rel.get("name_key"), rel.get("name_key")))
            sk["partners"] = [hero_name_from_id(p, translations) for p in (rel.get("hero_list") or [])]
            return sk

        # Combine Skill (usa render completo de skill)
        for rid in rel_for_hero.get("combine_skill_list", []):
            sk = _build_relation_skill(rid)
            if sk: relations_out["combine_skills"].append(sk)

        # Combine States (mostrar descrição uma vez, estilo quality skill simples)
        for rid in rel_for_hero.get("combine_state_list", []):
            rel = relation_skill.get(rid)
            if not rel: continue
            s_id = rel.get("skill_id")
            srow = tab_get(skill_data, s_id)
            if not srow: continue
            sk = build_skill_dict(s_id, srow, skill_col, translations, features, ui, skill_values, base_icon_path, include_subskills=False, prefer_awaken_des=False)
            # Remover sketch/conditions e forçar descrição única (já é única no build padrão)
            sk["sketch_lines"] = []
            sk["relation_name"] = normalize_color_tags(translations.get(rel.get("name_key"), rel.get("name_key")))
            sk["partners"] = [hero_name_from_id(p, translations) for p in (rel.get("hero_list") or [])]
            sk["tags"] = label_text_resolver(sk.get("tags_ids", []))
            relations_out["combine_states"].append(sk)

        rows.append({
            "hero_id": hid,
            "hero_name": hero_display_name,   # <--- usa o nome do herói, não dos bonds
            "hero_card_icon": hero_card_icon,
            "profile_json": json.dumps(profile_rows, ensure_ascii=False),
            "quality_extra_skill_json": json.dumps(quality_extra_obj, ensure_ascii=False) if quality_extra_obj else "",
            "awaken_added_skills_json": json.dumps(awaken_skill_objs, ensure_ascii=False),
            "normal_skills_json": json.dumps(normal_skill_objs, ensure_ascii=False),
            "relations_json": json.dumps(relations_out, ensure_ascii=False),
        })

    # CSV
    csv_name = f"heroes_{lang}.csv"
    with open(csv_name, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "hero_id","hero_name","hero_card_icon","profile_json",
            "quality_extra_skill_json","awaken_added_skills_json",
            "normal_skills_json","relations_json"
        ])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    print(f"✅ CSV gerado: {csv_name}")

    # HTML esqueleto
    html_name = f"herois_e_skills_{lang}.html" if lang in ("EN","CN") else "herois_e_skills.html"
    html = HTML_TEMPLATE.replace("{JS_TOP}", "").replace("{CSV_PATH}", csv_name)
    with open(html_name, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✅ HTML gerado: {html_name}")

# ----------------------------- main -----------------------------
def main():
    base = r"assets\resources\luascriptwithoutcodecomments\luaconfig"
    role_cfg_path   = os.path.join(base, r"game\role\RoleConfig.lua")
    hero_cfg_path   = os.path.join(base, r"game\hero\HeroConfig.lua")
    skill_cfg_path  = os.path.join(base, r"game\skill\SkillConfig.lua")
    skill_value_path= os.path.join(base, r"game\skill\SkillValueConfig.lua")
    features_path   = os.path.join(base, r"game\skill\SkillFeaturesConfig.lua")
    label_path      = os.path.join(base, r"game\skill\SkillLabelConfig.lua")
    lang_en_path    = os.path.join(base, r"language\LanguagePackage_EN.lua")
    lang_cn_path    = os.path.join(base, r"language\LanguagePackage_CN.lua")

    hero_quality_skill_path   = resolve_path(base, r"game\hero\HeroQualitySkillConfig.lua")
    hero_awaken_cfg_path      = resolve_path(base, r"game\hero\HeroAwakenConfig.lua")
    hero_awaken_info_path     = resolve_path(base, r"game\hero\HeroAwakenInfoConfig.lua")

    hero_type_desc_path = resolve_path(base, r"game\role\HeroTypeDescConfig.lua", r"HeroTypeDescConfig.lua")

    # RoleResourcesConfig
    role_resources_path = resolve_path(base, r"game\role\RoleResourcesConfig.lua", r"RoleResourcesConfig.lua")

    # (NOVO) Relações
    hero_relation_cfg_path = resolve_path(base, r"game\hero\HeroRelationConfig.lua", r"HeroRelationConfig.lua")   # bonds + combine lists
    hero_fetters_cfg_path  = resolve_path(base, r"game\hero\HeroFettersConfig.lua", r"HeroFettersConfig.lua")     # dados dos bonds
    hero_rel_skill_cfg_path= resolve_path(base, r"game\hero\HeroRelationSkillConfig.lua", r"HeroRelationSkillConfig.lua")  # combine skill/state items

    print("Carregando traduções...")
    translations_en = load_translations(lang_en_path)
    translations_cn = load_translations(lang_cn_path)
    print("EN: {} | CN: {}".format(len(translations_en), len(translations_cn)))

    print("Carregando RoleConfig...")
    role_data, role_col, _ = load_lua_table_with_index(role_cfg_path)

    print("Carregando HeroConfig...")
    hero_data, hero_col, _ = load_lua_table_with_index(hero_cfg_path)

    print("Carregando SkillConfig / SkillValue / Features / Labels...")
    skill_data, skill_col, _ = load_lua_table_with_index(skill_cfg_path)
    skill_values_data, _, _ = load_lua_table_with_index(skill_value_path)
    features_data, _, _ = load_lua_table_with_index(features_path)
    label_map = load_skill_label_config(label_path)

    # Vetor de valores do SkillValue
    skill_values = {}
    for key, val in skill_values_data.items():
        if key == "xc_col_index":
            continue
        if isinstance(val, (list, tuple)):
            skill_values[key] = val[1] if len(val) > 1 else []

    print("Carregando Quality — Extra Skill e Awaken (Added Skills)...")
    quality_skill, quality_skill_col, _ = load_lua_table_with_index(hero_quality_skill_path)
    awaken_cfg_map, awaken_cfg_col = load_hero_awaken_config(hero_awaken_cfg_path)
    awaken_info, awaken_info_col   = load_hero_awaken_info(hero_awaken_info_path)

    print("Carregando HeroTypeDescConfig (taxonomias de stance/damagetype/camp/occupation)...")
    hero_type_desc_map = load_hero_type_desc_map(hero_type_desc_path)

    print("Carregando RoleResourcesConfig (ícone do card do herói)...")
    role_resources_map, role_resources_col = load_role_resources_map(role_resources_path)

    # (NOVO) Relações
    print("Carregando HeroRelationConfig / HeroFettersConfig / HeroRelationSkillConfig ...")
    relation_map   = load_hero_relation_config(hero_relation_cfg_path)
    fetters        = load_hero_fetters_config(hero_fetters_cfg_path)
    relation_skill = load_relation_skill_config(hero_rel_skill_cfg_path)

    all_data = {
        "translations": { "EN": translations_en, "CN": translations_cn },
        "role_data": role_data, "role_col": role_col,
        "hero_data": hero_data, "hero_col": hero_col,
        "skill_data": skill_data, "skill_col": skill_col,
        "skill_values": skill_values,
        "features": features_data,
        "label_map": label_map,
        "quality_skill": quality_skill, "quality_skill_col": quality_skill_col,
        "awaken_cfg_map": awaken_cfg_map, "awaken_cfg_col": awaken_cfg_col,
        "awaken_info": awaken_info, "awaken_info_col": awaken_info_col,
        "hero_type_desc_map": hero_type_desc_map,
        "role_resources_map": role_resources_map,
        # Relações
        "relation_map": relation_map,
        "fetters": fetters,
        "relation_skill": relation_skill,
    }

    # Gera CSV + HTML por idioma
    generate_and_write_csv_and_html(all_data, lang="EN")
    generate_and_write_csv_and_html(all_data, lang="CN")

if __name__ == "__main__":
    main()
