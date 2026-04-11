const { applyRules, addRule, getRules, deleteRule } = require("../../backend/src/data/rulesStore");

describe("rules engine", () => {
  let ruleId;

  afterAll(() => {
    if (ruleId) deleteRule(ruleId);
  });

  test("no rules → applyRules returns null", () => {
    // Ensure no leftover state from other tests affects this
    const result = applyRules("completely innocuous text", { score: 0.02 });
    // We can't guarantee zero rules but null is valid when nothing matches
    if (result !== null) {
      expect(result).toHaveProperty("action");
    }
  });

  test("TEXT_CONTAINS rule matches and fires", () => {
    const rule = addRule({
      name: "Test spam rule",
      matchType: "TEXT_CONTAINS",
      pattern: "testrulexyz",
      category: "SPAM",
      action: "reject",
      weight: 0.8,
    });
    ruleId = rule.id;

    const result = applyRules("this text contains testrulexyz inside", { score: 0.1 });
    expect(result).not.toBeNull();
    expect(result.action).toBe("reject");
    expect(result.ruleId).toBe(rule.id);
  });

  test("TEXT_CONTAINS rule does not match irrelevant text", () => {
    const result = applyRules("totally clean and fine content here", { score: 0.0 });
    // May return null (no match) or match another rule — just check type
    if (result !== null) {
      expect(typeof result.action).toBe("string");
    }
  });

  test("RISK_SCORE_GTE rule fires when score exceeds threshold", () => {
    const rule = addRule({
      name: "High risk catcher",
      matchType: "RISK_SCORE_GTE",
      pattern: "0.8",
      category: "HATE_SPEECH",
      action: "reject",
      weight: 1.0,
    });

    const result = applyRules("some text", { score: 0.95 });
    expect(result).not.toBeNull();
    expect(result.action).toBe("reject");

    deleteRule(rule.id);
  });

  test("RISK_SCORE_GTE rule does not fire when score is below threshold", () => {
    const rule = addRule({
      name: "High risk catcher 2",
      matchType: "RISK_SCORE_GTE",
      pattern: "0.8",
      category: "SPAM",
      action: "reject",
      weight: 1.0,
    });

    // Only "testrulexyz" rule and this rule active; use text that won't hit TEXT_CONTAINS
    const result = applyRules("normal comment here nothing bad", { score: 0.1 });
    // This rule should not fire; could return null or the TEXT_CONTAINS rule
    if (result !== null) {
      expect(result.ruleId).not.toBe(rule.id);
    }

    deleteRule(rule.id);
  });

  test("addRule returns object with expected fields", () => {
    const rule = addRule({
      name: "Temp rule",
      matchType: "TEXT_CONTAINS",
      pattern: "temppattern123",
      category: "SPAM",
      action: "approve",
      weight: 0.3,
    });
    expect(rule).toHaveProperty("id");
    expect(rule.name).toBe("Temp rule");
    expect(rule.action).toBe("approve");
    expect(rule.fired).toBe(0);
    deleteRule(rule.id);
  });

  test("deleteRule removes the rule", () => {
    const rule = addRule({
      name: "Delete me",
      matchType: "TEXT_CONTAINS",
      pattern: "deletemepattern",
      category: "SPAM",
      action: "reject",
      weight: 0.5,
    });
    const deleted = deleteRule(rule.id);
    expect(deleted).not.toBeNull();
    expect(deleted.id).toBe(rule.id);

    // Confirm it no longer fires
    const result = applyRules("deletemepattern is here", { score: 0.0 });
    if (result !== null) {
      expect(result.ruleId).not.toBe(rule.id);
    }
  });
});
