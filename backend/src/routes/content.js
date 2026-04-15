const { Router } = require("express");
const { getAll, getById } = require("../data/contentStore");
const { getPriorityQueue } = require("../queue/contentQueue");

const router = Router();

router.get("/", (req, res) => {
  const items = getAll(req.query.status);
  res.json(items);
});

router.get("/queue", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(getPriorityQueue(limit));
});

router.get("/:id", (req, res) => {
  const item = getById(parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

module.exports = router;
