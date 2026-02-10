const { Router } = require("express");
const { getRules, addRule, deleteRule } = require("../data/rulesStore");

const router = Router();

router.get("/", (req, res) => {
  res.json(getRules());
});

router.post("/", (req, res) => {
  const { name, matchType, pattern, category, action, weight } = req.body;
  if (!name || !pattern || !action) {
    return res.status(400).json({ error: "name, pattern, and action are required" });
  }
  const rule = addRule({ name, matchType, pattern, category, action, weight });
  res.status(201).json(rule);
});

router.delete("/:id", (req, res) => {
  const deleted = deleteRule(parseInt(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Rule not found" });
  res.json({ deleted: deleted.id });
});

module.exports = router;
