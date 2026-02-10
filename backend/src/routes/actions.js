const { Router } = require("express");
const { updateStatus, claimItem } = require("../data/contentStore");
const { actionLimiter } = require("../middleware/rateLimiter");

const router = Router();

const VALID_ACTIONS = new Set(["approve", "reject", "escalate"]);

const ACTION_STATUS = {
  approve: "approved",
  reject: "rejected",
  escalate: "escalated",
};

router.post("/", actionLimiter, (req, res) => {
  const { contentId, action, moderatorId = "human_mod" } = req.body;

  if (!contentId || !action) {
    return res.status(400).json({ error: "contentId and action are required" });
  }

  if (!VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: "action must be approve, reject, or escalate" });
  }

  const status = ACTION_STATUS[action];
  const updated = updateStatus(
    contentId,
    status,
    moderatorId,
    req.requestId,
    null,
    null
  );

  if (!updated) return res.status(404).json({ error: "Content not found" });
  res.json(updated);
});

// Claim an item for exclusive review (prevents duplicate human review)
router.post("/claim/:id", (req, res) => {
  const { moderatorId } = req.body;
  if (!moderatorId) return res.status(400).json({ error: "moderatorId required" });

  const claimed = claimItem(parseInt(req.params.id), moderatorId);
  if (!claimed) {
    return res.status(409).json({ error: "Item already claimed by another moderator" });
  }
  res.json({ claimed: true });
});

module.exports = router;
