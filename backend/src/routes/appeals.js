const { Router } = require("express");
const { createAppeal, getAppeals, getAppealById, decideAppeal } = require("../data/appealsStore");
const { updateStatus } = require("../data/contentStore");
const { appealLimiter } = require("../middleware/rateLimiter");

const router = Router();

router.get("/", (req, res) => {
  res.json(getAppeals(req.query.status));
});

router.get("/:id", (req, res) => {
  const appeal = getAppealById(parseInt(req.params.id));
  if (!appeal) return res.status(404).json({ error: "Appeal not found" });
  res.json(appeal);
});

router.post("/", appealLimiter, (req, res) => {
  const { contentId, requester, reason } = req.body;
  if (!contentId || !requester || !reason) {
    return res.status(400).json({ error: "contentId, requester, and reason are required" });
  }
  const appeal = createAppeal({ contentId, requester, reason });
  res.status(201).json(appeal);
});

router.post("/:id/decision", (req, res) => {
  const { action, reviewedBy } = req.body;
  if (!action || !reviewedBy) {
    return res.status(400).json({ error: "action and reviewedBy are required" });
  }
  if (action !== "overturn" && action !== "uphold") {
    return res.status(400).json({ error: "action must be overturn or uphold" });
  }

  const appeal = decideAppeal(parseInt(req.params.id), { action, reviewedBy });
  if (!appeal) return res.status(404).json({ error: "Appeal not found" });

  // If overturned, reverse the content decision
  if (action === "overturn") {
    updateStatus(appeal.content_id, "approved", reviewedBy, req.requestId, null, "appeal_overturn");
  }

  res.json(appeal);
});

module.exports = router;
