import React, { useState } from "react";
import { ContentFeed }      from "./components/ContentFeed";
import { ReviewPanel }      from "./components/ReviewPanel";
import { RuleBuilder }      from "./components/RuleBuilder";
import { MetricsDashboard } from "./components/MetricsDashboard";

export default function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const col: React.CSSProperties = {
    padding: "16px 14px",
    overflowY: "auto",
    borderRight: "1px solid #1e293b",
    height: "100vh",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left — live feed */}
      <div style={{ ...col, flex: 2, minWidth: 0 }}>
        <ContentFeed onSelectId={setSelectedId} />
      </div>

      {/* Centre — review panel */}
      <div style={{ ...col, flex: 2, minWidth: 0 }}>
        {selectedId != null ? (
          <ReviewPanel contentId={selectedId} />
        ) : (
          <div style={{ padding: 16, color: "#475569", marginTop: 40, textAlign: "center" }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Select an item to review</p>
            <p style={{ fontSize: 12 }}>Click any item in the feed to open it here.</p>
          </div>
        )}
      </div>

      {/* Right — rules + metrics */}
      <div style={{ ...col, flex: 1.5, minWidth: 260, borderRight: "none", display: "flex", flexDirection: "column", gap: 24 }}>
        <RuleBuilder />
        <MetricsDashboard />
      </div>
    </div>
  );
}
