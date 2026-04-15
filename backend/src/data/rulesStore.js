const { db } = require("./db");

const stmtGetAll = db.prepare(
  "SELECT * FROM moderation_rules ORDER BY created_at ASC"
);

const stmtInsert = db.prepare(`
  INSERT INTO moderation_rules (name, match_type, pattern, category, action, weight)
  VALUES (@name, @match_type, @pattern, @category, @action, @weight)
`);

const stmtDelete = db.prepare("DELETE FROM moderation_rules WHERE id = ?");

const stmtGetById = db.prepare("SELECT * FROM moderation_rules WHERE id = ?");

const stmtIncrementFired = db.prepare(
  "UPDATE moderation_rules SET fired = fired + 1 WHERE id = ?"
);

function getRules() {
  return stmtGetAll.all();
}

function addRule({ name, matchType, pattern, category, action, weight }) {
  const info = stmtInsert.run({
    name,
    match_type: matchType || "TEXT_CONTAINS",
    pattern,
    category: category || "SPAM",
    action,
    weight: weight ?? 0.5,
  });
  return stmtGetById.get(info.lastInsertRowid);
}

function deleteRule(id) {
  const rule = stmtGetById.get(id);
  if (!rule) return null;
  stmtDelete.run(id);
  return rule;
}

/**
 * Run text through all stored rules.
 * Returns the first matching rule's action, or null if none match.
 */
function applyRules(text, scoredResult) {
  const rules = stmtGetAll.all();
  const lower = text.toLowerCase();

  for (const rule of rules) {
    let matched = false;

    if (rule.match_type === "TEXT_CONTAINS") {
      matched = lower.includes(rule.pattern.toLowerCase());
    } else if (rule.match_type === "REGEX") {
      try {
        matched = new RegExp(rule.pattern, "i").test(text);
      } catch {
        matched = false;
      }
    } else if (rule.match_type === "RISK_SCORE_GTE") {
      matched = scoredResult && scoredResult.score >= parseFloat(rule.pattern);
    }

    if (matched) {
      stmtIncrementFired.run(rule.id);
      return {
        action: rule.action,
        ruleId: rule.id,
        ruleName: rule.name,
      };
    }
  }

  return null;
}

module.exports = { getRules, addRule, deleteRule, applyRules };
