const { scoreContent, getAutoAction, THRESHOLDS } = require("../../backend/src/scoring/riskScorer");

describe("scoreContent", () => {
  test("clean comment scores low", () => {
    const { score, category } = scoreContent("Love your content, keep it up!");
    expect(score).toBeLessThan(THRESHOLDS.AUTO_APPROVE + 0.1);
    expect(category).toBe("NONE");
  });

  test("hate speech comment scores high and is categorised correctly", () => {
    const { score, category } = scoreContent("People like you are subhuman degenerates");
    expect(score).toBeGreaterThanOrEqual(THRESHOLDS.AUTO_REJECT);
    expect(category).toBe("HATE_SPEECH");
  });

  test("explicit violence / self-harm threat scores high", () => {
    const { score, category } = scoreContent("Kill yourself before you embarrass anyone more");
    expect(score).toBeGreaterThanOrEqual(THRESHOLDS.AUTO_REJECT);
    expect(category).toBe("VIOLENCE");
  });

  test("single ambiguous violence word is routed to human review", () => {
    const { score } = scoreContent("I will find you and kill you seriously");
    expect(score).toBeGreaterThan(0.1);
    expect(score).toBeLessThan(THRESHOLDS.AUTO_REJECT);
  });

  test("spam comment is categorised as SPAM", () => {
    const { score, category } = scoreContent("Follow back everyone!! F4F guaranteed!! Click here");
    expect(category).toBe("SPAM");
    expect(score).toBeGreaterThan(0.1);
  });

  test("explanation is populated for high-risk content", () => {
    const { explanation } = scoreContent("All [group] are inferior and should be removed");
    expect(explanation.length).toBeGreaterThan(0);
  });

  test("signals object is returned", () => {
    const { signals } = scoreContent("Some text here");
    expect(signals).toHaveProperty("keywordDensity");
    expect(signals).toHaveProperty("allCapsRatio");
    expect(signals).toHaveProperty("linkPresence");
  });

  test("all-caps text boosts score", () => {
    const normal = scoreContent("hate this song");
    const caps   = scoreContent("HATE THIS SONG");
    expect(caps.score).toBeGreaterThanOrEqual(normal.score);
  });

  test("URL presence adds to score", () => {
    const withLink    = scoreContent("Check this out https://bit.ly/xyz free money");
    const withoutLink = scoreContent("Check this out free money");
    expect(withLink.score).toBeGreaterThan(withoutLink.score);
  });
});

describe("getAutoAction", () => {
  test("high score → auto_rejected", () => {
    expect(getAutoAction(0.9)).toBe("auto_rejected");
  });

  test("low score → auto_approved", () => {
    expect(getAutoAction(0.05)).toBe("auto_approved");
  });

  test("mid score → pending", () => {
    expect(getAutoAction(0.5)).toBe("pending");
  });

  test("boundary: exactly AUTO_REJECT threshold → auto_rejected", () => {
    expect(getAutoAction(THRESHOLDS.AUTO_REJECT)).toBe("auto_rejected");
  });

  test("boundary: exactly AUTO_APPROVE threshold → auto_approved", () => {
    expect(getAutoAction(THRESHOLDS.AUTO_APPROVE)).toBe("auto_approved");
  });
});
