[English](DOING.md) | [Português](DOING.pt_BR.md)

> **✅ FEITO (08/10, dono = 192.168.0.131).** Sessão depois de um intervalo de
> vários dias: o repositório no GitHub tinha sido **apagado e recriado do
> zero** entre 27/09 e 06/10 (repo novo, `created_at` 06/10, um único commit
> com um README novo bem mais curto) — tudo que tinha sido enviado antes
> (content/, kof/, o README completo com a seção de Arquitetura dos Dados)
> sumiu junto. Reenviei `content/` (da VPS, ~450MB) e `kof/` (desta máquina)
> do mesmo jeito de antes; restaurei o README completo (renomeei a seção
> "Why?" pra "Arquitetura dos Dados"/"Data Architecture", como pedido) e
> acrescentei duas notas novas: a divisão Nginx/Kof na camada de serviço, e a
> escolha deliberada de montar o texto de forma determinística em vez de
> gerar a leitura via IA.
>
> **Regressão de segurança achada e corrigida:** o `deploy.sh` tinha voltado
> a expor o IP real da VPS e o caminho da chave SSH em texto puro — a
> correção baseada em `.env` do dia 26/09 não sobreviveu ao push
> reconstruído (o `.env.example` também tinha sumido localmente, então o
> `cp` falhava silenciosamente sem erro). Reapliquei a leitura de `.env` e
> recriei o `.env.example`.
>
> **Arquivos obsoletos do `kof/` limpos** (confirmado via API do GitHub, não
> pelo CDN — o `raw.githubusercontent.com` serviu conteúdo em cache por uns
> minutos depois de cada push e quase gerou um falso "não funcionou"):
> - `dump-json.sh` — parecia shell puro mas tinha um heredoc Python
>   embutido; ferramenta de diff só-dev, presa ao toolchain antigo
>   0.3.22-beta e a uma data de 13/09. Apagado.
> - `engine/cfg.txt` — resíduo de teste de uma linha só. Apagado.
> - `servir.sh` — descrevia a fase (há muito encerrada) de Kof e Node
>   rodando em paralelo, com caminho fixo desta máquina. Apagado.
> - `ISSUE-compiler.md` / `ISSUE-web.md` — rascunhos de bugs do 0.3.22-beta
>   que a mantenedora já corrigiu e fechou faz tempo. Apagados.
> - `nginx-mytarot.day` — estava desatualizado (`proxy_pass 127.0.0.1:3001`
>   fixo, não o upstream indireto `mytarot_app` real do blue-green).
>   Atualizado com a config real, puxada direto da VPS.
>
> **Toolchain do Kof: testei o 0.5.0-beta (release mais nova, 28/09),
> confirmei que continua quebrado, revertido pro 0.4.4-beta.** O `kof check`
> no `server/Main.kf` de verdade bate no mesmo crash de frame do ASM
> `COMPUTE_FRAMES` em `Engine.generateJson` da regressão 0.4.5–0.4.10 — não
> corrigido nem na versão mais nova. O usuário pediu pra fazer o upgrade
> mesmo assim, aceitando o risco explicitamente ("se parar de funcionar,
> informo a Mel"). **O risco se materializou em minutos**: o
> `mytarot-kof-b.service` reiniciou sozinho (contador de restart do systemd
> foi pra 9) enquanto o `/opt/kof` estava em 0.5.0-beta, tentou recompilar,
> travou, o site caiu pra 502. Revertido o `/opt/kof` pro 0.4.4-beta na
> hora; o próximo reinício compilou limpo e o site voltou. `/opt/kof.0.5.0-
> rolledback` mantido na VPS pra quem quiser testar de novo no futuro.
> Corrente de backups na VPS: `kof.0.3.22-rolledback`, `kof.0.5.0-rolledback`
> (o 0.4.4-beta voltou pro `/opt/kof` em si).
>
> **PRÓXIMO PASSO (o re-dispacho lê isto):** nada bloqueado. Se uma versão
> nova do Kof sair, testar `kof check server/Main.kf` contra ela antes de
> encostar no `/opt/kof` da VPS de novo — a regressão já está confirmada
> quebrada em SEIS releases seguidas (0.4.5 até 0.5.0).

> **✅ FEITO (26/09, mais tarde no mesmo dia, dono = 192.168.0.131).** O build
> agora é **100% Kof, zero Node** — terminou a frente que a entrada abaixo
> chama de "bloqueada". `extrair-config.js`, `gen-api.js`, `gen-html.js`
> apagados; substituídos por `config/Main.kf`, `gerador/Main.kf` (reescrito) e
> o novo `renderizador/Main.kf`. Os quatro verificados byte a byte contra a
> saída antiga do Node nos 28 idiomas (ignorando o timestamp de
> cache-busting, que muda a cada build por definição dos dois lados) — 0
> diffs. Já publicado em produção via `./deploy.sh` blue-green normal.
>
> **Como os dois bloqueios foram resolvidos:**
> - **`json.encode` sem indentação** (precisa pro JSON-LD da página, que tem
>   que bater byte a byte com `JSON.stringify(dados, null, 4)`): não esperei
>   suporte do compilador — a forma do JSON-LD é fixa (sempre WebApplication +
>   Organization, FAQPage só quando o idioma tem FAQ), então
>   `renderizador/Main.kf` monta ele à mão como string literal com a
>   indentação exata, em vez de via `json.encode`.
> - **`record` tem forma fixa, emite `null` pra chave ausente** (o objeto
>   `ui` é esparso — 26/28 idiomas não têm `skipToContent`): confirmado que
>   `json.encode` de um `Map<String,String>` só emite as chaves que de fato
>   existem nele — nenhum problema de esquema fixo quando `ui` é `Map` em vez
>   de `record`. `gerador/Main.kf` já usava isso desde a sessão anterior;
>   `renderizador/Main.kf` também usa.
>
> **Bug novo do compilador achado e contornado (não reportado ainda):** um
> `Map` vindo de `json.decode<Map<...>>` quebra a **verificação de bytecode**
> — o método nem chega a começar a executar — no instante em que é passado
> como **argumento de uma função definida pelo usuário**, desde que em algum
> ponto do mesmo programa compilado um record contendo `Map<String,String>`
> também passe por `json.encode()`. O erro da própria JVM é completamente
> enganoso: "componentes de runtime do JavaFX não encontrados". Isolado com
> um repro mínimo de ~15 linhas. O mesmo Map, construído via `mapOf()+put()`
> em vez de `decode`, passado pela mesma função, no mesmo contexto —
> funciona normalmente. Contorno aplicado no `gerador/Main.kf`: nunca passar
> um Map decodificado por uma função — copiar pra um `mapOf()` novo inline,
> no mesmo escopo do `decode`.
>
> **Arquivos tocados:** `config/` (novo), `renderizador/` (novo),
> `gerador/Main.kf` (reescrito), `deploy.sh` (chama os 4 passos de build em
> Kof em vez de Node), `server/Main.kf` (só comentário — a nota "Item 3
> bloqueado" estava desatualizada). Apagados: `extrair-config.js`,
> `gen-api.js`, `gen-html.js`.
>
> **PRÓXIMO PASSO (o re-dispacho lê isto):** decidir se vale abrir issue no
> Kof4j pros dois bugs novos achados hoje (decode de `Map<String,Record>`
> aninhado, decode de `Map` passado por função) — seguir
> `feedback_kof_issue_template`/`feedback_kof_verify_before_filing` da
> memória, mostrar pro usuário antes de publicar qualquer coisa. Nada
> bloqueado nem pendente em produção.

> **✅ FEITO (26/09, dono = 192.168.0.131).** Sessão de upgrade + revisão +
> port nativo do reshape.py.
>
> **1) Toolchain da VPS: 0.3.22-beta → 0.4.4-beta.** A produção estava
> rodando 0.3.22-beta (a memória de sessões anteriores dizia 0.4.4, estava
> errada — sempre conferir com `kof version` na VPS antes de confiar em
> registro antigo). Backup completo feito na própria VPS
> (`~/backups/mytarot_backup_20260926_101545.tar.gz`) antes de trocar
> `/opt/kof`. Deploy blue-green normal (`./deploy.sh`) — sem indisponibilidade.
> 0.4.5 até 0.4.10-beta (tip) continuam com o ICE do compilador em
> `json.encode` depois de loop com `List<Record>` — não subir além de 0.4.4
> sem essa regressão estar corrigida.
>
> **2) Revisão dos contornos de bugs antigos (0.3.22-beta), testados ao vivo
> contra 0.4.4-beta antes de mexer:**
> - meta tag `<generator>` hardcoded em `views/index.html` estava desatualizada
>   (dizia 0.3.22 com o site já rodando outra versão) — corrigida para
>   0.4.4-beta, republicada nos 28 idiomas.
> - `as Long` no `Rng.constructor` (issue #103, Int→campo Long derrubava o
>   backend 0.3.22) — confirmado corrigido em 0.4.4, cast removido em
>   `server/Main.kf` e `engine/Main.kf`.
> - `synchronized` descartado silenciosamente do bytecode — em 0.4.4 já vira
>   warning de compilação (SEM091). Comentário atualizado, código
>   (`security.rateLimit`) não mudou.
>
> **3) `reshape.py` portado para Kof nativo** (`reshape/Main.kf`, novo) —
> substituiu `python3 reshape.py` no `deploy.sh`. Verificado com `cmp` byte a
> byte: **0 diffs** contra a saída do Python nos arquivos que o servidor
> realmente consome (`deck.json` + 28× `*.cards.json`/`*.meta.json`). Já
> publicado em produção via deploy blue-green normal.
>
> **Bug do compilador achado no processo, NÃO reportado ainda:**
> `json.decode` de `Map<String, Record>` aninhado — seja como campo de outro
> record, seja como valor de outro `Map` — silenciosamente vira mapa vazio
> (sem erro). Só funciona como argumento de tipo direto de
> `json.decode<...>(...)`. Contorno em `reshape/Main.kf`
> (`campoBruto`/`extraiValorBalanceado`): extrai o trecho JSON bruto de cada
> chave de nível superior manualmente (respeitando aspas/escapes) e decodifica
> cada `Map` separadamente. Repro mínimo ainda não isolado em arquivo próprio.
>
> **Arquivos tocados:** `views/index.html` (fonte, mount SSHFS de produção),
> `server/Main.kf`, `engine/Main.kf`, `reshape.py` (só comentário/docstring,
> não é mais chamado), `deploy.sh` (troca a chamada do reshape), `reshape/`
> (novo diretório/programa).
>
> **NÃO TOCAR sem necessidade:** `gerador/Main.kf` — já existia antes desta
> sessão, ainda não publicado (json.encode sem indentação e record de forma
> fixa emitindo `null` onde o JS omite a chave continuam bloqueando essa
> frente maior; ver comentário em `server/Main.kf` linha ~14).
>
> **PRÓXIMO PASSO (o re-dispacho lê isto):** decidir se vale isolar e reportar
> o bug do `Map<String,Record>` aninhado como issue no Kof4j (seguir
> `feedback_kof_issue_template` e `feedback_kof_verify_before_filing` da
> memória — mostrar pro usuário antes de publicar qualquer coisa). Nada
> bloqueado nem pendente em produção — mytarot.day está 100% Kof, 0.4.4-beta,
> reshape nativo, tudo verificado.
