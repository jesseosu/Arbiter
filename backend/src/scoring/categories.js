// Violation categories aligned with TikTok Community Guidelines
const CATEGORIES = {
  HATE_SPEECH: {
    label: "Hate Speech",
    terms: [
      "hate", "slur", "racist", "bigot", "sexist", "homophob", "transphob",
      "nazi", "kkk", "supremacist", "inferior", "subhuman", "degenerate",
    ],
    weight: 0.9,
  },
  VIOLENCE: {
    label: "Violence / Threats",
    terms: [
      "kill", "murder", "shoot", "stab", "bomb", "attack", "threaten",
      "hurt", "harm", "destroy", "beat", "assault", "weapon",
      "kill yourself", "kys", "end yourself", "i will hurt",
      "die slowly", "you should die",
    ],
    weight: 0.85,
  },
  SPAM: {
    label: "Spam / Scam",
    terms: [
      "follow back", "f4f", "sub4sub", "click here", "free money",
      "win prize", "dm me", "only fans", "onlyfans", "crypto", "nft",
      "get rich", "make money fast", "limited offer",
    ],
    weight: 0.6,
  },
  ADULT_CONTENT: {
    label: "Adult Content",
    terms: [
      "nude", "naked", "explicit", "nsfw", "porn", "sex tape", "onlyfans",
      "xxx", "18+", "adult content",
    ],
    weight: 0.8,
  },
  MISINFORMATION: {
    label: "Misinformation",
    terms: [
      "fake news", "hoax", "conspiracy", "they're hiding", "the truth is",
      "mainstream media lies", "government lie", "5g", "microchip",
      "crisis actor", "false flag",
    ],
    weight: 0.65,
  },
  NONE: {
    label: "No Violation",
    terms: [],
    weight: 0,
  },
};

// Thresholds for automated decisions
const THRESHOLDS = {
  AUTO_REJECT: 0.60,
  AUTO_APPROVE: 0.12,
};

module.exports = { CATEGORIES, THRESHOLDS };
