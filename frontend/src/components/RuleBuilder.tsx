import React, { useEffect, useState } from "react";

const BASE_URL = "http://localhost:4000/api";

type Rule = {
  id: number;
  name: string;
  match_type: string;
  pattern: string;
  category: string;
  action: string;
  weight: number;
  fired: number;
};

const defaultDraft = {
  name: "",
  matchType: "TEXT_CONTAINS",
  pattern: "",
  category: "SPAM",
  action: "reject",
  weight: 0.5,
};

export function RuleBuilder() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [draft, setDraft] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/rules`)
      .then((r) => r.json())
      .then(setRules)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setDraft((d) => ({ ...d, [e.target.name]: e.target.value }));
  }

  async function handleCreate() {
    if (!draft.name || !draft.pattern) return;
    const res = await fetch(`${BASE_URL}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      const rule = await res.json();
      setRules((r) => [...r, rule]);
      setDraft(defaultDraft);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`${BASE_URL}/rules/${id}`, { method: "DELETE" });
    if (res.ok) setRules((r) => r.filter((rule) => rule.id !== id));
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%", background: "#1e293b", border: "1px solid #334155",
    color: "#f8f9fa", borderRadius: 6, padding: "5px 8px", fontSize: 12, marginBottom: 6,
  };

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Rule Builder</h2>

      <div style={{ marginBottom: 16 }}>
        <input name="name"    style={fieldStyle} placeholder="Rule name" value={draft.name}    onChange={handleChange} />
        <input name="pattern" style={fieldStyle} placeholder="Pattern / value" value={draft.pattern} onChange={handleChange} />
        <select name="matchType" style={fieldStyle} value={draft.matchType} onChange={handleChange}>
          <option value="TEXT_CONTAINS">Text contains</option>
          <option value="REGEX">Regex</option>
          <option value="RISK_SCORE_GTE">Risk score ≥ (value 0–1)</option>
        </select>
        <select name="category" style={fieldStyle} value={draft.category} onChange={handleChange}>
          <option value="HATE_SPEECH">Hate Speech</option>
          <option value="VIOLENCE">Violence</option>
          <option value="SPAM">Spam</option>
          <option value="ADULT_CONTENT">Adult Content</option>
          <option value="MISINFORMATION">Misinformation</option>
        </select>
        <select name="action" style={fieldStyle} value={draft.action} onChange={handleChange}>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="escalate">Escalate</option>
        </select>
        <button style={{ background: "#6366f1", color: "#fff", width: "100%" }} onClick={handleCreate}>
          + Add Rule
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>Loading rules…</p>
      ) : rules.length === 0 ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>No rules yet. Add one above.</p>
      ) : (
        <ul style={{ listStyle: "none" }}>
          {rules.map((rule) => (
            <li key={rule.id} style={{
              background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8,
              padding: "8px 10px", marginBottom: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{rule.name}</p>
                  <p style={{ fontSize: 11, color: "#64748b" }}>
                    {rule.match_type} · <code>{rule.pattern}</code>
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    → {rule.action} · fired <strong style={{ color: "#a78bfa" }}>{rule.fired}×</strong>
                  </p>
                </div>
                <button
                  style={{ background: "#7f1d1d", color: "#fca5a5", padding: "3px 8px", fontSize: 11, marginLeft: 8, flexShrink: 0 }}
                  onClick={() => handleDelete(rule.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
