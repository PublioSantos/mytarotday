[English](DOING.md) | [Português](DOING.pt_BR.md)

> **✅ DONE (10/08, owner = 192.168.0.131).** Session after a multi-day gap:
> the GitHub repo had been **deleted and recreated from scratch** sometime
> between 09/27 and 10/06 (new repo, `created_at` 10/06, single commit with a
> short new README) — everything pushed earlier (content/, kof/, the full
> README with the Data Architecture section) was gone. Re-pushed `content/`
> (from the VPS, ~450MB) and `kof/` (from this machine) the same way as
> before; restored the full README (renamed its "Why?" section to
> "Data Architecture"/"Arquitetura dos Dados" per request) and added two new
> notes: the Nginx/Kof serving-layer split, and the deliberate choice of
> deterministic text assembly over an AI-generated reading.
>
> **Security regression found and fixed:** `deploy.sh` had reverted to
> hardcoding the real VPS IP and the local SSH key path in plain text —
> the `.env`-based fix from 09/26 never made it into the rebuilt push
> (`.env.example` was missing locally too, so the `cp` silently no-op'd).
> Re-applied the `.env` sourcing and recreated `.env.example`.
>
> **Stale `kof/` files cleaned up** (confirmed via GitHub API, not the CDN —
> `raw.githubusercontent.com` served stale cached content for a few minutes
> after each push and almost caused a false "didn't work" read):
> - `dump-json.sh` — looked like pure shell but had an embedded Python
>   heredoc; dev-only diffing tool, hardcoded to the old 0.3.22-beta
>   toolchain and a 09/13 date. Deleted.
> - `engine/cfg.txt` — stray one-line scratch file. Deleted.
> - `servir.sh` — described the long-gone Node/Kof parallel-testing phase,
>   hardcoded this machine's path. Deleted.
> - `ISSUE-compiler.md` / `ISSUE-web.md` — draft bug reports for 0.3.22-beta
>   issues the maintainer already fixed and closed long ago. Deleted.
> - `nginx-mytarot.day` — was stale (hardcoded `proxy_pass 127.0.0.1:3001`,
>   not the real blue-green `mytarot_app` upstream indirection). Refreshed
>   with the actual live config pulled from the VPS.
>
> **Kof toolchain: tested 0.5.0-beta (latest release, 09/28), confirmed
> still broken, rolled back to 0.4.4-beta.** `kof check` on the real
> `server/Main.kf` hits the exact same ASM `COMPUTE_FRAMES` frame crash in
> `Engine.generateJson` as the 0.4.5–0.4.10 regression — unfixed through the
> newest release. User asked to upgrade anyway, explicitly accepting the
> risk ("if it breaks, I'll tell Mel"). **The risk materialized within
> minutes**: `mytarot-kof-b.service` auto-restarted on its own (systemd
> restart counter went to 9) while `/opt/kof` was on 0.5.0-beta, tried to
> recompile, crashed, site went 502. Rolled back `/opt/kof` to 0.4.4-beta
> immediately; next restart compiled clean, site recovered. `/opt/kof.0.5.0-
> rolledback` kept on the VPS for next time someone wants to re-test.
> Backup chain on the VPS: `kof.0.3.22-rolledback`, `kof.0.5.0-rolledback`
> (0.4.4-beta is back in `/opt/kof` itself).
>
> **NEXT STEP (re-dispatch reads this):** nothing blocked. If a newer Kof
> release ships, re-test `kof check server/Main.kf` against it before ever
> touching `/opt/kof` on the VPS again — the regression has now been
> confirmed broken across SIX releases (0.4.5 through 0.5.0).

> **✅ DONE (09/26, later same day, owner = 192.168.0.131).** The build is now
> **100% Kof, zero Node** — finished the effort the entry below calls
> "blocked". `extrair-config.js`, `gen-api.js`, `gen-html.js` deleted;
> replaced by `config/Main.kf`, `gerador/Main.kf` (rewritten), and the new
> `renderizador/Main.kf`. All four verified byte-for-byte against the old
> Node output for all 28 locales (ignoring the cache-busting timestamp,
> which changes every build by design on both sides) — 0 diffs. Already
> deployed to production via the normal blue-green `./deploy.sh`.
>
> **How the two blockers got resolved:**
> - **`json.encode` has no indentation** (needed for the page's JSON-LD,
>   which must byte-match `JSON.stringify(data, null, 4)`): didn't wait for
>   compiler support — the JSON-LD's shape is fixed (always WebApplication +
>   Organization, FAQPage appended only when the locale has FAQ content), so
>   `renderizador/Main.kf` builds it by hand as a literal string with the
>   exact indentation, instead of through `json.encode`.
> - **`record` has fixed shape, emits `null` for a missing key** (the `ui`
>   object is sparse — 26/28 locales lack `skipToContent`): confirmed
>   `json.encode` of a `Map<String,String>` only emits the keys actually
>   present in it — no fixed schema issue at all once `ui` is a `Map` instead
>   of a `record`. `gerador/Main.kf` already used this from the earlier
>   session; `renderizador/Main.kf` does too.
>
> **New compiler bug found and worked around (not reported yet):** a `Map`
> from `json.decode<Map<...>>` breaks **bytecode verification** — not a
> runtime crash, the method never even starts executing — the instant it's
> passed as an **argument to a user-defined function**, as long as somewhere
> in the same compiled program a record containing a `Map<String,String>`
> also goes through `json.encode()`. The JVM's own error message is
> completely misleading: "JavaFX runtime components not found". Isolated
> with a ~15-line minimal repro. The exact same `Map`, built via
> `mapOf()+put()` instead of `decode`, passed through the same function, in
> the same context — works fine. Workaround applied in `gerador/Main.kf`:
> never pass a decoded `Map` through a function — copy it into a fresh
> `mapOf()` inline, in the same scope as the `decode` call.
>
> **Files touched:** `config/` (new), `renderizador/` (new), `gerador/Main.kf`
> (rewritten), `deploy.sh` (calls the 4 Kof build steps instead of Node),
> `server/Main.kf` (comment only — the "Item 3 blocked" note was stale).
> Deleted: `extrair-config.js`, `gen-api.js`, `gen-html.js`.
>
> **NEXT STEP (re-dispatch reads this):** decide whether to file the two new
> compiler bugs found today (nested `Map<String,Record>` decode, `Map`
> decode passed through a function) as Kof4j issues — follow
> `feedback_kof_issue_template`/`feedback_kof_verify_before_filing` from
> memory, show the user before publishing anything. Nothing blocked or
> pending in production.

