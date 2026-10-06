// Major Arcana knowledge base — 22 archetypal cards.
// Each card carries an upright and reversed reading, plus a short glyph key
// used by the frontend to draw a minimalist line-art symbol (no external art assets).

// Card art: the original 1909 Rider-Waite-Smith deck, illustrated by Pamela
// Colman Smith. This edition is public domain in the United States (published
// before 1923; see Wikimedia Commons "PD-old-80-expired" / CC-PD-Mark tags).
// Images are referenced by filename and resolved through Commons' stable
// Special:FilePath endpoint in the frontend, with the line-art glyph kept as
// an automatic fallback if an image ever fails to load.

const majorArcana = [
  {
    id: 0, name: "The Fool", glyph: "fool", image: "RWS_Tarot_00_Fool.jpg",
    keywords: ["beginnings", "innocence", "leap of faith", "openness"],
    upright: "a fresh start with no map and no guarantees — nothing to go on but curiosity and the nerve to step forward before every answer is in.",
    reversed: "hesitation dressed up as prudence, a step rehearsed so many times it never gets taken — or the opposite: a leap made blind, without checking what's underneath.",
    advice: "Be a beginner again. The only mistake here is refusing to start."
  },
  {
    id: 1, name: "The Magician", image: "RWS_Tarot_01_Magician.jpg", glyph: "magician",
    keywords: ["resourcefulness", "willpower", "manifestation"],
    upright: "realizing every tool the situation calls for — intellect, skill, timing — is already in your hands, and using them on purpose is the only step left.",
    reversed: "talent sitting unused, or skill bent toward manipulation instead of building something. Either way, ability is going to waste, or confidence is more performance than foundation.",
    advice: "Stop collecting more tools. Pick up the one in your hand and use it."
  },
  {
    id: 2, name: "The High Priestess", image: "RWS_Tarot_02_High_Priestess.jpg", glyph: "priestess",
    keywords: ["intuition", "the unconscious", "hidden knowledge"],
    upright: "knowledge that comes in under language — a hunch, a dream, a feeling that ends up more accurate than any evidence you had at the time.",
    reversed: "a quiet truth getting drowned out by noise, or an instinct kept private because it can't yet prove itself.",
    advice: "Trust what you already sense but haven't said out loud. It knows something your reasoning hasn't caught up to yet."
  },
  {
    id: 3, name: "The Empress", image: "RWS_Tarot_03_Empress.jpg", glyph: "empress",
    keywords: ["abundance", "nurturing", "creativity", "growth"],
    upright: "a season of growth that wants tending, not forcing — a project, relationship, or part of yourself that thrives once it's fed instead of pushed.",
    reversed: "care or creativity tipping into smothering, or fertile ground left untended until it stopped producing anything.",
    advice: "Give what you care about attention instead of pressure. Patience is what grows it."
  },
  {
    id: 4, name: "The Emperor", image: "RWS_Tarot_04_Emperor.jpg", glyph: "emperor",
    keywords: ["structure", "authority", "discipline", "stability"],
    upright: "order built on purpose — a framework, boundary, or plan sturdy enough to hold good intentions up under real pressure.",
    reversed: "control gripped too tightly, or a structure so loose nothing inside it stays upright.",
    advice: "Put up the scaffolding before you build the house. Structure now saves effort later."
  },
  {
    id: 5, name: "The Hierophant", image: "RWS_Tarot_05_Hierophant.jpg", glyph: "hierophant",
    keywords: ["tradition", "belief systems", "guidance", "convention"],
    upright: "wisdom handed down through established channels — a mentor, institution, or tradition whose guidance still deserves following, at least for now.",
    reversed: "a rule kept out of pure habit, or a convention that stopped earning its loyalty a while ago.",
    advice: "Learn the established path first. Decide whether to leave it after."
  },
  {
    id: 6, name: "The Lovers", image: "RWS_Tarot_06_Lovers.jpg", glyph: "lovers",
    keywords: ["connection", "values", "choice", "alignment"],
    upright: "a real alignment between people, values, or paths — a choice that matters because it says what you stand for, not just what you like.",
    reversed: "a mismatch quietly put up with, or a decision dodged because naming it out loud would open a harder conversation.",
    advice: "Name the choice plainly, even if the honest answer makes things messier."
  },
  {
    id: 7, name: "The Chariot", image: "RWS_Tarot_07_Chariot.jpg", glyph: "chariot",
    keywords: ["willpower", "determination", "victory through control"],
    upright: "forward motion won by holding two opposing forces in one hand and steering them both the same way.",
    reversed: "momentum eaten up by internal conflict, or a victory chased so hard it tramples the very thing it was supposed to protect.",
    advice: "Stop wrestling with your own contradictions. Point them the same way and go."
  },
  {
    id: 8, name: "Strength", image: "RWS_Tarot_08_Strength.jpg", glyph: "strength",
    keywords: ["courage", "patience", "quiet resolve", "compassion"],
    upright: "power that never needs to raise its voice — a steadiness that comes from making peace with the hard thing, not burying it.",
    reversed: "self-doubt wearing humility as a disguise, or force reached for where patience would have done more.",
    advice: "Meet what frightens you with calm instead of force. Gentleness isn't weakness."
  },
  {
    id: 9, name: "The Hermit", image: "RWS_Tarot_09_Hermit.jpg", glyph: "hermit",
    keywords: ["introspection", "solitude", "inner guidance"],
    upright: "a necessary retreat — stepping back from the noise to hear what you think, not just what everyone around you is saying.",
    reversed: "isolation curdling into avoidance, or wisdom held so close it never reaches the people who need it.",
    advice: "Take the solitude. Whatever answer you're after won't turn up in a crowd."
  },
  {
    id: 10, name: "Wheel of Fortune", image: "RWS_Tarot_10_Wheel_of_Fortune.jpg", glyph: "wheel",
    keywords: ["cycles", "change", "fate", "turning points"],
    upright: "a shift already underway, pushed by forces bigger than any single choice — circumstance turning in a way that changes the terms of things.",
    reversed: "a cycle repeating itself because the pattern underneath hasn't changed — only its costume has.",
    advice: "Stop trying to control the turning. Put your energy into how you respond once it lands."
  },
  {
    id: 11, name: "Justice", image: "RWS_Tarot_11_Justice.jpg", glyph: "justice",
    keywords: ["fairness", "truth", "cause and effect", "clarity"],
    upright: "a fair reckoning, even if not a comfortable one — clear eyes on cause and effect, and on what's owed.",
    reversed: "an imbalance nobody's addressed, or a truth being sidestepped because facing it head-on would demand accountability.",
    advice: "Look at the situation without flattering yourself. Fairness begins with an honest accounting."
  },
  {
    id: 12, name: "The Hanged Man", image: "RWS_Tarot_12_Hanged_Man.jpg", glyph: "hanged",
    keywords: ["surrender", "new perspective", "pause"],
    upright: "progress made by pausing instead of pushing — a deliberate suspension that opens up an angle on things you couldn't reach while moving.",
    reversed: "delay for its own sake, or a sacrifice that never earned any real understanding in return.",
    advice: "Let this stay unresolved a while longer. The insight lives inside the waiting, not somewhere past it."
  },
  {
    id: 13, name: "Death", image: "RWS_Tarot_13_Death.jpg", glyph: "death",
    keywords: ["transformation", "endings", "release"],
    upright: "a true ending that clears room for something that couldn't have existed alongside it — not destruction, but necessary change.",
    reversed: "a change resisted long after it became inevitable, which only makes the ending harder once it does arrive.",
    advice: "Let the part of this that's already over be over. Something else needs the space it's taking up."
  },
  {
    id: 14, name: "Temperance", image: "RWS_Tarot_14_Temperance.jpg", glyph: "temperance",
    keywords: ["balance", "moderation", "integration", "patience"],
    upright: "two things that looked incompatible settling into a workable middle — patience, blending, the slow craft of getting the proportions right.",
    reversed: "too much in one direction, or a compromise thrown together so fast neither side ends up satisfied.",
    advice: "Slow the mixture down. The right balance won't be forced into place overnight."
  },
  {
    id: 15, name: "The Devil", image: "RWS_Tarot_15_Devil.jpg", glyph: "devil",
    keywords: ["attachment", "restriction", "temptation", "old patterns"],
    upright: "a pattern, habit, or dynamic with more grip on you than you'd like to admit — even though the door out was never locked.",
    reversed: "the first real pull away from something that had you trapped — seeing the chain clearly for what it is.",
    advice: "Look honestly at what you keep choosing even though it costs you. Naming it is where the way out starts."
  },
  {
    id: 16, name: "The Tower", image: "RWS_Tarot_16_Tower.jpg", glyph: "tower",
    keywords: ["sudden change", "upheaval", "revelation"],
    upright: "a structure built on shaky ground, coming down fast — disruptive, but clarifying, since it clears out what was never stable to begin with.",
    reversed: "a collapse held off through sheer avoidance, or a smaller disruption that still shakes something loose.",
    advice: "Don't rush to rebuild exactly what fell. Ask first why it couldn't stand."
  },
  {
    id: 17, name: "The Star", image: "RWS_Tarot_17_Star.jpg", glyph: "star",
    keywords: ["hope", "renewal", "inspiration", "healing"],
    upright: "quiet hope returning after a hard stretch — not naive optimism, but a real sense that things can be mended and are heading somewhere better.",
    reversed: "hope wearing thin, or an upbeat outlook that's drifted loose from any actual plan.",
    advice: "Let yourself hope again. You've earned it, and it's pointing somewhere real."
  },
  {
    id: 18, name: "The Moon", image: "RWS_Tarot_18_Moon.jpg", glyph: "moon",
    keywords: ["uncertainty", "the subconscious", "illusion", "intuition"],
    upright: "a situation lit by something other than plain fact — instinct, imagination, and old fears mixing together, so what you're seeing isn't the whole picture yet.",
    reversed: "confusion beginning to lift, or a fear that turns out to have loomed bigger in imagination than in reality.",
    advice: "Don't force a decision while the picture's still this unclear. Wait for more light."
  },
  {
    id: 19, name: "The Sun", image: "RWS_Tarot_19_Sun.jpg", glyph: "sun",
    keywords: ["joy", "vitality", "clarity", "success"],
    upright: "plain good fortune — clarity, warmth, a result that doesn't need a second guess.",
    reversed: "joy dimmed by overthinking it, or a success that isn't being allowed in and enjoyed for what it is.",
    advice: "Let this be as good as it is. You don't need to go looking for the catch."
  },
  {
    id: 20, name: "Judgement", image: "RWS_Tarot_20_Judgement.jpg", glyph: "judgement",
    keywords: ["reckoning", "awakening", "reflection", "absolution"],
    upright: "an honest reckoning with where you've been, and a call to step into a version of yourself that matches what you've learned.",
    reversed: "self-judgment curdling into harshness, or a wake-up call getting put off a little longer.",
    advice: "Answer the call plainly. Whatever you've been avoiding is ready to be faced now."
  },
  {
    id: 21, name: "The World", image: "RWS_Tarot_21_World.jpg", glyph: "world",
    keywords: ["completion", "wholeness", "arrival"],
    upright: "a cycle closing cleanly, everything it was meant to teach already in hand — a real sense of arrival before the next journey starts.",
    reversed: "a near-completion still missing its last piece, or closure being reached for before it's time.",
    advice: "Acknowledge how far this has come before rushing toward whatever's next."
  }
];

module.exports = majorArcana;
