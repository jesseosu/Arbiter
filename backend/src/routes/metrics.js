const { Router } = require("express");
const { db } = require("../data/db");

const router = Router();
const START_TIME = Date.now();

router.get("/", (req, res) => {
  const oneHourAgo = Date.now() - 3_600_000;

  const queueDepth = db.prepare(
    "SELECT COUNT(*) as n FROM content_items WHERE status = 'pending'"
  ).get().n;

  const decisions = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'auto_approved'  THEN 1 ELSE 0 END) as auto_approved,
      SUM(CASE WHEN status = 'auto_rejected'  THEN 1 ELSE 0 END) as auto_rejected,
      SUM(CASE WHEN status = 'approved'        THEN 1 ELSE 0 END) as human_approved,
      SUM(CASE WHEN status = 'rejected'        THEN 1 ELSE 0 END) as human_rejected,
      SUM(CASE WHEN status = 'escalated'       THEN 1 ELSE 0 END) as escalated,
      COUNT(*) as total
    FROM content_items
  `).get();

  const throughputItems = db.prepare(
    "SELECT COUNT(*) as n FROM content_items WHERE created_at > ?"
  ).get(oneHourAgo).n;

  const throughputActions = db.prepare(
    "SELECT COUNT(*) as n FROM moderation_actions WHERE at > ?"
  ).get(oneHourAgo).n;

  const rules = db.prepare(
    "SELECT id, name, match_type, action, fired FROM moderation_rules ORDER BY fired DESC"
  ).all();

  const avgQueueAge = db.prepare(`
    SELECT AVG(? - created_at) as avg_age_ms
    FROM content_items WHERE status = 'pending'
  `).get(Date.now()).avg_age_ms;

  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM content_items
    GROUP BY category
    ORDER BY count DESC
  `).all();

  res.json({
    queue: {
      depth: queueDepth,
      avgAgeMs: Math.round(avgQueueAge || 0),
    },
    decisions: {
      autoApproved: decisions.auto_approved,
      autoRejected: decisions.auto_rejected,
      humanApproved: decisions.human_approved,
      humanRejected: decisions.human_rejected,
      escalated: decisions.escalated,
      total: decisions.total,
    },
    throughput: {
      itemsLastHour: throughputItems,
      actionsLastHour: throughputActions,
    },
    rules,
    categoryBreakdown,
    uptimeMs: Date.now() - START_TIME,
  });
});

module.exports = router;
