const express = require("express");
const helmet = require("helmet");
const path = require("path");
const { generateReading } = require("./lib/readingEngine");
const i18n = require("./lib/i18n");
const { renderLocale } = require("./lib/render");

const app = express();
const PORT = process.env.PORT || 3000;

// We sit behind an Nginx reverse proxy on the same host (Nginx -> Node over
// 127.0.0.1), so only trust X-Forwarded-For from that loopback hop — not
// `true`, which would trust the whole chain and let a spoofed header from
// anyone reach req.ip unfiltered.
app.set("trust proxy", "loopback");

// Nginx now forwards Cloudflare's original X-Forwarded-Proto unchanged (see
// the mytarot.day site config), so req.secure correctly reflects whether the
// visitor's original request was HTTPS. Anything that slipped through as
// plain HTTP gets bounced to HTTPS here, at the origin, regardless of
// Cloudflare dashboard settings. www.mytarot.day resolves to the same app
// (Cloudflare DNS) and was serving 200s instead of redirecting, which is
// what caused GSC's "Duplicate without user-selected canonical" report for
// privacy/terms/contact — the canonical tag alone isn't a strong enough
// signal, so we now force a single host too, in the same 301 as the
// HTTPS bounce to avoid a double redirect.
app.use((req, res, next) => {
  const host = req.headers.host || "";
  const canonicalHost = host.replace(/^www\./i, "");
  if (req.secure && host === canonicalHost) return next();
  res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://www.googletagmanager.com",
          "https://static.cloudflareinsights.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://www.google-analytics.com",
          "https://*.google-analytics.com",
          "https://analytics.google.com",
          "https://*.analytics.google.com",
          "https://stats.g.doubleclick.net",
          "https://*.doubleclick.net",
          "https://www.google.com",
          "https://www.googletagmanager.com",
          "https://cloudflareinsights.com",
          "https://static.cloudflareinsights.com",
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(express.json());

// ---------------------------------------------------------------------------
// Static files.
//
// server.js now lives at the app ROOT (/var/www/mytarot/server.js), and
// public/ contains ONLY web-servable content (no source code, no
// node_modules, no data/*.js). That's what makes a plain express.static
// mount safe here — there's nothing sensitive inside public/ to leak.
//
// (The old bug: server.js used to live INSIDE public/ itself, so
// express.static(__dirname + "/public") pointed at a non-existent nested
// public/public/ folder, and every static request silently fell through to
// the SPA fallback route below — the "images show blank/broken" bug.)
//
// index.html no longer lives in public/ — it's now views/index.html, a
// template rendered per-locale (see lib/render.js) so the tarot tool itself
// can be served in any of the 28 languages under data/*.json. Everything
// else in public/ (css/js/images/blog/about/terms/privacy/contact) is still
// English-only static content, served as-is.
// ---------------------------------------------------------------------------

const PUBLIC_DIR = path.join(__dirname, "public");

// Images get a longer cache lifetime — filenames are stable per card.
// Imagens raramente mudam de nome/conteúdo — cache longo compensa.
app.use("/images", express.static(path.join(PUBLIC_DIR, "images"), { maxAge: "30d", immutable: true }));
// HTML/CSS/JS ainda em iteração ativa — cache curto pra evitar visitante
// (ou você mesmo, testando) preso numa versão antiga por até 1 dia.
app.use(express.static(PUBLIC_DIR, { maxAge: "5m" }));

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates the client-supplied local calendar date string ("YYYY-MM-DD").
 * We deliberately use the visitor's own device date for the reading, rather
 * than the server's clock, so this only checks the string is well-formed and
 * represents a real calendar date — not that it matches server time.
 */
function isValidClientDate(str) {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map((n) => parseInt(n, 10));
  if (y < 2000 || y > 2200) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// ---------------------------------------------------------------------------
// Anti-spam: per-client (IP) request throttling.
// First 4 requests in a rolling hour are immediate; the 5th is delayed 5s,
// the 6th 10s, and the 7th+ 20s. The counter resets after an hour of silence.
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitState = new Map(); // ip -> { count, lastRequestTime }

function getDelayForCount(count) {
  if (count <= 4) return 0;
  if (count === 5) return 5000;
  if (count === 6) return 10000;
  return 20000;
}

/**
 * The origin only accepts port 80 traffic from Cloudflare's IP ranges (see
 * the VPS firewall), so `cf-connecting-ip` — set by Cloudflare's edge from
 * its own view of the connection, not merely relayed from a client-supplied
 * header — is trustworthy here. Falls back to req.ip (loopback-trusted
 * X-Forwarded-For from Nginx) for local/direct testing where that header
 * isn't present.
 */
function getClientIp(req) {
  return req.headers["cf-connecting-ip"] || req.ip;
}

function registerRequestAndGetDelay(ip) {
  const now = Date.now();
  const existing = rateLimitState.get(ip);

  const isFresh = !existing || now - existing.lastRequestTime > RATE_WINDOW_MS;
  const count = isFresh ? 1 : existing.count + 1;

  rateLimitState.set(ip, { count, lastRequestTime: now });
  return getDelayForCount(count);
}

// Periodic cleanup so the map doesn't grow unbounded on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitState) {
    if (now - entry.lastRequestTime > RATE_WINDOW_MS) rateLimitState.delete(ip);
  }
}, 15 * 60 * 1000).unref();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// i18n routing
//
// Subpath strategy (mytarot.day/pt/, /es/, ...) rather than a ?lang= query
// param — same convention already used on the sister site (myzodiac.day)
// and the one that gives every language its own indexable, shareable URL.
//
// "/" auto-detects from Accept-Language on a visitor's first hit (falling
// back to English when nothing matches) and then redirects to "/xx/" — but
// only once: a `locale_choice` cookie remembers the outcome so a repeat
// visit to "/", or clicking "English" in the language switcher, doesn't get
// bounced back to a browser-language guess the visitor already overrode.
// Googlebot sends no Accept-Language on crawl requests, so this never fires
// for it — "/" still renders English directly, keeping it a stable
// hreflang x-default target. English is also reachable at "/en/", which
// redirects to "/" to avoid duplicate-content URLs for the same page.
// ---------------------------------------------------------------------------

