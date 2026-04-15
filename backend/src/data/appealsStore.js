const { db } = require("./db");

const stmtInsert = db.prepare(`
  INSERT INTO appeals (content_id, requester, reason)
  VALUES (@content_id, @requester, @reason)
`);

const stmtGetById = db.prepare("SELECT * FROM appeals WHERE id = ?");

const stmtGetAll = db.prepare(`
  SELECT a.*, c.text as content_text, c.status as content_status, c.risk_score
  FROM appeals a
  JOIN content_items c ON c.id = a.content_id
  ORDER BY a.created_at DESC
`);

const stmtGetByStatus = db.prepare(`
  SELECT a.*, c.text as content_text, c.status as content_status, c.risk_score
  FROM appeals a
  JOIN content_items c ON c.id = a.content_id
  WHERE a.status = ?
  ORDER BY a.created_at DESC
`);

const stmtDecide = db.prepare(`
  UPDATE appeals
  SET status = ?, reviewed_by = ?, reviewed_at = ?
  WHERE id = ?
`);

function createAppeal({ contentId, requester, reason }) {
  const info = stmtInsert.run({ content_id: contentId, requester, reason });
  return stmtGetById.get(info.lastInsertRowid);
}

function getAppeals(statusFilter) {
  return statusFilter ? stmtGetByStatus.all(statusFilter) : stmtGetAll.all();
}

function getAppealById(id) {
  return stmtGetById.get(id);
}

function decideAppeal(id, { action, reviewedBy }) {
  const appeal = stmtGetById.get(id);
  if (!appeal) return null;

  const newStatus = action === "overturn" ? "overturned" : "upheld";
  stmtDecide.run(newStatus, reviewedBy, Date.now(), id);

  return stmtGetById.get(id);
}

module.exports = { createAppeal, getAppeals, getAppealById, decideAppeal };
