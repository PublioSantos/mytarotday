const fs = require("fs");
const path = require("path");
const i18n = require("./i18n");

const TEMPLATE_PATH = path.join(__dirname, "..", "views", "index.html");
const TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf8");

const BASE_URL = (process.env.SITE_URL || "https://mytarot.day").replace(/\/+$/, "");

// Cache-busts /css/styles.css and /js/app.js: fixed for this process's
// lifetime, so it changes on every deploy restart (forcing browsers past
// their 5-minute static-asset cache) without changing on every request.
const ASSET_VERSION = Date.now();

// GEO (Generative Engine Optimization) metadata: helps AI answer engines and
// crawlers date and attribute this content. DATE_PUBLISHED is fixed to the
// project's actual first commit; DATE_MODIFIED tracks the running process's
// start time (i.e. the last deploy), same lifecycle as ASSET_VERSION above.
const DATE_PUBLISHED = "2026-08-09";
const DATE_MODIFIED = new Date(ASSET_VERSION).toISOString().slice(0, 10);

// Subset of `ui.*` the client JS needs at runtime (fan card aria-label,
// orientation/today labels).
const CLIENT_UI_KEYS = [
  "submitLabel",
  "reversedLabel",
  "uprightLabel",
  "todayBadge"
];

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function getPath(obj, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function localeHomeHref(code) {
  return code === i18n.DEFAULT_LOCALE ? "/" : `/${code}/`;
}

function buildHreflangLinks() {
  const links = i18n.SUPPORTED_LOCALES.map(
    (code) => `<link rel="alternate" hreflang="${code}" href="${BASE_URL}${localeHomeHref(code)}" />`
  );
  links.push(`<link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`);
  return links.join("\n");
}

// Same format as the sister site (myzodiac.day): a <select> in the header,
// options labeled with the plain uppercase language code, navigating via
// onchange — rather than a row of native-name links.
function buildLanguageSwitcher(currentCode) {
  return i18n.SUPPORTED_LOCALES.map((code) => {
    const selected = code === currentCode ? " selected" : "";
    const title = escapeHtml(i18n.NATIVE_NAMES[code] || code);
    // The default locale's canonical URL is "/" (needed so hreflang/canonical
    // don't point at "/en/"), but linking the switcher's EN option straight
    // to "/" skips the locale cookie update entirely: "/" then reads the
    // *old* cookie (e.g. "pt") and redirects right back, silently ignoring
    // the explicit choice. ?lang=en (handled directly in server.js's "/"
    // route) sidesteps that: it's a URL no browser has ever cached a
    // redirect for, so — unlike routing through /en/'s 301 — it can't get
    // silently short-circuited by a browser that visited /en/ before this
    // fix existed and still has that old, uncached-header 301 memorized.
    const href = code === i18n.DEFAULT_LOCALE ? "/?lang=en" : localeHomeHref(code);
    return `<option value="${href}" title="${title}"${selected}>${code.toUpperCase()}</option>`;
  }).join("\n");
}

function buildClientI18n(locale) {
  const subset = {};
  for (const key of CLIENT_UI_KEYS) subset[key] = locale.ui[key];
  return subset;
}

// Structured data: a WebApplication describing the tool itself (so Google can
// show it as a rich result / app-like listing) plus the Organization behind
// it, linked to its sister site. "<" is escaped the same way as the client
// i18n payload above, purely defensively (translated strings shouldn't
// contain it, but a JSON-LD block is still a <script> body).
function buildJsonLd(code, locale, canonicalUrl) {
  const ui = locale.ui;
  const graph = [
    {
      "@type": "WebApplication",
      name: ui.logo,
      url: canonicalUrl,
      description: ui.tagline,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      inLanguage: code,
      isAccessibleForFree: true,
      datePublished: DATE_PUBLISHED,
      dateModified: DATE_MODIFIED,
      featureList: [
        "Shuffle and pick your own four cards from an open fan",
        "Determinant, Past, Present, and Future four-card spread",
        "Genuinely random draw every time, no birth date or personal number needed",
        "28 languages",
        "No signup, no account, free forever",
      ],
      isPartOf: { "@type": "WebSite", name: "MyTarot.Day", url: `${BASE_URL}/` },
    },
    {
      "@type": "Organization",
      name: "P.San Team",
      url: `${BASE_URL}/`,
      sameAs: ["https://myzodiac.day"],
    },
  ];

  // FAQPage rich-result: only added for locales with translated FAQ content
  // (see data/en.json / data/pt.json's top-level "faq" array) — omitted
  // entirely elsewhere rather than falling back to untranslated English text.
  if (Array.isArray(locale.faq) && locale.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: locale.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  const data = { "@context": "https://schema.org", "@graph": graph };
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 4).replace(/</g, "\\u003c")}\n</script>`;
}

const cache = new Map();

/** Renders (and caches) the full index page HTML for a supported locale code. */
function renderLocale(code) {
  if (cache.has(code)) return cache.get(code);

  const locale = i18n.getLocaleData(code);
  const ui = locale.ui;

  // Client-facing i18n payload embedded as JSON — escape "<" so a translated
  // string can never prematurely close the surrounding <script> tag.
  const clientI18nJson = JSON.stringify(buildClientI18n(locale)).replace(/</g, "\\u003c");

  const canonicalUrl = `${BASE_URL}${localeHomeHref(code)}`;
  // No untranslated-English fallback here on purpose: a skip link is a real
  // accessibility aid (unlike the FAQ rich result above, which is omitted
  // when untranslated), so every locale gets one — falling back to English
  // text only where a locale's own translation isn't in yet.
  const skipLinkText = ui.skipToContent || "Skip to main content";

  let html = TEMPLATE
    .replace(/{{LOCALE_CODE}}/g, code)
    .replace(/{{LOCALE_DIR}}/g, i18n.isRtl(code) ? "rtl" : "ltr")
    .replace(/{{QUESTION_MARK}}/g, i18n.questionMark(code))
    .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
    .replace(/{{ASSET_VERSION}}/g, ASSET_VERSION)
    .replace(/{{DATE_PUBLISHED}}/g, DATE_PUBLISHED)
    .replace(/{{DATE_MODIFIED}}/g, DATE_MODIFIED)
    .replace(/{{SKIP_LINK_TEXT}}/g, escapeHtml(skipLinkText))
    .replace(/{{OG_IMAGE_URL}}/g, `${BASE_URL}/og-image.png`)
    .replace(/{{HREFLANG_LINKS}}/g, buildHreflangLinks())
    .replace(/{{JSON_LD}}/g, buildJsonLd(code, locale, canonicalUrl))
    .replace(/{{LANGUAGE_SWITCHER}}/g, buildLanguageSwitcher(code))
    .replace(/{{HOME_HREF}}/g, localeHomeHref(code))
    .replace(/{{CLIENT_I18N_JSON}}/g, clientI18nJson)
    .replace(/{{PAGE_TITLE}}/g, escapeHtml(`${ui.freeTitlePhrase} — ${ui.logo}`))
    .replace(/{{META_DESCRIPTION}}/g, escapeHtml(ui.tagline));

  // Generic {{dotted.path}} substitution against the locale JSON, e.g. {{ui.heroSub}}.
  html = html.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (_, tokenPath) => {
    const value = getPath(locale, tokenPath);
    return value == null ? "" : escapeHtml(value);
  });

  cache.set(code, html);
  return html;
}

module.exports = { renderLocale, localeHomeHref, BASE_URL };
