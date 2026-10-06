#!/usr/bin/env bash
# Gera a saida JSON do motor com sementes fixas, para comparar antes/depois
# de refatorar. Copia o Main.kf do servidor e troca o main() por um dump.
set -euo pipefail
BASE=/home/publio/Downloads/install/mytarot-kof
KOF=/home/publio/Downloads/install/kof-toolchain/kof-0.3.22-beta-linux-x86_64/bin/kof
OUT="${1:?uso: dump-json.sh <arquivo-de-saida>}"
D=$(mktemp -d)
cp "$BASE/server"/*.json "$D/" 2>/dev/null
python3 - "$BASE/server/Main.kf" "$D/Main.kf" <<'PY'
import sys, re
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
s = s[:s.index("main() {")]
s += '''main() {
    var table = json.decode<LocaleTable>(readAll("locales.json"))
    var idiomas = listOf("en", "pt", "ja", "ar")
    var i = 0
    while (i < idiomas.size) {
        var code = idiomas.get(i)
        var eng = new Engine(code)
        var seed = 1
        while (seed <= 3) {
            println(eng.generateJson("2026-09-13", new Rng(seed)))
            seed = seed + 1
        }
        i = i + 1
    }
}
'''
open(dst, "w", encoding="utf-8").write(s)
PY
cd "$D" && "$KOF" run Main.kf > "$OUT" 2>/dev/null
rm -rf "$D"
echo "$(wc -l < "$OUT") leituras gravadas em $OUT"
