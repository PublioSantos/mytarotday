const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DEFAULT_LOCALE = "en";

/**
 * "Rank of Suit" preposition for minor-arcana card names, e.g. "Ace {of} Wands".
 * Locale JSON files store `ranks`/`suits` as bare words with no connector, so
 * the full card name has to be assembled here.
 *
 * Most locales fall back to plain juxtaposition ("{rank} {suit}") and trust
 * that the translator already put `suits.*` in whatever grammatical form
 * (case, number) reads correctly next to a rank — that's a best-effort
 * assumption, not verified by a native speaker. Only the handful below use an
 * explicit preposition we're confident about; treat this list, and the
 * juxtaposition fallback, as needing native review before calling the
 * multilingual card names "correct" rather than "functional".
 */
const MINOR_CARD_PREPOSITION = {
  en: "of",
  pt: "de",
  es: "de",
  fr: "de",
  ro: "de",
  it: "di",
  nl: "van"
};

const NATIVE_NAMES = {
  ar: "العربية",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  fi: "Suomi",
  fr: "Français",
  he: "עברית",
  hi: "हिन्दी",
  hu: "Magyar",
  id: "Bahasa Indonesia",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  nl: "Nederlands",
  no: "Norsk",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  ru: "Русский",
  sv: "Svenska",
  th: "ไทย",
  tr: "Türkçe",
  uk: "Українська",
  vi: "Tiếng Việt",
  zh: "中文"
};

const RTL_LOCALES = new Set(["ar", "he"]);

/**
 * Visible order for the birth-date input (placeholder + typing mask only —
 * the value sent to the server is always ISO "YYYY-MM-DD", never
 * locale-dependent). Day-first is the default because it's how most of the
 * world writes dates; "en" keeps the site's original month-first mask, and
 * the locales below are the well-known year-first exceptions (Japan, Korea,
 * China, Hungary, and Sweden's ISO-influenced convention). The separator is
 * kept as "/" everywhere rather than switching to "." for locales that
 * technically prefer it (de, fi, hu, ru...) — one less variable to get wrong
 * without native review.
 */
const YEAR_FIRST_LOCALES = new Set(["ja", "ko", "zh", "hu", "sv"]);
const MONTH_FIRST_LOCALES = new Set(["en"]);

/** Returns "MDY" | "DMY" | "YMD" — the segment order for the date input mask. */
function dateFormatOrder(code) {
  if (MONTH_FIRST_LOCALES.has(code)) return "MDY";
  if (YEAR_FIRST_LOCALES.has(code)) return "YMD";
  return "DMY";
}

// Arabic/Hebrew get their own question mark; every other locale we ship
// uses the plain "?" (fine even where a fancier convention, like Spanish's
// leading "¿", exists — that's a cosmetic gap, not a correctness one).
const QUESTION_MARK = { ar: "؟", he: "؟" };

function loadLocales() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && f !== "cards-structure.json");
  const locales = {};
  for (const file of files) {
    const code = file.replace(".json", "");
    locales[code] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
  }
  return locales;
}

const LOCALES = loadLocales();
const SUPPORTED_LOCALES = Object.keys(LOCALES).sort();

function isSupported(code) {
  return typeof code === "string" && Object.prototype.hasOwnProperty.call(LOCALES, code);
}

/**
 * Real devices/browsers don't always send the exact ISO code our data/*.json
 * files are keyed by: Android reports Norwegian as "nb" (Bokmål) or "nn"
 * (Nynorsk), never the bare macrolanguage "no" our locale file uses, and
 * some older WebViews still send the pre-2000s deprecated codes "iw"/"in"
 * instead of "he"/"id". Without this, e.g. every Norwegian-language device
 * would silently fall back to English despite a "no" translation existing.
 */
const LOCALE_ALIASES = { nb: "no", nn: "no", iw: "he", in: "id" };

function getLocaleData(code) {
  return LOCALES[isSupported(code) ? code : DEFAULT_LOCALE];
}

/** Supported code as-is, else a known alias mapped to its supported code, else the default. */
function resolveLocale(code) {
  if (isSupported(code)) return code;
  const aliased = LOCALE_ALIASES[code];
  return aliased && isSupported(aliased) ? aliased : DEFAULT_LOCALE;
}

/** Parses an Accept-Language header, returns the best supported match (following LOCALE_ALIASES) or null. */
function negotiateLocale(header) {
  if (!header) return null;
  const parsed = header
    .split(",")
    .map((part) => {
      const [rawTag, rawQ] = part.trim().split(";q=");
      return { tag: (rawTag || "").trim().toLowerCase(), q: rawQ ? parseFloat(rawQ) : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const primary = tag.split("-")[0];
    if (isSupported(primary)) return primary;
    const aliased = LOCALE_ALIASES[primary];
    if (aliased && isSupported(aliased)) return aliased;
  }
  return null;
}

function isRtl(code) {
  return RTL_LOCALES.has(code);
}

function questionMark(code) {
  return QUESTION_MARK[code] || "?";
}

/** Builds a localized minor-arcana card name from its rank/suit labels. */
function minorCardName(rankLabel, suitLabel, code) {
  const prep = MINOR_CARD_PREPOSITION[code];
  return prep ? `${rankLabel} ${prep} ${suitLabel}` : `${rankLabel} ${suitLabel}`;
}

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  NATIVE_NAMES,
  isSupported,
  getLocaleData,
  resolveLocale,
  negotiateLocale,
  isRtl,
  questionMark,
  dateFormatOrder,
  minorCardName
};
