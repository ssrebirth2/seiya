import re
from pathlib import Path

sh_txt = Path(r"C:/rb2/backup/assets/resources/luascriptwithoutcodecomments/luaconfig/game/scene/StrongHoldConfig.lua").read_text(encoding="utf-8")
m = re.search(r"local S=\{(.+?)\}\nlocal T=", sh_txt, re.S)
sh_s = {k: int(v) for k, v in re.findall(r"(n_\d+)=(\d+)", m.group(1))}
for k in ['n_246','n_247','n_248','n_249','n_250']:
    print(k, sh_s.get(k))

# dump all resource item ids from stronghold 104
row = re.search(r"\[104\]=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}", sh_txt)
print('104 snippet resources part:')
s = re.search(r"\[104\]=\{([\s\S]*?)\n    \[105\]", sh_txt)
body = s.group(1)
res = re.search(r"\{\{([^\}]+(?:\}[^\{][^\}]*)*)\}\},nil,S\.s_457", body)
if res:
    print(res.group(0)[:300])
for chunk in re.findall(r"S\.(n_\d+)", res.group(1) if res else ''):
    print(' ref', chunk, sh_s.get(chunk))
