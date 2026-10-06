const cardsStructure = require("../data/cards-structure.json");
const { pickUnique, pickOne } = require("./rng");
const { getLocaleData, minorCardName } = require("./i18n");

// Language-neutral deck (id, glyph, image, suitKey/rankKey for minors) — the
// SAME deck, in the SAME order, regardless of locale. Card selection is
// random per draw, so it must never depend on which language is being
// displayed: a reading has to draw the same cards in every language, only
// the text changes.
const NEUTRAL_DECK = [...cardsStructure.major, ...cardsStructure.minor];

/** Attaches localized text (name/keywords/upright/reversed/advice) to a neutral card. */
function localizeCard(neutralCard, locale, localeCode) {
  const isMajor = neutralCard.id < 22;
  const entry = isMajor
    ? locale.majorArcana[String(neutralCard.id)]
    : locale.minorArcana[neutralCard.suitKey][neutralCard.rankKey];

  const name = isMajor
    ? entry.name
    : minorCardName(locale.ranks[neutralCard.rankKey], locale.suits[neutralCard.suitKey], localeCode);

  return {
    id: neutralCard.id,
    glyph: neutralCard.glyph,
    image: neutralCard.image,
    isMajor,
    name,
    keywords: entry.keywords,
    upright: entry.upright,
    reversed: entry.reversed,
    advice: entry.advice
  };
}

/**
 * Builds one paragraph of fluid reading text for a single position + card.
 * `position.intros` already end in a colon (see data/en.json), so no extra
 * connective word is needed between the intro and the card name.
 */
function composeParagraph({ position, card, orientation, random, reversedWord }) {
  const intro = pickOne(position.intros, random);
  const rawMeaning = orientation === "upright" ? card.upright : card.reversed;
  const meaning = rawMeaning.replace(/\.\s*$/, "");
  const orientationWord = orientation === "upright" ? "," : `, ${reversedWord},`;

  return `${intro} **${card.name}**${orientationWord} ${meaning}. ${card.advice}`;
}

/**
 * Generates a full four-card reading. The visitor draws the cards themselves
 * (clicking the deck four times in the UI), so each draw is genuinely
 * random — only the display text depends on locale (see NEUTRAL_DECK above).
 *
 * @param {string} clientDateStr - visitor's local calendar date, "YYYY-MM-DD" (already validated by the caller)
 * @param {string} localeCode - resolved, supported locale code (already validated by the caller)
 */
function generateReading(clientDateStr, localeCode) {
  const locale = getLocaleData(localeCode);
  const positions = [
    { key: "determinant", ...locale.positions.determinant },
    { key: "past", ...locale.positions.past },
    { key: "present", ...locale.positions.present },
    { key: "future", ...locale.positions.future }
  ];

  const dayKey = clientDateStr;
  const random = Math.random;

  const chosenNeutral = pickUnique(NEUTRAL_DECK, positions.length, random);
  const reversedWord = String(locale.ui.reversedLabel || "Reversed").toLowerCase();

  const cards = positions.map((position, i) => {
    const card = localizeCard(chosenNeutral[i], locale, localeCode);
    const orientation = random() < 0.35 ? "reversed" : "upright";
    const paragraph = composeParagraph({ position, card, orientation, random, reversedWord });
    return {
      position: position.key,
      label: position.label,
      subtitle: position.subtitle,
      card: {
        id: card.id,
        name: card.name,
        glyph: card.glyph,
        image: card.image,
        isMajor: card.isMajor
      },
      orientation,
      keywords: card.keywords,
      reading: paragraph
    };
  });

  // {determinant} keeps its bold, original-case name; {past}/{future} are
  // lowercased inline references — matches the original hardcoded English.
  const clauseVars = {
    determinant: `**${cards[0].card.name}**`,
    past: cards[1].card.name.toLowerCase(),
    future: cards[3].card.name.toLowerCase()
  };
  const rawClause = pickOne(locale.summaryClauses, random);
  const summary = rawClause.replace(/\{(\w+)\}/g, (_, key) => clauseVars[key] ?? "");

  return {
    date: dayKey,
    cards,
    summary
  };
}

module.exports = { generateReading };
