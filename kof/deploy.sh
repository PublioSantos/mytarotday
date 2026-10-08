#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Deploy blue-green do mytarot.day (porte Kof) — sem indisponibilidade.
#
# Duas instancias identicas: A na 3001, B na 3002. O Nginx aponta para uma
# delas via /etc/nginx/conf.d/mytarot-upstream.conf. O deploy publica na
# instancia OCIOSA, espera ela ficar saudavel e so entao troca o upstream.
# Se a nova nao subir, nada e trocado e o site continua no ar.
#
# O conteudo segue sendo editado no fonte do app Node (mount SSHFS em
# /home/publio/mytarot): views/index.html, data/*.json, public/css|js.
#
#   ./deploy.sh              publica na ociosa, verifica e troca
#   ./deploy.sh --gerar      so regenera localmente
#   ./deploy.sh --status     mostra quem esta ativa
#   ./deploy.sh --rollback   volta para o app Node
#
# Config de ambiente (nao versionada): copie .env.example para .env e
# preencha CHAVE/HOST/KOF_LOCAL/BASE/FONTE com os valores reais da sua VPS.
# ---------------------------------------------------------------------------
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$DIR/.env" ] && source "$DIR/.env"

BASE="${BASE:?defina BASE em .env (caminho local deste repo)}"
FONTE="${FONTE:?defina FONTE em .env (caminho do conteudo/app original)}"
KOF_LOCAL="${KOF_LOCAL:?defina KOF_LOCAL em .env (binario kof local)}"
CHAVE="${CHAVE:?defina CHAVE em .env (chave SSH da VPS)}"
HOST="${HOST:?defina HOST em .env (usuario@ip da VPS)}"
UPSTREAM="${UPSTREAM:-/etc/nginx/conf.d/mytarot-upstream.conf}"
SSH="ssh -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 -i $CHAVE"

vermelho() { printf '\033[31m%s\033[0m\n' "$*"; }
verde()    { printf '\033[32m%s\033[0m\n' "$*"; }
passo()    { printf '\n\033[1m== %s\033[0m\n' "$*"; }

porta_ativa() { $SSH "$HOST" "grep -oE '127.0.0.1:[0-9]+' $UPSTREAM | cut -d: -f2"; }

apontar() {  # $1 = porta
    $SSH "$HOST" "echo 'upstream mytarot_app { server 127.0.0.1:$1; }' | sudo tee $UPSTREAM > /dev/null
                  sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx"
}

publico() { curl -s --max-time 20 -o /dev/null -w '%{http_code}' "https://mytarot.day${1:-/pt/}" 2>/dev/null || echo 000; }

# ------------------------------------------------------------------ status
if [ "${1:-}" = "--status" ]; then
    p=$(porta_ativa)
    echo "upstream ativo: porta $p ($( [ "$p" = 3001 ] && echo "instancia A" || echo "instancia B" ))"
    $SSH "$HOST" 'for s in a b; do echo "  $s: $(systemctl is-active mytarot-kof-$s.service) / $(systemctl is-enabled mytarot-kof-$s.service 2>/dev/null)"; done'
    echo "site: http $(publico)"
    exit 0
fi

# ---------------------------------------------------------------- rollback
if [ "${1:-}" = "--rollback" ]; then
    passo "Revertendo para o app Node"
    $SSH "$HOST" '
        sudo cp /etc/nginx/sites-available/mytarot.day.node-rollback /etc/nginx/sites-enabled/mytarot.day
        sudo systemctl start mytarot.service
        sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx'
    sleep 3
    echo "site: http $(publico)"
    verde "Rollback concluido."
    exit 0
fi

# ------------------------------------------------------------------- gerar
passo "Regenerando artefatos a partir de $FONTE"
[ -d "$FONTE/data" ] || { vermelho "fonte inacessivel: o mount SSHFS caiu?"; exit 1; }

