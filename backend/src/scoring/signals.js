// Individual signal detectors — each returns a score between 0 and 1

function keywordDensity(text, terms) {
  if (!text || terms.length === 0) return 0;
  const tokens = text.toLowerCase().split(/\s+/);
  const hits = tokens.filter((t) => terms.some((term) => t.includes(term)));
  return Math.min(hits.length / Math.max(tokens.length, 1), 1);
}

function allCapsRatio(text) {
  if (!text || text.length < 4) return 0;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 0;
  const caps = letters.replace(/[^A-Z]/g, "");
  return caps.length / letters.length;
}

function linkPresence(text) {
  const urlPattern = /https?:\/\/\S+|www\.\S+|bit\.ly\/\S+|t\.co\/\S+/gi;
  const matches = text.match(urlPattern) || [];
  return Math.min(matches.length * 0.5, 1);
}

function repeatCharacter(text) {
  // Detects stretch-spam like "haaaaaate" or "!!!!!!"
  const stretchPattern = /(.)\1{4,}/g;
  const matches = text.match(stretchPattern) || [];
  return Math.min(matches.length * 0.4, 1);
}

function excessivePunctuation(text) {
  const punct = (text.match(/[!?]{2,}/g) || []).join("");
  return Math.min(punct.length / 10, 1);
}

module.exports = {
  keywordDensity,
  allCapsRatio,
  linkPresence,
  repeatCharacter,
  excessivePunctuation,
};