> **✅ DONE (09/26, owner = 192.168.0.131).** Session: toolchain upgrade +
> old-bug-workaround review + native port of reshape.py.
>
> **1) VPS toolchain: 0.3.22-beta → 0.4.4-beta.** Production was actually
> running 0.3.22-beta (earlier session memory claimed 0.4.4 — that was wrong;
> always confirm with `kof version` on the VPS before trusting old notes).
> Full backup taken on the VPS itself
> (`~/backups/mytarot_backup_20260926_101545.tar.gz`) before swapping
> `/opt/kof`. Normal blue-green deploy (`./deploy.sh`) — zero downtime.
> 0.4.5 through 0.4.10-beta (tip) still have the compiler ICE in
> `json.encode` after a `List<Record>` loop — don't go past 0.4.4 until
> that's fixed.
>
> **2) Reviewed old-version (0.3.22-beta) bug workarounds, live-tested
> against 0.4.4-beta before touching anything:**
> - hardcoded `<generator>` meta tag in `views/index.html` was stale (said
>   0.3.22 while the site already ran a different version) — fixed to
>   0.4.4-beta, republished across all 28 locales.
> - `as Long` in `Rng.constructor` (issue #103, Int→Long field crashed the
>   0.3.22 backend) — confirmed fixed in 0.4.4, cast removed in
>   `server/Main.kf` and `engine/Main.kf`.
> - `synchronized` silently dropped from bytecode — 0.4.4 now emits a
>   compile-time warning (SEM091) instead. Comment updated, code
>   (`security.rateLimit`) unchanged.
>
> **3) `reshape.py` ported to native Kof** (`reshape/Main.kf`, new) —
> replaced `python3 reshape.py` in `deploy.sh`. Verified with a byte-for-byte
> `cmp`: **0 diffs** against the Python output for every file the server
> actually consumes (`deck.json` + 28× `*.cards.json`/`*.meta.json`). Already
> live in production via the normal blue-green deploy.
>
> **Compiler bug found along the way, NOT reported yet:** `json.decode` of a
> nested `Map<String, Record>` — either as a field of another record, or as
> the value type of another `Map` — silently decodes to an empty map (no
> error). Only works when `Map<String,Record>` is passed as the direct type
> argument to `json.decode<...>(...)`. Worked around in `reshape/Main.kf`
> (`campoBruto`/`extraiValorBalanceado`): manually extracts each top-level
> key's raw JSON substring (quote/escape-aware) and decodes each `Map`
> separately. Minimal standalone repro not yet extracted into its own file.
>
> **Files touched:** `views/index.html` (source, production SSHFS mount),
> `server/Main.kf`, `engine/Main.kf`, `reshape.py` (comment/docstring only,
> no longer called), `deploy.sh` (swapped the reshape call), `reshape/` (new
> program).
>
> **DO NOT TOUCH without reason:** `gerador/Main.kf` — pre-existed this
> session, still unpublished (json.encode has no indentation option and
> records have a fixed shape that emits `null` where the JS source omits the
> key — both still block that larger effort; see the comment in
> `server/Main.kf` around line 14).
>
> **NEXT STEP (re-dispatch reads this):** decide whether the nested
> `Map<String,Record>` bug is worth isolating and filing as a Kof4j issue
> (follow `feedback_kof_issue_template` / `feedback_kof_verify_before_filing`
> from memory — show the user before publishing anything). Nothing is
> blocked or pending in production — mytarot.day is 100% Kof, 0.4.4-beta,
> native reshape, everything verified.
