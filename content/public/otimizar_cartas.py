#!/usr/bin/env python3
"""
Otimiza as 78 imagens de cartas do MyTarot.Day.

Resolve de uma vez três problemas relacionados:
  1. Arquivos de 10-15 MB cada (inviável pra web — 4 cartas numa leitura
     seriam 40-60 MB só de imagem).
  2. Muitos desses arquivos são, na prática, PNG salvos com extensão .jpg
     errada pelo script de coleta original — o Pillow abre pelo CONTEÚDO
     real do arquivo, não pela extensão, então detecta e corrige isso
     automaticamente ao regravar.
  3. Detecta e reporta (sem travar o processo) qualquer arquivo genuinamente
     corrompido/truncado que precise ser baixado de novo.

Uso:
    pip install Pillow --break-system-packages   # se ainda não tiver
    python3 otimizar_cartas.py                    # aplica de verdade
    python3 otimizar_cartas.py --dry-run           # só mostra o que faria
"""

import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    print("❌ Pillow não instalado. Rode: pip install Pillow --break-system-packages")
    sys.exit(1)

IMAGES_DIR = "/var/www/mytarot/public/images"
MAX_WIDTH = 500       # px — suficiente pra exibição no site, com folga pra retina
JPEG_QUALITY = 82

MAJOR_NAMES = [
    "Fool", "Magician", "High_Priestess", "Empress", "Emperor", "Hierophant", "Lovers", "Chariot",
    "Strength", "Hermit", "Wheel_of_Fortune", "Justice", "Hanged_Man", "Death", "Temperance",
    "Devil", "Tower", "Star", "Moon", "Sun", "Judgement", "World",
]
REQUIRED_FILES = [f"RWS_Tarot_{i:02d}_{name}.jpg" for i, name in enumerate(MAJOR_NAMES)]

SUIT_PREFIXES = {"Wands": "wands", "Cups": "cups", "Swords": "swords", "Pents": "pentacles"}
for prefix in SUIT_PREFIXES:
    for rank in range(1, 15):
        REQUIRED_FILES.append(f"{prefix}{rank:02d}.jpg")


def optimize_one(path: str) -> tuple:
    """Retorna (ok: bool, tamanho_antes, tamanho_depois_ou_erro)."""
    size_before = os.path.getsize(path)
    try:
        img = Image.open(path)
        img.load()  # força decodificação completa — é aqui que um arquivo
                     # truncado/corrompido de verdade vai estourar exceção
    except Exception as e:
        return False, size_before, f"não abriu (possivelmente corrompido de verdade): {e}"

    try:
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        w, h = img.size
        if w > MAX_WIDTH:
            new_h = round(h * MAX_WIDTH / w)
            img = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)

        tmp_path = path + ".tmp"
        img.save(tmp_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        os.replace(tmp_path, path)
        os.chmod(path, 0o644)
        size_after = os.path.getsize(path)
        return True, size_before, size_after
    except Exception as e:
        return False, size_before, f"erro ao regravar: {e}"


def main():
    parser = argparse.ArgumentParser(description="Otimiza as imagens de cartas do MyTarot.Day")
    parser.add_argument("--dry-run", action="store_true", help="Só mostra o que seria feito, não grava nada")
    args = parser.parse_args()

    if not os.path.isdir(IMAGES_DIR):
        print(f"❌ Pasta não encontrada: {IMAGES_DIR}")
        sys.exit(1)

    print(f"📂 {len(REQUIRED_FILES)} arquivos esperados (22 maiores + 56 menores)\n")

    total_before = 0
    total_after = 0
    falhas = []
    faltando = []

    for fname in REQUIRED_FILES:
        path = os.path.join(IMAGES_DIR, fname)
        if not os.path.exists(path):
            faltando.append(fname)
            print(f"  ⚠️  {fname}: arquivo não existe")
            continue

        if args.dry_run:
            size = os.path.getsize(path)
            print(f"  [DRY-RUN] {fname}: {size:,} bytes (verificação real de conteúdo pulada no dry-run)")
            continue

        ok, before, after = optimize_one(path)
        total_before += before
        if ok:
            total_after += after
            reducao = 100 * (1 - after / before) if before else 0
            print(f"  ✓ {fname}: {before:,} → {after:,} bytes ({reducao:.0f}% menor)")
        else:
            falhas.append((fname, after))  # 'after' aqui é a mensagem de erro
            print(f"  ❌ {fname}: {after}")

    print(f"\n{'=' * 60}")
    if args.dry_run:
        print("🔍 Simulação concluída — rode sem --dry-run para aplicar de verdade.")
    else:
        print(f"✅ Concluído: {len(REQUIRED_FILES) - len(falhas) - len(faltando)} otimizadas com sucesso")
        if total_before:
            print(f"   Tamanho total: {total_before / 1024 / 1024:.1f} MB → {total_after / 1024 / 1024:.1f} MB "
                  f"({100 * (1 - total_after / total_before):.0f}% menor)")
    if faltando:
        print(f"\n⚠️  {len(faltando)} arquivo(s) ausente(s) (precisam ser baixados):")
        for f in faltando:
            print(f"   - {f}")
    if falhas:
        print(f"\n❌ {len(falhas)} arquivo(s) genuinamente corrompido(s) (precisam ser rebaixados):")
        for fname, err in falhas:
            print(f"   - {fname}: {err}")


if __name__ == "__main__":
    main()
