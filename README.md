[English](README.md) | [Português](README.pt_BR.md)

# MyTarot.Day

[mytarot.day](https://mytarot.day) is a technology test project. The tarot deck was used as a **testing tool**, not as a subject of tarot study, I'm not a tarot reader or a mystic. What I wanted was to build a real, functional site, used worldwide, with a huge number of possible combinations, running entirely on a small, free VPS (OCI/Ubuntu). Today running on Kof beta 0.5.0 .

In the server code (server/Main.kf), generation is dynamic per request.

## The challenge I set for myself

- **Global reach**: the site is translated into **28 languages**, including RTL languages (Arabic, Hebrew) and CJK languages (Japanese, Korean, Chinese).
- **Millions of combinations**: each reading draws 4 distinct cards out of 78 (order matters: determinant/past/present/future), and each card can come up upright or reversed. That produces `78×77×76×75 × 2⁴ =` **548 million** possible reading combinations per language, without needing to store each combination individually.
- **Minimal infrastructure**: all of this runs on a single **OCI Always Free** (Oracle Cloud) instance, at zero server cost.

## How it was built

It would have been easy to write a prompt for an AI to generate a tarot reading. Instead, I chose to use the cards and their meanings to compose the texts deterministically, using grammatical structures to fit the pieces together.

The site started out as a conventional Node/Express application (Express + templates + per-language content JSON). Later, it also became a testbed for another technical curiosity: porting the entire application to [Kof](https://koflang.github.io/), a programming language still under development — not just the server, but the **entire build**. Since September 12, 2026, the production site ( https://mytarot.day ) has been running on Kof; since September 26, 2026, the build process itself (rendering each locale's HTML, assembling the API responses, flattening the content data) also runs 100% on Kof, no Node in the path at all — zero-downtime blue-green deploys throughout.

Direct indexed access to in-memory arrays is faster than query to a DBMS. The response is assembled instantly, even under heavy traffic on the most modest instance.

- **Nginx** — the edge web server: takes every connection on port 80 (TLS already terminated upstream by Cloudflare), serves `public/`'s static files straight from disk (images, CSS, JS, blog), does the canonical redirect (www→apex, http→https), and proxies the rest to the backend.
- **Kof** (`server/Main.kf`) — the application server: handles whatever Nginx doesn't resolve on its own — the `/api/*` routes and each locale's HTML — running as two identical instances (`mytarot-kof-a`/`mytarot-kof-b`) that alternate on every blue-green deploy.


## Repository layout

- **`content/`** — the original Node/Express app. Only `views/` (HTML template), `public/` (CSS, JS, images, blog) and `data/` (per-language card text and copy, plus the neutral card structure) are still the source of truth — the Kof build reads those three directly. `lib/` (i18n and rendering logic) and `server.js` are dead code now that the build is also 100% Kof: nothing reads that logic anymore, kept only as historical reference for how the site started out.
- **`kof/`** — the Kof port, 100% of both build and runtime: `server/Main.kf` (the production HTTP server), `engine/Main.kf` (the drawing engine, ported with byte-for-byte parity to the original JS), `config/Main.kf` (per-language config), `reshape/Main.kf` (flattens the content data), `gerador/Main.kf` (assembles the API responses), `renderizador/Main.kf` (pre-renders each locale's HTML — the page's JSON-LD block is built by hand to byte-match the indented format Kof's `json.encode` doesn't natively support yet), `deploy.sh` (the blue-green deploy script), and the bug repros filed against the Kof compiler along the way (`bugs/`).
- Excluded on purpose: the `mobile/` Capacitor/Android app (a separate client not covered by this repo), `node_modules/`, and machine-specific paths (a real deploy needs its own `.env`, see `.env.example` in `kof/`).

## Data Architecture

The core idea of the data model: separate what's **neutral** (id, image, suit) from what's **language-specific** (name, meaning, UI text). That's what lets a single canonical deck serve all 28 languages without duplicating structure.

### Layered view

```
SOURCE (content/data/)
├── cards-structure.json     ← the deck's visual identity (language-agnostic)
└── {ar,cs,...,zh}.json      ← 28 files: text + UI + positions + FAQ

        ↓  reshape/Main.kf  (build)

ARTIFACTS (consumed by the server)
├── deck.json                ← List<NeutralCard>  (78 items, fixed order)
├── {code}.cards.json        ← List<CardText>     (78, same index as deck)
├── {code}.meta.json         ← Meta               (positions + clauses + label)
├── {code}.html / .api.json  ← pre-rendered (other build steps)
└── locales.json             ← supported, fallback, aliases, RTL, etc.
```

### 1. Source: `cards-structure.json`

The Rider–Waite–Smith deck, with no text at all:

| Block | Count | Fields |
|---|---|---|
| `major` | 22 (ids 0–21) | `id`, `glyph`, `image` |
| `minor` | 56 (ids 22–77) | `id`, `suitKey`, `rankKey`, `glyph`, `image` |

- Major: Fool → World (`fool`, `magician`, …).
- Minor: 4 suits × 14 ranks (`wands`/`cups`/`swords`/`pentacles` × `ace`…`king`).
- Images named like `RWS_Tarot_00_Fool.jpg`, `Wands01.jpg`, etc.

This is the deck's canonical key — any language plugs into these ids.

### 2. Source: `{code}.json` (e.g. `en.json`)

One large object per language:

```
{
  ui: { ... ~30 interface strings ... },
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

Design notes:
- Major indexed by string id (`"0"`…`"21"`).
- Minor indexed by suit → rank (not by numeric id) — more readable for whoever edits the text.
- A minor card's name isn't in the card's own JSON: `reshape` assembles `rank + preposition + suit` (e.g. "Ace of Wands", "Ás de Paus").
- Fixed positions under 4 keys: `determinant | past | present | future`.
- `summaryClauses` use `{determinant}`, `{past}`, `{future}` placeholders (present doesn't go into the summary).
- `ui` holds the page copy (~30 fixed keys).

The 28 codes in `config/Main.kf` match exactly the files under `content/data/` (not counting `cards-structure.json`): `ar, cs, da, de, el, en, es, fi, fr, he, hi, hu, id, it, ja, ko, nl, no, pl, pt, ro, ru, sv, th, tr, uk, vi, zh`.

### 3. Artifacts: what the runtime actually reads

**`deck.json` → `List<NeutralCard>`**
```
NeutralCard(id, glyph, image, suitKey, rankKey, isMajor)
```
Major: `suitKey`/`rankKey` empty, `isMajor = 1`. Minor: suit/rank filled in, `isMajor = 0`. Order = index `0..77`, aligned with the text arrays.

**`{code}.cards.json` → `List<CardText>`**
```
CardText(id, name, keywords, upright, reversed, advice)
```
Same order as `deck`. Accessed by index after the draw: `cards.get(chosen[i])` + `deck.get(chosen[i])`.

**`{code}.meta.json` → `Meta`**
```
Meta(
  positions: List<Position>,   // order: determinant, past, present, future
  summaryClauses: List<String>,
  reversedLabel: String        // e.g. lowercase "reversed", comes from ui.reversedLabel
)
Position(key, label, subtitle, intros[])
```

**API response → output records**
```
LeituraJson(date, cards: List<PosicaoJson>, summary)
PosicaoJson(position, label, subtitle, card: CartaJson, orientation, keywords, reading)
CartaJson(id, name, glyph, image, isMajor)
```
Field order in the record = key order in the JSON (Kof's `json.encode`).

**`locales.json`**
```
supported[], fallback ("en"),
aliases (nb→no, nn→no, iw→he, in→id),
idiomas[]: { code, nativeName, isRtl, questionMark, dateFormat }
```

### The flattening pipeline (`reshape`)

`reshape` exists because the source is nested and readable (good for editing text), but the runtime wants id-indexed lists (good for performance and simplicity in Kof):

1. Reads `cards-structure.json` → builds the `deck` (78 `NeutralCard`).
2. For each language, extracts fragments of the source JSON (`campoBruto` / a manual parser, written by hand instead of decoding the nested `Map` directly).
3. For each card in the deck:
   - major: `majorArcana[id]`
   - minor: `minorArcana[suit][rank]` + name assembled with a preposition (`of`/`de`/`di`/`van`…)
4. Positions in the fixed order `determinant → past → present → future`.
5. Writes `deck.json`, `{code}.cards.json`, `{code}.meta.json` (plus leftover `render`/`ui` files, not consumed by the server).

**Important invariant:** `deck[i].id == cards[i].id` — the draw returns indexes into this array, never bare ids.

## Caveats

The project worked out so well that it became a free tarot reading site, inspired by traditional tarot. The starting point was technical, not mystical — but the result is a real tarot site: 78 cards, full interpretations, in 28 languages. It works like any tarot site would. The only difference is the builder's motivation: this isn't a tarot reader's voice, it's a Technology project that picked tarot as the domain to test global reach and scale on minimal infrastructure. Readings should not be read as real guidance for important decisions.