const LOCALE_ROUTE_RE = new RegExp(`^/(${i18n.SUPPORTED_LOCALES.join("|")})/?$`);
const LOCALE_COOKIE = "locale_choice";
const LOCALE_COOKIE_OPTS = { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "Lax", path: "/" };

/** Manually parsed (no cookie-parser dependency needed for one simple cookie). */
function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
}

app.get("/", (req, res) => {
  // The language switcher's English option links here with ?lang=en instead
  // of relying on a redirect from /en/: a bare 301 to "/" is exactly the
  // kind of response browsers cache indefinitely, so a *second* visit to
  // /en/ can skip the request entirely and silently keep whatever locale
  // cookie was already set, ignoring the explicit choice. ?lang=en is a URL
  // nobody's browser has ever cached anything for, so it always reaches the
  // server and updates the cookie for real.
  if (req.query.lang === i18n.DEFAULT_LOCALE) {
    res.cookie(LOCALE_COOKIE, i18n.DEFAULT_LOCALE, LOCALE_COOKIE_OPTS);
    return res.type("html").send(renderLocale(i18n.DEFAULT_LOCALE));
  }

  const chosen = parseCookies(req)[LOCALE_COOKIE];

  if (i18n.isSupported(chosen)) {
    if (chosen !== i18n.DEFAULT_LOCALE) {
      return res.redirect(302, `/${chosen}/`);
    }
  } else {
    const negotiated = i18n.negotiateLocale(req.headers["accept-language"]);
    res.cookie(LOCALE_COOKIE, negotiated || i18n.DEFAULT_LOCALE, LOCALE_COOKIE_OPTS);
    if (negotiated && negotiated !== i18n.DEFAULT_LOCALE) {
      return res.redirect(302, `/${negotiated}/`);
    }
  }

  res.type("html").send(renderLocale(i18n.DEFAULT_LOCALE));
});

