[English](README.md) | [Português](README.pt_BR.md)

# MyTarot.Day

[mytarot.day](https://mytarot.day) é um projeto de teste de tecnologia. O baralho de tarot foi usado como **ferramenta de teste**, não como objeto de estudo de tarô. Eu não sou tarólogo nem místico. O que eu queria era montar, um site real, funcional, usado no mundo todo, com uma quantidade grande de combinações possíveis, rodando inteiro numa VPS pequena e gratuita (OCI/Ubuntu). Hoje rodando em Kof beta 0.5.0 .

No código do servidor (server/Main.kf), a geração é dinâmica por requisição.

## O desafio que eu me propus

- **Alcance global**: o site está traduzido em **28 idiomas**, incluindo idiomas RTL (árabe, hebraico) e CJK (japonês, coreano, chinês).
- **Milhões de combinações**: cada leitura sorteia 4 cartas distintas entre 78 (a posição importa: determinante/passado/presente/futuro), e cada carta pode sair normal ou invertida. Isso produz `78×77×76×75 × 2⁴ =` **548 milhões** de combinações possíveis de leitura por idioma, sem que seja necessário armazenar cada combinação individualmente.
- **Infraestrutura mínima**: roda numa única instância **OCI Always Free** (Oracle Cloud), sem custo de servidor.

## Como foi construído

Seria fácil criar um prompt para uma IA gerar uma leitura de tarô. Em vez disso, optei por utilizar as cartas e seus significados para compor os textos de forma determinística, com encaixes gramaticais.

O site nasceu como uma aplicação Node/Express convencional (Express + templates + JSON de conteúdo por idioma). Depois, virou também um campo de teste para outra curiosidade técnica: portar a aplicação inteira para [Kof](https://koflang.github.io/) — não só o servidor, mas o **build inteiro**. Desde 12 de setembro de 2026 o site em produção ( https://mytarot.day ) roda em Kof; desde 26 de setembro de 2026, o próprio processo de build (gerar o HTML de cada idioma, montar as respostas da API, achatar os dados de conteúdo) também roda 100% em Kof, sem Node nenhum no caminho — zero indisponibilidade em todos os deploys, via blue-green.

O acesso direto por índice a vetores em memória é mais rápido do que consulta a SGBD. A resposta é montada instantaneamente, mesmo sob tráfego elevado na instância mais modesta.


- **Nginx** — o servidor web de borda: recebe toda a conexão na porta 80 (TLS já vem terminado do Cloudflare), serve os arquivos estáticos de `public/` direto do disco (imagens, CSS, JS, blog), faz o redirect canônico (www→apex, http→https) e repassa o resto pro backend via proxy.
- **Kof** (`server/Main.kf`) — o servidor de aplicação: atende tudo que o Nginx não resolve sozinho — as rotas de `/api/*` e o HTML por idioma — rodando em duas instâncias idênticas (`mytarot-kof-a`/`mytarot-kof-b`) que se alternam a cada deploy blue-green.


## Estrutura do repositório

- **`content/`** — o app Node/Express original. Só `views/` (template HTML), `public/` (CSS, JS, imagens, blog) e `data/` (texto das cartas por idioma e a estrutura neutra do baralho) continuam sendo a fonte de verdade — o build em Kof lê esses três direto. `lib/` (i18n e renderização) e `server.js` ficaram mortos desde que o build também virou 100% Kof: nada mais lê essa lógica, mantidos só como referência histórica de como o site nasceu.
- **`kof/`** — o port pra Kof, 100% do build e do runtime: `server/Main.kf` (o servidor HTTP em produção), `engine/Main.kf` (o motor de sorteio, portado com paridade byte a byte com o JS original), `config/Main.kf` (config por idioma), `reshape/Main.kf` (achata os dados de conteúdo), `gerador/Main.kf` (monta as respostas da API), `renderizador/Main.kf` (pré-renderiza o HTML de cada idioma — o JSON-LD da página é montado à mão pra bater byte a byte com o formato indentado que o `json.encode` do Kof ainda não suporta nativamente), `deploy.sh` (o script de deploy blue-green) e os repros de bugs registrados no compilador do Kof ao longo do caminho (`bugs/`).
- Excluído de propósito: o app `mobile/` (Capacitor/Android — um cliente separado, fora do escopo deste repositório), `node_modules/` e caminhos específicos desta máquina (um deploy de verdade precisa do seu próprio `.env`, veja `.env.example` em `kof/`).

## Arquitetura dos Dados

A ideia central do modelo de dados: separar o que é **neutro** (id, imagem, naipe) do que é **idioma** (nome, significado, textos de UI). Isso é o que permite que um único baralho canônico sirva os 28 idiomas sem duplicar estrutura.

### Visão em camadas

```
FONTE (content/data/)
├── cards-structure.json     ← identidade visual do baralho (idioma-agnóstico)
└── {ar,cs,...,zh}.json      ← 28 arquivos: textos + UI + posições + FAQ

        ↓  reshape/Main.kf  (build)

ARTEFATOS (consumidos pelo server)
├── deck.json                ← List<NeutralCard>  (78 itens, ordem fixa)
├── {code}.cards.json        ← List<CardText>     (78, mesmo índice que deck)
├── {code}.meta.json         ← Meta               (posições + clauses + label)
├── {code}.html / .api.json  ← pré-render (outros passos do build)
└── locales.json             ← supported, fallback, aliases, RTL, etc.
```

### 1. Fonte: `cards-structure.json`

Baralho Rider–Waite–Smith, sem texto nenhum:

| Bloco | Quantidade | Campos |
|---|---|---|
| `major` | 22 (ids 0–21) | `id`, `glyph`, `image` |
| `minor` | 56 (ids 22–77) | `id`, `suitKey`, `rankKey`, `glyph`, `image` |

- Major: Fool → World (`fool`, `magician`, …).
- Minor: 4 naipes × 14 ranks (`wands`/`cups`/`swords`/`pentacles` × `ace`…`king`).
- Imagens no estilo `RWS_Tarot_00_Fool.jpg`, `Wands01.jpg`, etc.

Essa é a chave canônica do baralho — qualquer idioma se encaixa nesses ids.

### 2. Fonte: `{code}.json` (ex.: `en.json`)

Um objeto grande por idioma:

```
{
  ui: { ... ~30 strings da interface ... },
  positions: {
    determinant: { label, subtitle, intros[] },
    past:        { ... },
    present:     { ... },
    future:      { ... }
  },
  summaryClauses: [ "... {determinant} ... {past} ... {future} ..." ],
  ranks:  { ace: "Ace", two: "Two", ... },
  suits:  { wands: "Wands", cups: "Cups", ... },
  majorArcana: {
    "0": { name, keywords[], upright, reversed, advice },
    "1": { ... },
    ...
  },
  minorArcana: {
    wands:     { ace: { keywords, upright, reversed, advice }, ... },
    cups:      { ... },
    swords:    { ... },
    pentacles: { ... }
  },
  faq: [ { q, a }, ... ]
}
```

Pontos de desenho:
- Major indexado por id em string (`"0"`…`"21"`).
- Minor indexado por naipe → rank (não por id numérico) — mais legível pra quem edita texto.
- O nome do minor não está no JSON da carta: o `reshape` monta `rank + preposição + suit` (ex.: "Ace of Wands", "Ás de Paus").
- Posições fixas em 4 chaves: `determinant | past | present | future`.
- `summaryClauses` usam placeholders `{determinant}`, `{past}`, `{future}` (o presente não entra no resumo).
- `ui` concentra o copy da página (~30 chaves fixas).

Os 28 códigos em `config/Main.kf` batem exatamente com os arquivos em `content/data/` (sem contar `cards-structure.json`): `ar, cs, da, de, el, en, es, fi, fr, he, hi, hu, id, it, ja, ko, nl, no, pl, pt, ro, ru, sv, th, tr, uk, vi, zh`.

### 3. Artefatos: o que o runtime realmente lê

**`deck.json` → `List<NeutralCard>`**
```
NeutralCard(id, glyph, image, suitKey, rankKey, isMajor)
```
Major: `suitKey`/`rankKey` vazios, `isMajor = 1`. Minor: naipe/rank preenchidos, `isMajor = 0`. Ordem = índice `0..77`, alinhada ao array de textos.

**`{code}.cards.json` → `List<CardText>`**
```
CardText(id, name, keywords, upright, reversed, advice)
```
Mesma ordem do `deck`. Acesso por índice após o sorteio: `cards.get(chosen[i])` + `deck.get(chosen[i])`.

**`{code}.meta.json` → `Meta`**
```
Meta(
  positions: List<Position>,   // ordem: determinant, past, present, future
  summaryClauses: List<String>,
  reversedLabel: String        // ex. "reversed" em minúsculas, vem de ui.reversedLabel
)
Position(key, label, subtitle, intros[])
```

**Resposta da API → records de saída**
```
LeituraJson(date, cards: List<PosicaoJson>, summary)
PosicaoJson(position, label, subtitle, card: CartaJson, orientation, keywords, reading)
CartaJson(id, name, glyph, image, isMajor)
```
Ordem dos campos no record = ordem das chaves no JSON (`json.encode` do Kof).

**`locales.json`**
```
supported[], fallback ("en"),
aliases (nb→no, nn→no, iw→he, in→id),
idiomas[]: { code, nativeName, isRtl, questionMark, dateFormat }
```

### O pipeline de achatamento (`reshape`)

O `reshape` existe porque a fonte é aninhada e legível (boa pra editar texto), mas o runtime quer listas indexadas por id (boa pra performance e simplicidade no Kof):

1. Lê `cards-structure.json` → monta o `deck` (78 `NeutralCard`).
2. Para cada idioma, extrai trechos do JSON fonte (`campoBruto` / parser manual, feito à mão em vez de decodificar o `Map` aninhado direto).
3. Para cada carta do deck:
   - major: `majorArcana[id]`
   - minor: `minorArcana[suit][rank]` + nome composto com preposição (`of`/`de`/`di`/`van`…)
4. Posições na ordem fixa `determinant → past → present → future`.
5. Grava `deck.json`, `{code}.cards.json`, `{code}.meta.json` (+ `render`/`ui` residuais, não consumidos pelo server).

**Invariante importante:** `deck[i].id == cards[i].id` — o sorteio devolve índices nesse array, nunca ids soltos.

## Ressalvas

O projeto deu tão certo que ficou um site de leitura de tarô gratuito, inspirado no tarô tradicional. O ponto de partida foi técnico, não místico — mas o resultado é um tarot de verdade: 78 cartas, interpretações completas, em 28 idiomas. Ele funciona como qualquer site de tarot funcionaria. A única diferença é a motivação de quem construiu: é um projeto de Tecnologia que escolheu o tarot como domínio pra testar alcance global e escala numa infraestrutura mínima. As leituras não devem ser lidas como orientação real para decisões importantes.
