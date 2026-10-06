// Minor Arcana knowledge base — 56 cards.
//
// NOTE: This file was rewritten twice. First, to fix a content bug where all
// 56 readings were generated from 14 shared "rank templates" that only swapped
// in the suit's domain name — which produced wrong readings whenever a rank's
// traditional meaning actually flips between suits (most visibly Eight of
// Swords, traditionally entrapment / victim mentality, was showing the
// "rapid movement" meaning that belongs to Eight of Wands). Second, to reduce
// repetitive phrasing across the 56 hand-written entries — a handful of
// crutch words ("actually", "genuine", "finally") and a repeated "a X that Y"
// sentence shape had crept in across many cards from writing them in one
// pass. Meanings are unchanged; only wording was varied.
//
// IMPORTANT FOR WHOEVER MERGES THIS: the old file (pre-bugfix) exported
// `ranks` with functions like `ranks.eight.upright(suit)` that generated text
// on the fly. Those functions are gone — content now lives directly on each
// card object. grep the rest of the codebase for `.upright(` / `.reversed(`
// calls against `ranks` before deploying this, in case anything outside this
// file called the old generator functions directly instead of reading from
// minorArcana.

const suits = {
  wands: {
    name: "Wands",
    element: "fire",
    domain: "ambition, energy, and the work you're driven to do",
    tone: "urgent and active",
    keywordsUp: ["drive", "momentum", "passion", "initiative"],
    keywordsRev: ["burnout", "impatience", "scattered effort"]
  },
  cups: {
    name: "Cups",
    element: "water",
    domain: "emotion, relationships, and what you carry inside",
    tone: "felt more than reasoned",
    keywordsUp: ["feeling", "connection", "empathy", "receptivity"],
    keywordsRev: ["withdrawal", "moodiness", "emotional overwhelm"]
  },
  swords: {
    name: "Swords",
    element: "air",
    domain: "thought, communication, and conflict",
    tone: "sharp and clarifying",
    keywordsUp: ["clarity", "truth", "decisiveness", "logic"],
    keywordsRev: ["overthinking", "harsh words", "conflict avoidance"]
  },
  pentacles: {
    name: "Pentacles",
    element: "earth",
    domain: "money, work, health, and the practical ground beneath you",
    tone: "slow and material",
    keywordsUp: ["stability", "resourcefulness", "diligence"],
    keywordsRev: ["stagnation", "overwork", "insecurity"]
  }
};

const suitOrder = ["wands", "cups", "swords", "pentacles"];
const rankOrder = ["ace","two","three","four","five","six","seven","eight","nine","ten","page","knight","queen","king"];
const rankNames = {
  ace: "Ace", two: "Two", three: "Three", four: "Four", five: "Five",
  six: "Six", seven: "Seven", eight: "Eight", nine: "Nine", ten: "Ten",
  page: "Page", knight: "Knight", queen: "Queen", king: "King"
};

