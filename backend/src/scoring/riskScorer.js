const { CATEGORIES, THRESHOLDS } = require("./categories");
const {
  allCapsRatio,
  linkPresence,
  repeatCharacter,
  excessivePunctuation,
} = require("./signals");

/**
 * Count how many category terms appear in the text.
 */
function countHits(text, terms) {
  const lower = text.toLowerCase();
  return terms.reduce((n, term) => n + (lower.includes(term) ? 1 : 0), 0);
}

/**
 * Convert hit count + category weight into a 0–1 signal.
 * Formula: min((hits * weight) / 2, 1)
 * This means 2 high-severity terms (weight=0.9) → score 0.9 (auto-reject).
 */
function categorySignal(hits, weight) {
  return Math.min((hits * weight) / 2, 1);
}

/**
 * Score a piece of text across all violation categories.
 * Returns a result object with composite score, dominant category,
 * per-signal breakdown, and human-readable explanation.
 */
function scoreContent(text) {
  let topCategory = "NONE";
  let topSignal = 0;

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (key === "NONE") continue;
    const hits = countHits(text, cat.terms);
    if (hits > 0) {
      const sig = categorySignal(hits, cat.weight);
      if (sig > topSignal) {
        topSignal = sig;
        topCategory = key;
      }
    }
  }

  const signals = {
    keywordDensity:       topSignal,
    allCapsRatio:         allCapsRatio(text),
    linkPresence:         linkPresence(text),
    repeatCharacter:      repeatCharacter(text),
    excessivePunctuation: excessivePunctuation(text),
  };

  // Keyword/category signal dominates; other signals boost borderline cases
  const composite =
    signals.keywordDensity       * 0.84 +
    signals.allCapsRatio         * 0.06 +
    signals.linkPresence         * 0.06 +
    signals.repeatCharacter      * 0.02 +
    signals.excessivePunctuation * 0.02;

  const score = Math.min(Math.round(composite * 100) / 100, 1);

  const explanation = buildExplanation(signals, topCategory);

  return { score, category: topCategory, signals, explanation };
}

function buildExplanation(signals, category) {
  const notes = [];
  if (signals.keywordDensity > 0.3) notes.push(`${category.toLowerCase().replace("_", " ")} terms detected`);
  if (signals.allCapsRatio > 0.5) notes.push("excessive caps");
  if (signals.linkPresence > 0) notes.push("contains links");
  if (signals.repeatCharacter > 0) notes.push("stretch-spam characters");
  if (signals.excessivePunctuation > 0.3) notes.push("excessive punctuation");
  return notes;
}

function getAutoAction(score) {
  if (score >= THRESHOLDS.AUTO_REJECT) return "auto_rejected";
  if (score <= THRESHOLDS.AUTO_APPROVE) return "auto_approved";
  return "pending";
}

module.exports = { scoreContent, getAutoAction, THRESHOLDS };
