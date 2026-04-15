const { EventEmitter } = require("events");

class Hub extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;

    this.on("content:new",     (data) => io.emit("content:new", data));
    this.on("content:updated", (data) => io.emit("content:updated", data));
    this.on("queue:changed",   (data) => io.emit("queue:changed", data));
    this.on("metrics:tick",    (data) => io.emit("metrics:tick", data));
  }
}

function createHub(io) {
  return new Hub(io);
}

module.exports = { createHub };
