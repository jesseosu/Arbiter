import React, { useEffect, useState } from "react";

const BASE_URL = "http://localhost:4000/api";

type Signal = {
  keywordDensity: number;
  allCapsRatio: number;
  linkPresence: number;
  repeatCharacter: number;
  excessivePunctuation: number;
};

type HistoryEntry = {
  at: string;
  by: string;
  action: string;
  ruleName?: string;
};

type ContentItem = {
  id: number;
  text: string;
  status: string;
  risk_score: number;
  category: string;
  signals: Signal;
  explanation: string[];
  actionHistory: HistoryEntry[];
};

type Props = { contentId: number };

const SIGNAL_LABELS: Record<string, string> = {
  keywordDensity:      "Keyword density",
  allCapsRatio:        "ALL CAPS ratio",
  linkPresence:        "Link presence",
  repeatCharacter:     "Repeat characters",
  excessivePunctuation:"Excessive punctuation",
};

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct > 60 ? "#ef4444" : pct > 30 ? "#fb923c" : "#4ade80";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: "#94a3b8", width: 30, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export function ReviewPanel({ contentId }: Props) {
  const [item, setItem]           = useState<ContentItem | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSent, setAppealSent]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setItem(null);
    setAppealSent(false);
    fetch(`${BASE_URL}/content/${contentId}`)
      .then((r) => r.json())
      .then(setItem)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contentId]);

  async function sendAction(action: "approve" | "reject" | "escalate") {
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, action, moderatorId: "human_mod" }),
      });
      if (res.ok) setItem(await res.json());
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAppeal() {
    if (!appealReason.trim()) return;
    await fetch(`${BASE_URL}/appeals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, requester: "creator_user", reason: appealReason }),
    });
    setAppealSent(true);
    setAppealReason("");
  }

  if (loading) return <div style={{ padding: 16, color: "#64748b" }}>Loading…</div>;
  if (!item)   return <div style={{ padding: 16, color: "#64748b" }}>Item not found</div>;

  const riskPct = Math.round(item.risk_score * 100);
  const riskColor = riskPct >= 75 ? "#ef4444" : riskPct >= 40 ? "#fb923c" : "#4ade80";

  return (
    <div style={{ padding: 16, overflowY: "auto", height: "100%" }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Review Item #{item.id}</h2>

      {/* Risk summary */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
        padding: "12px 14px", marginBottom: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>RISK SCORE</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: riskColor }}>{riskPct}%</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, background: "#1e293b", padding: "2px 8px", borderRadius: 4 }}>
            {item.status.replace("_", " ").toUpperCase()}
          </span>
          {item.category !== "NONE" && (
            <span style={{ fontSize: 12, background: "#7c3aed22", color: "#a78bfa", padding: "2px 8px", borderRadius: 4 }}>
              {item.category.replace("_", " ")}
            </span>
          )}
        </div>
        {item.explanation.length > 0 && (
          <p style={{ fontSize: 12, color: "#fb923c", fontStyle: "italic" }}>
            {item.explanation.join(" · ")}
          </p>
        )}
      </div>

      {/* Signal breakdown */}
      {item.signals && Object.keys(item.signals).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Signal Breakdown
          </p>
          {Object.entries(item.signals).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{SIGNAL_LABELS[key] ?? key}</span>
              </div>
              <ScoreBar value={val as number} />
            </div>
          ))}
        </div>
      )}

      {/* Content text */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
        padding: "10px 12px", marginBottom: 14,
      }}>
        <p style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>{item.text}</p>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={{ background: "#15803d", color: "#fff" }} disabled={submitting} onClick={() => sendAction("approve")}>
          ✓ Approve
        </button>
        <button style={{ background: "#b91c1c", color: "#fff" }} disabled={submitting} onClick={() => sendAction("reject")}>
          ✗ Reject
        </button>
        <button style={{ background: "#c2410c", color: "#fff" }} disabled={submitting} onClick={() => sendAction("escalate")}>
          ↑ Escalate
        </button>
      </div>

      {/* Appeal section */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Submit Appeal
        </p>
        {appealSent ? (
          <p style={{ fontSize: 12, color: "#4ade80" }}>Appeal submitted successfully.</p>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Reason for appeal…"
              style={{
                flex: 1, background: "#1e293b", border: "1px solid #334155",
                color: "#f8f9fa", borderRadius: 6, padding: "5px 10px", fontSize: 12,
              }}
            />
            <button style={{ background: "#0ea5e9", color: "#fff", flexShrink: 0 }} onClick={submitAppeal}>
              Appeal
            </button>
          </div>
        )}
      </div>

      {/* Action history */}
      <div>
        <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Audit Trail
        </p>
        {item.actionHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "#475569" }}>No actions yet.</p>
        ) : (
          <ul style={{ listStyle: "none" }}>
            {item.actionHistory.map((h, i) => (
              <li key={i} style={{
                fontSize: 12, color: "#94a3b8", padding: "5px 0",
                borderBottom: "1px solid #1e293b",
              }}>
                <code style={{ color: "#64748b", fontSize: 11 }}>{h.at.replace("T", " ").slice(0, 19)}</code>
                {" — "}<strong style={{ color: "#cbd5e1" }}>{h.by}</strong>
                {" → "}<em style={{ color: "#a78bfa" }}>{h.action}</em>
                {h.ruleName ? <span style={{ color: "#64748b" }}> (rule: {h.ruleName})</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
