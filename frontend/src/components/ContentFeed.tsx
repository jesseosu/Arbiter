import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:4000/api";
const SOCKET_URL = "http://localhost:4000";

type ContentItem = {
  id: number;
  text: string;
  status: string;
  risk_score: number;
  category: string;
};

type Props = { onSelectId: (id: number) => void };

const STATUS_COLOR: Record<string, string> = {
  pending:       "#facc15",
  auto_approved: "#4ade80",
  approved:      "#22d3ee",
  auto_rejected: "#f87171",
  rejected:      "#ef4444",
  escalated:     "#fb923c",
};

const STATUS_LABELS: Record<string, string> = {
  pending:       "Pending",
  auto_approved: "Auto ✓",
  approved:      "Approved",
  auto_rejected: "Auto ✗",
  rejected:      "Rejected",
  escalated:     "Escalated",
};

export function ContentFeed({ onSelectId }: Props) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Load initial items
  useEffect(() => {
    fetch(`${BASE_URL}/content`)
      .then((r) => r.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  // Subscribe to real-time updates via WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("content:new", (item: ContentItem) => {
      setItems((prev) => [item, ...prev].slice(0, 200));
    });

    socket.on("content:updated", (updated: ContentItem) => {
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? (updated as ContentItem) : it))
      );
    });

    return () => { socket.disconnect(); };
  }, []);

  const filtered = filter === "all"
    ? items
    : items.filter((it) => it.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <h2 style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Live Feed</h2>
        <span
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#4ade80" : "#6b7280",
            flexShrink: 0,
          }}
          title={connected ? "WebSocket connected" : "Disconnected"}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: "#1e293b", color: "#f8f9fa", border: "1px solid #334155",
            borderRadius: 6, padding: "3px 8px", fontSize: 12,
          }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="auto_approved">Auto-approved</option>
          <option value="auto_rejected">Auto-rejected</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectId(item.id)}
            style={{
              padding: "10px 12px",
              marginBottom: 6,
              borderRadius: 8,
              background: "#0f172a",
              border: "1px solid #1e293b",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 4, background: STATUS_COLOR[item.status] + "33",
                  color: STATUS_COLOR[item.status],
                  flexShrink: 0,
                }}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              {item.category !== "NONE" && (
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {item.category.replace("_", " ")}
                </span>
              )}
              <span style={{ fontSize: 11, marginLeft: "auto", color: "#64748b" }}>
                risk {(item.risk_score * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
