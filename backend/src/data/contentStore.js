const { db } = require("./db");
const { scoreContent, getAutoAction } = require("../scoring/riskScorer");
const { generateComment } = require("../utils/contentGenerator");
const { applyRules } = require("./rulesStore");

const MAX_ITEMS = 500;
const LOCK_TTL_MS = 60_000;

// ─── Queries (prepared once for performance) ─────────────────────────────────

const stmtInsert = db.prepare(`
  INSERT INTO content_items (text, status, risk_score, category, signals, explanation)
  VALUES (@text, @status, @risk_score, @category, @signals, @explanation)
`);

const stmtGetAll = db.prepare(`
  SELECT * FROM content_items ORDER BY created_at DESC LIMIT 200
`);

const stmtGetById = db.prepare(`
  SELECT * FROM content_items WHERE id = ?
`);

const stmtGetActions = db.prepare(`
  SELECT * FROM moderation_actions WHERE content_id = ? ORDER BY at ASC
`);

const stmtUpdateStatus = db.prepare(`
  UPDATE content_items SET status = ?, locked_by = NULL, locked_at = NULL WHERE id = ?
`);

const stmtInsertAction = db.prepare(`
  INSERT INTO moderation_actions (content_id, actor, action, rule_id, rule_name, request_id)
  VALUES (@content_id, @actor, @action, @rule_id, @rule_name, @request_id)
`);

const stmtCount = db.prepare(`SELECT COUNT(*) as n FROM content_items`);

const stmtDeleteOldest = db.prepare(`
  DELETE FROM content_items WHERE id IN (
    SELECT id FROM content_items ORDER BY created_at ASC LIMIT ?
  )
`);

const stmtClaimLock = db.prepare(`
  UPDATE content_items
  SET locked_by = ?, locked_at = ?
  WHERE id = ? AND (locked_by IS NULL OR locked_at < ?)
`);

// ─── Public API ───────────────────────────────────────────────────────────────

let hub = null;

function setHub(h) {
  hub = h;
}

function addItem(text) {
  const scored = scoreContent(text);
  const ruleResult = applyRules(text, scored);

  let status = getAutoAction(scored.score);
  let ruleId = null;
  let ruleName = null;

  // Rule override takes precedence over scorer threshold
  if (ruleResult) {
    status = ruleResult.action === "approve"
      ? "auto_approved"
      : ruleResult.action === "reject"
      ? "auto_rejected"
      : "escalated";
    ruleId = ruleResult.ruleId;
    ruleName = ruleResult.ruleName;
  }

  const info = stmtInsert.run({
    text,
    status,
    risk_score: scored.score,
    category: scored.category,
    signals: JSON.stringify(scored.signals),
    explanation: JSON.stringify(scored.explanation),
  });

  const item = getById(info.lastInsertRowid);

  if (status !== "pending") {
    stmtInsertAction.run({
      content_id: item.id,
      actor: ruleName ? "rule_engine" : "risk_scorer",
      action: status,
      rule_id: ruleId,
      rule_name: ruleName,
      request_id: null,
    });
  }

  trimIfNeeded();

  hub?.emit("content:new", enrichItem(item));
  return item;
}

function getAll(statusFilter) {
  let items;
  if (statusFilter) {
    items = db.prepare(
      "SELECT * FROM content_items WHERE status = ? ORDER BY created_at DESC LIMIT 200"
    ).all(statusFilter);
  } else {
    items = stmtGetAll.all();
  }
  return items.map(enrichItem);
}

function getById(id) {
  const item = stmtGetById.get(id);
  if (!item) return null;
  return enrichItem(item);
}

function updateStatus(contentId, status, actor, requestId, ruleId, ruleName) {
  const existing = stmtGetById.get(contentId);
  if (!existing) return null;

  stmtUpdateStatus.run(status, contentId);
  stmtInsertAction.run({
    content_id: contentId,
    actor,
    action: status,
    rule_id: ruleId ?? null,
    rule_name: ruleName ?? null,
    request_id: requestId ?? null,
  });

  const updated = getById(contentId);
  hub?.emit("content:updated", updated);
  return updated;
}

function claimItem(contentId, moderatorId) {
  const now = Date.now();
  const expiry = now - LOCK_TTL_MS;
  const result = stmtClaimLock.run(moderatorId, now, contentId, expiry);
  return result.changes > 0;
}

function enrichItem(raw) {
  const actions = stmtGetActions.all(raw.id);
  return {
    ...raw,
    signals: safeJson(raw.signals, {}),
    explanation: safeJson(raw.explanation, []),
    actionHistory: actions.map((a) => ({
      at: new Date(a.at).toISOString(),
      by: a.actor,
      action: a.action,
      ruleId: a.rule_id,
      ruleName: a.rule_name,
    })),
  };
}

function trimIfNeeded() {
  const { n } = stmtCount.get();
  if (n > MAX_ITEMS) {
    stmtDeleteOldest.run(n - MAX_ITEMS);
  }
}

function safeJson(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ─── Content ingestion loop ───────────────────────────────────────────────────

let generatorInterval = null;

function startGenerator() {
  // Seed with initial items
  for (let i = 0; i < 30; i++) {
    addItem(generateComment());
  }

  generatorInterval = setInterval(() => {
    addItem(generateComment());
    hub?.emit("queue:changed", getQueueDepth());
  }, 1200);
}

function stopGenerator() {
  if (generatorInterval) clearInterval(generatorInterval);
}

function getQueueDepth() {
  return db.prepare(
    "SELECT COUNT(*) as n FROM content_items WHERE status = 'pending'"
  ).get().n;
}

module.exports = {
  addItem,
  getAll,
  getById,
  updateStatus,
  claimItem,
  getQueueDepth,
  startGenerator,
  stopGenerator,
  setHub,
};
