#!/usr/bin/env bash
# Sobe o servidor de API do mytarot em Kof na porta 3001 (paralelo a producao).
KOF=/home/publio/Downloads/install/kof-toolchain/kof-0.4.4-beta-linux-x86_64/bin/kof
cd /home/publio/Downloads/install/mytarot-kof/server || exit 1
exec "$KOF" run Main.kf "$@"
