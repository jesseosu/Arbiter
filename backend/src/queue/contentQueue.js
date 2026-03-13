const { db } = require("../data/db");

const LOCK_TTL_MS = 60_000;

/**
 * Return pending items sorted by priority score.
 * Priority = risk_score * 0.7 + age_weight * 0.3
 * Age weight grows over time so stale items surface even if low-risk.
 */
function getPriorityQueue(limit = 50) {
  const now = Date.now();
  const items = db.prepare(`
    SELECT * FROM content_items
    WHERE status = 'pending'
    AND (locked_by IS NULL OR locked_at < ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(now - LOCK_TTL_MS, limit * 3);

  const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
  const scored = items.map((item) => {
    const ageMs = now - item.created_at;
    const ageWeight = Math.min(ageMs / MAX_AGE_MS, 1);
    const priority = item.risk_score * 0.7 + ageWeight * 0.3;
    return { ...item, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit);
}

module.exports = { getPriorityQueue };
