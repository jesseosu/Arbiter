import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const BASE_URL   = "http://localhost:4000/api";
const SOCKET_URL = "http://localhost:4000";

type Metrics = {
  queue: { depth: number; avgAgeMs: number };
  decisions: {
    autoApproved: number; autoRejected: number;
    humanApproved: number; humanRejected: number;
    escalated: number; total: number;
  };
  throughput: { itemsLastHour: number; actionsLastHour: number };
  rules: { id: number; name: string; action: string; fired: number }[];
  categoryBreakdown: { category: string; count: number }[];
  uptimeMs: number;
};

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
      padding: "10px 12px", textAlign: "center",
    }}>
      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: color ?? "#f8f9fa" }}>{value}</p>
    </div>
  );
}

function formatUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  function fetchMetrics() {
    fetch(`${BASE_URL}/metrics`)
      .then((r) => r.json())
      .then(setMetrics)
      .catch(console.error);
  }

  useEffect(() => {
    fetchMetrics();
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("metrics:tick", () => fetchMetrics());
    return () => { socket.disconnect(); };
  }, []);

  if (!metrics) return <div style={{ padding: 16, color: "#64748b" }}>Loading metrics…</div>;

  const { decisions } = metrics;
  const autoTotal = decisions.autoApproved + decisions.autoRejected;
  const humanTotal = decisions.humanApproved + decisions.humanRejected;
  const automationRate = decisions.total > 0
    ? Math.round((autoTotal / decisions.total) * 100)
    : 0;

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>System Metrics</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <Stat label="Queue Depth"     value={metrics.queue.depth} color="#facc15" />
        <Stat label="Automation Rate" value={`${automationRate}%`} color="#a78bfa" />
        <Stat label="Items / hr"      value={metrics.throughput.itemsLastHour} />
        <Stat label="Uptime"          value={formatUptime(metrics.uptimeMs)} color="#4ade80" />
      </div>

      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Decision Breakdown
      </p>
      <div style={{ marginBottom: 14 }}>
        {[
          { label: "Auto-approved",  value: decisions.autoApproved,  color: "#4ade80" },
          { label: "Auto-rejected",  value: decisions.autoRejected,  color: "#f87171" },
          { label: "Human-approved", value: decisions.humanApproved, color: "#22d3ee" },
          { label: "Human-rejected", value: decisions.humanRejected, color: "#ef4444" },
          { label: "Escalated",      value: decisions.escalated,     color: "#fb923c" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: "#94a3b8" }}>{label}</span>
            <strong style={{ color }}>{value}</strong>
          </div>
        ))}
      </div>

      {metrics.categoryBreakdown.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Categories Detected
          </p>
          <div style={{ marginBottom: 14 }}>
            {metrics.categoryBreakdown.map(({ category, count }) => (
              <div key={category} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: "#94a3b8" }}>{category.replace("_", " ")}</span>
                <strong style={{ color: "#a78bfa" }}>{count}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      {metrics.rules.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Rule Effectiveness
          </p>
          {metrics.rules.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.name}
              </span>
              <strong style={{ color: "#a78bfa", flexShrink: 0, marginLeft: 8 }}>{r.fired}×</strong>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
