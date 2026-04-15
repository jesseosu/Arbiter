const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many moderation actions. Slow down." },
});

const appealLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many appeal submissions. Try again in a minute." },
});

function requestId(req, res, next) {
  req.requestId = uuidv4();
  res.setHeader("X-Request-ID", req.requestId);
  next();
}

module.exports = { actionLimiter, appealLimiter, requestId };