IDIOMAS=$(ls "$FONTE"/data/*.json | xargs -n1 basename | grep -vE 'cards-structure|fixbak' | sed 's/\.json$//' | tr '\n' ' ')
N=$(echo $IDIOMAS | wc -w)
echo "idiomas: $N"

cd "$BASE"
"$KOF_LOCAL" run config/Main.kf        > /dev/null   # locales.json (ex extrair-config.js)
"$KOF_LOCAL" run reshape/Main.kf       > /dev/null   # cards/meta/deck (ex reshape.py)
"$KOF_LOCAL" run gerador/Main.kf       > /dev/null   # api.json (ex gen-api.js)
"$KOF_LOCAL" run renderizador/Main.kf  > /dev/null   # html (ex gen-html.js)
# so o que o servidor consome — render.json/ui.json sao insumo de build
for f in engine/deck.json engine/locales.json engine/*.cards.json engine/*.meta.json engine/*.api.json; do
    [ -f "$f" ] && cp "$f" server/
done

passo "Conferindo artefatos"
falhou=0
for t in cards meta api; do
    c=$(ls server/*.$t.json 2>/dev/null | wc -l)
    printf "  %-6s %s/%s\n" "$t" "$c" "$N"; [ "$c" -eq "$N" ] || falhou=1
done
h=$(ls server/*.html 2>/dev/null | wc -l); printf "  %-6s %s/%s\n" html "$h" "$N"
[ "$h" -eq "$N" ] || falhou=1
[ -s server/deck.json ] && [ -s server/locales.json ] || falhou=1
[ "$falhou" -eq 0 ] || { vermelho "artefatos incompletos — nada publicado"; exit 1; }

[ "${1:-}" = "--gerar" ] && { verde "Gerado em $BASE/server (nada publicado)."; exit 0; }

# ------------------------------------------------------------ alvo ocioso
ATIVA=$(porta_ativa)
if [ "$ATIVA" = "3001" ]; then ALVO=b; PORTA_ALVO=3002; ATUAL=a; else ALVO=a; PORTA_ALVO=3001; ATUAL=b; fi
passo "Ativa: instancia $ATUAL (porta $ATIVA) — publicando na ociosa: $ALVO (porta $PORTA_ALVO)"

rsync -az --delete --exclude=port.txt -e "$SSH" "$BASE/server/" "$HOST:~/mytarot-kof-stage/"
$SSH "$HOST" "sudo rsync -a --delete --exclude=port.txt ~/mytarot-kof-stage/ /var/www/mytarot-kof-$ALVO/ && sudo chown -R mytarot:mytarot /var/www/mytarot-kof-$ALVO"

passo "Compilando na instancia ociosa"
$SSH "$HOST" "cd /var/www/mytarot-kof-$ALVO && sudo -u mytarot /opt/kof/bin/kof check Main.kf" 2>&1 | tail -1 | grep -q "no errors" \
    || { vermelho "kof check falhou — site intocado, seguindo na $ATUAL."; exit 1; }
echo "  compila sem erros"

# --- TRAVA: so troca se a nova instancia responder de verdade --------------
passo "Subindo $ALVO e esperando ficar saudavel"
$SSH "$HOST" "sudo systemctl restart mytarot-kof-$ALVO.service"
saudavel=0
for i in $(seq 1 45); do
    c=$($SSH "$HOST" "curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORTA_ALVO/api/health 2>/dev/null || echo 000")
    [ "$c" = "200" ] && { saudavel=1; break; }
    sleep 2
done
[ "$saudavel" = "1" ] || { vermelho "instancia $ALVO nao subiu — upstream NAO trocado, site segue no ar na $ATUAL."; exit 1; }
echo "  $ALVO respondendo na $PORTA_ALVO"

# --- troca (reload gracioso: conexoes em curso terminam na antiga) ---------
passo "Trocando o upstream para $ALVO"
apontar "$PORTA_ALVO"
sleep 2

passo "Verificando o site publico"
erros=0
for u in "/" "/pt/" "/ja/" "/api/health" "/css/styles.css" "/blog/"; do
    c=$(publico "$u"); printf "  %-22s http %s\n" "$u" "$c"; [ "$c" = "200" ] || erros=$((erros+1))
done
cartas=$(curl -s --max-time 25 -X POST -H "Content-Type: application/json" \
         -d '{"clientDate":"'"$(date +%F)"'","locale":"pt"}' https://mytarot.day/api/reading 2>/dev/null \
         | python3 -c "import json,sys; print(len(json.load(sys.stdin)['cards']))" 2>/dev/null || echo 0)
echo "  POST /api/reading      $cartas cartas"
[ "$cartas" = "4" ] || erros=$((erros+1))

if [ "$erros" -ne 0 ]; then
    vermelho "$erros falhas — voltando o upstream para $ATUAL (porta $ATIVA)"
    apontar "$ATIVA"
    sleep 2
    echo "site apos reverter: http $(publico)"
    exit 1
fi

# --- desliga a antiga e ajusta o boot -------------------------------------
# O reload do nginx e gracioso: workers antigos seguem atendendo com a config
# ANTIGA (ainda apontando para a instancia velha) ate terminarem. Derrubar a
# antiga imediatamente mata essas requisicoes em voo — foi o que causou 2
# falhas em 88 num deploy. Espera a drenagem antes de parar.
passo "Drenando conexoes dos workers antigos do nginx (20s)"
sleep 20

passo "Desligando a instancia antiga ($ATUAL)"
$SSH "$HOST" "sudo systemctl stop mytarot-kof-$ATUAL.service
              sudo systemctl disable mytarot-kof-$ATUAL.service >/dev/null 2>&1
              sudo systemctl enable mytarot-kof-$ALVO.service >/dev/null 2>&1"
verde "
Deploy concluido sem indisponibilidade. Ativa agora: instancia $ALVO (porta $PORTA_ALVO)."