app.get(LOCALE_ROUTE_RE, (req, res) => {
  const code = req.params[0];
  res.cookie(LOCALE_COOKIE, code, LOCALE_COOKIE_OPTS);
  if (code === i18n.DEFAULT_LOCALE) {
    // This redirect's whole job is the Set-Cookie side effect above (e.g. the
    // language switcher's EN option links here specifically so the cookie
    // gets updated before landing on "/"). A bare 301 is cached by browsers
    // indefinitely, so a *second* visit to /en/ skips the request entirely
    // and silently keeps whatever cookie was already there — no-store keeps
    // the 301 as a strong permanent-redirect signal for crawlers/SEO while
    // stopping browsers from short-circuiting the request locally.
    res.set("Cache-Control", "no-store");
    return res.redirect(301, "/");
  }
  res.type("html").send(renderLocale(code));
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// The MyTarotDay Android app (Capacitor) bundles its UI locally and calls
// these JSON endpoints from a different origin (the app's WebView), so the
// API — and only the API, never the HTML/static routes — needs CORS opened
// up. Safe: no cookies/auth on these endpoints, and they're already publicly
// callable by anyone loading the website itself.
app.use("/api", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Locale UI strings as JSON — the same data lib/render.js templates into HTML
// server-side for the website, but exposed directly for the MyTarotDay app,
// which bundles its own markup and renders the chrome (hero copy, labels,
// footer, errors) client-side instead of receiving pre-rendered HTML per
// locale. Card names/text are already fully localized in the /api/reading
// response, so this only needs to carry the `ui.*` strings plus the language
// list for the picker.
app.get("/api/locale/:code", (req, res) => {
  const code = i18n.resolveLocale(req.params.code);
  const locale = i18n.getLocaleData(code);
  res.json({
    code,
    isRtl: i18n.isRtl(code),
    dateFormat: i18n.dateFormatOrder(code),
    questionMark: i18n.questionMark(code),
    ui: locale.ui,
    locales: i18n.SUPPORTED_LOCALES.map((c) => ({ code: c, name: i18n.NATIVE_NAMES[c] || c }))
  });
});

app.post("/api/reading", async (req, res) => {
  const { clientDate, locale } = req.body || {};
  const localeCode = i18n.resolveLocale(locale);

  if (!isValidClientDate(clientDate)) {
    // No translated copy for this (rare) edge case yet — falls back to English.
    return res.status(400).json({
      error: "Your device's date couldn't be read correctly. Please refresh and try again."
    });
  }

  // Anti-spam: delay the response (never reject it) based on this client's
  // recent request volume.
  const delay = registerRequestAndGetDelay(getClientIp(req));
  if (delay > 0) await sleep(delay);

  try {
    const reading = generateReading(clientDate, localeCode);
    res.json(reading);
  } catch (err) {
    console.error("Failed to generate reading:", err);
    res.status(500).json({ error: "Something went wrong drawing your cards. Please try again." });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Fallback to the (English) home page for any non-API, non-static route
// (single-page app style — e.g. unknown/mistyped paths). Real HTTP 404 status
// so Search Console/crawlers see a genuine not-found rather than a soft-404
// (a mistyped URL 200'ing as the homepage wastes crawl budget and can get
// indexed as duplicate content) — the body is still the friendly homepage.
app.get(/^(?!\/api).*/, (req, res) => {
  res.status(404).type("html").send(renderLocale(i18n.DEFAULT_LOCALE));
});

app.listen(PORT, () => {
  console.log(`MyTarot.Day running on port ${PORT}`);
});