// File-name prefixes used by the public-domain 1909 Rider-Waite-Smith deck
// images on Wikimedia Commons (e.g. "Wands01.jpg" .. "Wands14.jpg").
const imagePrefix = { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pents" };

const cardContent = {
  wands: {
    ace: {
      keywords: ["inspiration", "new venture", "creative spark"],
      upright: "a burst of creative energy arriving all at once — an idea, offer, or venture that hasn't been shaped yet but is already pulling you toward it.",
      reversed: "inspiration that keeps stalling before it becomes action, or excitement for a new venture that's cooling off before it even starts.",
      advice: "Act on the spark now, while it's still hot. Waiting for the perfect plan will only let it fade."
    },
    two: {
      keywords: ["planning", "future vision", "personal power"],
      upright: "standing at a comfortable vantage point with real options ahead, weighing what you've already built against where you could take it next.",
      reversed: "playing it too safe out of fear of the unknown, or a plan for the future that never gets put to the test.",
      advice: "Stop admiring the view from where you're standing. Pick a direction and start walking toward it."
    },
    three: {
      keywords: ["expansion", "foresight", "awaiting results"],
      upright: "the wait after the work is done — ships already sent out, results not yet in, but the groundwork solid enough to trust.",
      reversed: "delays piling up on a plan that looked sure to work, or a widened view that's revealing obstacles you hadn't planned for.",
      advice: "Keep your eyes on the horizon a little longer. What you set in motion is still on its way."
    },
    four: {
      keywords: ["celebration", "homecoming", "milestone"],
      upright: "a milestone worth stopping for — a homecoming, a celebration, a sense of having earned this particular moment of ease.",
      reversed: "a celebration that feels hollow, or a sense of home and belonging that hasn't quite been reached yet.",
      advice: "Let yourself enjoy this fully. Not every good moment needs to be immediately followed by the next task."
    },
    five: {
      keywords: ["competition", "friction", "disagreement"],
      upright: "competing wills clashing in the open — noisy, maybe exhausting, but honest, and better than the same tension left to simmer underground.",
      reversed: "conflict losing steam at last, or a rivalry that turns out to have been more posturing than substance.",
      advice: "Don't mistake this friction for failure. Competing ideas sharpen each other when no one's afraid to disagree out loud."
    },
    six: {
      keywords: ["victory", "recognition", "confidence"],
      upright: "a win that others can see too — recognition arriving publicly for effort that was, until now, mostly invisible.",
      reversed: "pride curdling into arrogance, or a victory that never got the recognition it deserved.",
      advice: "Accept the recognition without over-explaining it away. You earned the win; let it stand."
    },
    seven: {
      keywords: ["defensiveness", "perseverance", "standing ground"],
      upright: "holding a position everyone else is now trying to take from you — tiring, but proof that what you built is worth defending.",
      reversed: "giving up ground you didn't need to, or defending a position so long you've lost sight of why it mattered.",
      advice: "Hold your ground, but check that you're still fighting for the right hill."
    },
    eight: {
      keywords: ["momentum", "swift action", "rapid movement"],
      upright: "everything suddenly moving at once — messages landing, plans accelerating, a stretch of rapid motion after a long wait.",
      reversed: "momentum stalling right when it mattered most, or things moving so fast that nothing has time to land.",
      advice: "Move quickly while the path is clear, but don't outrun your own ability to respond to what comes next."
    },
    nine: {
      keywords: ["resilience", "last stand", "guarded persistence"],
      upright: "one more effort asked of you after a long series of them — tired, wary, but still standing, and closer to the end than it feels.",
      reversed: "defensiveness that's hardened into isolation, or exhaustion that's making every remaining challenge feel bigger than it is.",
      advice: "You've survived every round so far. Don't let guardedness stop you from accepting help with this last one."
    },
    ten: {
      keywords: ["burden", "overload", "hard-won completion"],
      upright: "carrying more than your share because you're close enough to the finish line that putting it down now feels wasteful.",
      reversed: "a burden kept out of stubbornness, or work set down at last after being carried for far too long.",
      advice: "Ask what you're carrying that was never yours to finish. Some of this weight can be shared or dropped."
    },
    page: {
      keywords: ["exploration", "new idea", "enthusiasm"],
      upright: "an idea too exciting to sit still with — restless curiosity that wants to test itself against the world immediately.",
      reversed: "excitement with no follow-through, or plans announced loudly and then quietly abandoned.",
      advice: "Let the enthusiasm move you, but give the idea at least one real test before chasing the next one."
    },
    knight: {
      keywords: ["adventure", "impulsiveness", "bold pursuit"],
      upright: "charging toward the next thing with total confidence, driven more by appetite for the chase than by a fixed plan.",
      reversed: "recklessness that's starting to cost you, or restless energy with nowhere productive left to go.",
      advice: "Bring some of that boldness under control before it runs you, instead of you running it."
    },
    queen: {
      keywords: ["confidence", "independence", "magnetism"],
      upright: "a warm, unshakeable self-assurance that draws people in without needing to perform for them.",
      reversed: "confidence that's turned brittle or demanding, or independence used to shut others out rather than stand on your own.",
      advice: "Lead with the confidence you already have. You don't need to prove it to anyone else first."
    },
    king: {
      keywords: ["vision", "leadership", "bold entrepreneurship"],
      upright: "leadership that inspires by example — a bold vision paired with the follow-through to make it real.",
      reversed: "high expectations that have become impossible to meet, or ambition pursued so ruthlessly it burns the people helping you.",
      advice: "Lead the vision, but check that the people carrying it out with you still want to be there."
    }
  },
  cups: {
    ace: {
      keywords: ["new love", "emotional opening", "overflow"],
      upright: "an emotional cup filling past its rim — new love, new compassion, or a feeling so full it has to spill into something.",
      reversed: "an emotional opening that's being held back, or love and connection offered but not yet let in.",
      advice: "Let this feeling be as full as it is. There's no need to ration something this real."
    },
    two: {
      keywords: ["partnership", "mutual attraction", "union"],
      upright: "two people meeting each other as equals — a bond forming, or deepening, on mutual and roughly even terms.",
      reversed: "a connection that's grown lopsided, or a partnership under a strain that hasn't been named out loud yet.",
      advice: "Check that this connection is still as mutual as it started out. Say plainly what's shifted, if anything has."
    },
    three: {
      keywords: ["friendship", "celebration", "community"],
      upright: "joy that's better shared — a gathering, a friendship, a moment worth celebrating with the people who've stood by you.",
      reversed: "a group dynamic curdling into gossip or exclusion, or overindulgence dulling what should have been a real celebration.",
      advice: "Bring the people who matter most into this moment. Celebration means more when it isn't done alone."
    },
    four: {
      keywords: ["apathy", "contemplation", "missed offer"],
      upright: "boredom with what's already on the table, even though something worth noticing is being offered right in front of you.",
      reversed: "apathy loosening its grip at last, or a willingness to look up and weigh the opportunity you'd been ignoring.",
      advice: "Look up from what's disappointing you and notice what's being offered. It may be worth more than it first seemed."
    },
    five: {
      keywords: ["loss", "grief", "regret"],
      upright: "grief centered on what's spilled and gone, even while something intact is still standing close by, unnoticed.",
      reversed: "grief starting to loosen its grip, or the first real steps toward accepting a loss rather than replaying it.",
      advice: "Mourn what's truly gone, but turn around long enough to see what's still standing behind you."
    },
    six: {
      keywords: ["nostalgia", "memory", "innocence"],
      upright: "a pull back toward simpler times — old memories, familiar comforts, or a reunion with someone from an earlier chapter.",
      reversed: "nostalgia that's become a hiding place, or an idealized past that's making the present look worse than it is.",
      advice: "Visit the past for comfort, but don't move back in. What you need now lives in the present."
    },
    seven: {
      keywords: ["fantasy", "choices", "illusion"],
      upright: "too many appealing options, some more solid than others, making it hard to tell real opportunity from wishful thinking.",
      reversed: "the fog clearing enough to see which options were ever real, and a decision becoming possible at last.",
      advice: "Test each option against reality before choosing. Not everything glittering here will hold up."
    },
    eight: {
      keywords: ["walking away", "seeking deeper meaning", "departure"],
      upright: "walking away from something that looks fine from the outside because it's stopped feeding you on the inside.",
      reversed: "staying somewhere out of fear of what leaving would mean, or drifting without ever fully committing to the departure.",
      advice: "Trust the part of you that knows this isn't enough anymore, even if you can't fully explain why yet."
    },
    nine: {
      keywords: ["contentment", "satisfaction", "wish fulfilled"],
      upright: "an easy, comfortable satisfaction — a wish met, a want fulfilled, contentment that doesn't need to be justified.",
      reversed: "smugness standing in for real satisfaction, or abundance that somehow still doesn't feel like enough.",
      advice: "Let this contentment be simple. You don't need to earn it twice by worrying it won't last."
    },
    ten: {
      keywords: ["emotional fulfillment", "family harmony", "lasting happiness"],
      upright: "a deep, settled happiness built with the people closest to you — not a peak moment, but a lasting state.",
      reversed: "harmony at home that's more appearance than substance, or values among the people you love that have quietly stopped aligning.",
      advice: "Look past the surface picture of happiness and check that the people in it feel it too."
    },
    page: {
      keywords: ["creative opportunity", "intuitive message", "curiosity"],
      upright: "a gentle, unexpected emotional or creative message arriving — something worth paying attention to, even if it seems small.",
      reversed: "emotional immaturity getting in the way of a real opportunity, or a creative impulse used to escape rather than express.",
      advice: "Take the small, unexpected feeling seriously. It's more informative than it looks."
    },
    knight: {
      keywords: ["romance", "idealism", "following the heart"],
      upright: "leading with the heart, chasing a romantic or idealistic vision with real sincerity, even if it isn't fully practical yet.",
      reversed: "moodiness dressed up as sensitivity, or a romantic ideal that keeps setting you up for disappointment.",
      advice: "Follow your heart here, but check it against reality before you follow it all the way."
    },
    queen: {
      keywords: ["compassion", "emotional security", "intuition"],
      upright: "emotional depth held with real stability — compassion for others that doesn't come at the cost of your own footing.",
      reversed: "compassion that's tipped into self-neglect, or emotional security that only holds up as long as no one tests it.",
      advice: "Give others your compassion, but keep enough of it in reserve for yourself."
    },
    king: {
      keywords: ["emotional balance", "diplomacy", "calm control"],
      upright: "a calm mastery over strong feeling — able to stay steady and fair even when the emotional stakes are high.",
      reversed: "control over feeling that's really suppression, or calm on the surface hiding manipulation underneath.",
      advice: "Stay steady, but let what you really feel be known rather than only managed."
    }
  },
  swords: {
    ace: {
      keywords: ["breakthrough", "clarity", "new idea"],
      upright: "a sudden cut through confusion — a realization, decision, or piece of truth arriving sharp and unmistakably clear.",
      reversed: "clarity that's been clouded by too much noise, or a truth that's been twisted before it reached you.",
      advice: "Trust the clear thought when it comes. Don't let it get talked back into confusion."
    },
    two: {
      keywords: ["stalemate", "difficult decision", "avoidance"],
      upright: "a decision held at arm's length, guarded and balanced so carefully that neither option ever gets chosen.",
      reversed: "the standoff breaking at last, or an overload of conflicting information making the choice harder rather than easier.",
      advice: "Take the blindfold off. The decision won't get easier by delaying it further."
    },
    three: {
      keywords: ["heartbreak", "betrayal", "sorrow"],
      upright: "a pain that's sharp and specific — a truth, betrayal, or loss that cuts precisely because it's real.",
      reversed: "the first stages of healing, or old pain resurfacing because it was never fully dealt with the first time.",
      advice: "Let the pain be exactly as sharp as it is. Naming it clearly is what starts the healing."
    },
    four: {
      keywords: ["rest", "recovery", "contemplation"],
      upright: "a deliberate retreat after conflict or strain — not defeat, but the recovery a mind needs before it can think clearly again.",
      reversed: "rest interrupted before it's finished, or restlessness that's making real recovery impossible.",
      advice: "Take the rest fully. Half a recovery just means carrying the exhaustion into whatever comes next."
    },
    five: {
      keywords: ["hollow victory", "conflict", "betrayal"],
      upright: "a win that costs more than it's worth — a conflict pushed to the end even though everyone involved leaves worse off.",
      reversed: "resentment lingering after a conflict that was never really resolved, or a chance to make peace instead of pressing the advantage.",
      advice: "Ask whether winning this particular fight is worth what it will cost you afterward."
    },
    six: {
      keywords: ["transition", "moving on", "calmer waters"],
      upright: "a slow, deliberate move away from turbulence, carrying only what's necessary toward something steadier.",
      reversed: "resisting a transition that's already necessary, or unresolved baggage being carried into the calmer waters ahead.",
      advice: "Let the difficult waters be behind you. Don't keep looking back at the shore you're leaving."
    },
    seven: {
      keywords: ["strategy", "deception", "acting alone"],
      upright: "moving quietly and independently, taking what you need without asking permission — clever, but not fully honest.",
      reversed: "a hidden strategy coming to light, or a guilty conscience catching up at last to a shortcut that was taken.",
      advice: "Ask whether the strategy you're running would still make sense if everyone involved could see it."
    },
    eight: {
      keywords: ["entrapment", "victim mentality", "self-imposed limits"],
      upright: "feeling boxed in on every side, even though the ropes holding you are looser than they feel — a prison built more from belief than from fact.",
      reversed: "the first real crack in that self-imposed trap, as the story of being powerless starts to loosen its grip.",
      advice: "Look for the gap in the ropes you've been assuming were solid. There's more room to move than it feels like."
    },
    nine: {
      keywords: ["anxiety", "worry", "mental anguish"],
      upright: "a mind running worst-case scenarios in the dark, exhausted by fears that loom far larger at 3am than in daylight.",
      reversed: "worry starting to ease, or a decision to speak the fear aloud at last instead of carrying it alone.",
      advice: "Say the worry out loud to someone. It rarely survives contact with daylight as intact as it feels right now."
    },
    ten: {
      keywords: ["rock bottom", "painful ending", "betrayal"],
      upright: "an ending that's as final as it is painful — the worst of it already behind you, with nowhere to go from here but up.",
      reversed: "resisting an ending that's already happened, or a slow, partial recovery from something that hasn't fully healed yet.",
      advice: "Let this ending be complete. Fighting to keep it half-alive only prolongs the pain of it."
    },
    page: {
      keywords: ["curiosity", "vigilance", "thirst for truth"],
      upright: "an alert, questioning mind, gathering information and watching closely before deciding what to believe.",
      reversed: "gossip standing in for real investigation, or ideas that never move past talk into actual action.",
      advice: "Keep asking questions, but eventually act on what the answers tell you."
    },
    knight: {
      keywords: ["decisive action", "assertiveness", "fast thinking"],
      upright: "moving fast and speaking plainly, cutting straight to the point without waiting for anyone's permission.",
      reversed: "aggression outrunning judgment, or impulsive decisions made faster than the situation required.",
      advice: "Act decisively, but take one breath before you speak the sharpest version of what you're thinking."
    },
    queen: {
      keywords: ["independent thinking", "clear boundaries", "direct communication"],
      upright: "seeing situations plainly and saying so without softening it more than the truth requires.",
      reversed: "directness that's tipped into coldness, or boundaries held so rigidly that no one can get close.",
      advice: "Keep the clarity, but check whether the bluntness is necessary or just easier than being gentle."
    },
    king: {
      keywords: ["intellectual authority", "structured thinking", "impartial truth"],
      upright: "judgment made on principle and evidence rather than feeling — fair, precise, and hard to argue with.",
      reversed: "logic used as a weapon, or authority that's technically correct while still being cruel.",
      advice: "Be right, but don't let being right excuse being unkind about it."
    }
  },
  pentacles: {
    ace: {
      keywords: ["new opportunity", "prosperity", "manifestation"],
      upright: "a concrete opportunity landing in your hands — practical, real, and worth building on rather than just admiring.",
      reversed: "an opportunity missed through poor timing or poor planning, or a promising start that never got followed through.",
      advice: "Take the practical step now. This kind of opportunity rewards follow-through more than enthusiasm."
    },
    two: {
      keywords: ["balance", "adaptability", "juggling priorities"],
      upright: "keeping several demands moving at once, adjusting on the fly rather than dropping any of them.",
      reversed: "one too many priorities added to the mix, with something now slipping that shouldn't have.",
      advice: "Look honestly at what you're juggling. Something here may need to be set down, not balanced harder."
    },
    three: {
      keywords: ["collaboration", "skill", "teamwork"],
      upright: "different skills combining into something none of them could build alone — solid progress made through real collaboration.",
      reversed: "working in isolation on something that needed other hands, or a team that's stopped pulling in the same direction.",
      advice: "Bring in the help this requires. This isn't a project built well alone."
    },
    four: {
      keywords: ["security", "control", "holding tight"],
      upright: "a tight grip on what you've built, prioritizing security over risk, even at the cost of some flexibility.",
      reversed: "holding on so tightly that nothing new can get in, or fear of loss driving decisions more than any real threat.",
      advice: "Loosen the grip slightly. What you're protecting isn't as fragile as it feels."
    },
    five: {
      keywords: ["hardship", "financial loss", "isolation"],
      upright: "real hardship, felt as much in isolation as in the loss itself — struggling while feeling like help is out of reach.",
      reversed: "the first signs of support becoming available, or hardship starting to ease at last after a hard stretch.",
      advice: "Look for the door that's open nearby. Help exists here, even if it doesn't feel like it yet."
    },
    six: {
      keywords: ["generosity", "giving and receiving", "balance"],
      upright: "resources moving fairly between people — help given because it's needed, and received without shame.",
      reversed: "generosity that comes with strings attached, or an exchange that's quietly become one-sided.",
      advice: "Check whether what's being given here is free, or whether something's owed in return."
    },
    seven: {
      keywords: ["patience", "long view", "assessing progress"],
      upright: "a pause to take stock of effort already invested, weighing whether it's paying off or needs to change course.",
      reversed: "impatience with a return that hasn't come yet, or effort continuing on a path that's stopped paying off.",
      advice: "Take the honest audit. Some of this effort deserves more patience; some of it deserves a new plan."
    },
    eight: {
      keywords: ["diligence", "craftsmanship", "skill-building"],
      upright: "steady, repeated effort aimed at getting truly good at something — unglamorous, but exactly what mastery requires.",
      reversed: "perfectionism stalling real progress, or shortcuts being taken on work that deserved the full effort.",
      advice: "Keep doing the unglamorous repetitions. This is what skill looks like while it's being built."
    },
    nine: {
      keywords: ["self-sufficiency", "abundance", "independence"],
      upright: "comfort and abundance earned largely on your own — a self-sufficiency that doesn't need anyone's approval.",
      reversed: "success that looks good from the outside while feeling hollow, or overwork that's crowded out anyone to enjoy it with.",
      advice: "Enjoy what you've built without needing anyone else to confirm it counts."
    },
    ten: {
      keywords: ["legacy", "long-term security", "family wealth"],
      upright: "stability that outlasts any one person — a legacy or foundation built to support more than just yourself.",
      reversed: "a legacy under strain, or family disagreements over resources threatening something built to last.",
      advice: "Protect what's meant to outlast you, but don't let disputes over it undo what it was built for."
    },
    page: {
      keywords: ["new opportunity", "study", "practical curiosity"],
      upright: "a practical opportunity worth studying closely — new, promising, and still in the stage of learning how it works.",
      reversed: "unrealistic plans that haven't been tested against reality, or progress that's stalled before it really started.",
      advice: "Study this opportunity closely before committing further. It's promising, but still unproven."
    },
    knight: {
      keywords: ["diligence", "routine", "methodical progress"],
      upright: "slow, methodical, reliable progress — no shortcuts, just consistent work that adds up over time.",
      reversed: "routine that's calcified into stagnation, or perfectionism so rigid it's stopped anything from shipping.",
      advice: "Trust the slow method that's working. It doesn't need to be faster to be effective."
    },
    queen: {
      keywords: ["nurturing", "resourcefulness", "groundedness"],
      upright: "practical care that shows up in tangible ways — comfort, resources, and groundedness offered generously to others.",
      reversed: "care for others coming at the cost of care for yourself, or insecurity about resources undermining that generosity.",
      advice: "Extend the same practical care to yourself that you so easily offer everyone else."
    },
    king: {
      keywords: ["material mastery", "financial security", "generosity"],
      upright: "material and financial mastery built over time, now generous enough to share the security it's created.",
      reversed: "control over resources turning rigid or possessive, or financial security pursued at the cost of everything else.",
      advice: "Use what you've built generously. Security that isn't shared eventually just becomes isolation."
    }
  }
};

// Build the full 56-card list, ids continuing after the 22 majors (22..77).
const minorArcana = [];
let id = 22;
for (const suitKey of suitOrder) {
  rankOrder.forEach((rankKey, rankIndex) => {
    const suit = suits[suitKey];
    const content = cardContent[suitKey][rankKey];
    const rankNumber = String(rankIndex + 1).padStart(2, "0"); // Ace=01 .. King=14
    minorArcana.push({
      id: id++,
      name: `${rankNames[rankKey]} of ${suit.name}`,
      suitKey, rankKey,
      glyph: suitKey,
      image: `${imagePrefix[suitKey]}${rankNumber}.jpg`,
      keywords: content.keywords,
      upright: content.upright,
      reversed: content.reversed,
      advice: content.advice
    });
  });
}

module.exports = { minorArcana, suits, cardContent };
