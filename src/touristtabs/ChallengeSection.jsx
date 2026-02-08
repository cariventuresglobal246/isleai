import React from "react";

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
})();
export default function ChallengeSection({
  S,
  title,
  items,
  onAction,
  showCount = true,
}) {
  const btnBase =
    S.btn ||
    ({
      padding: "8px 10px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
    });

  const btnPrimary =
    S.btnPrimary ||
    ({
      ...btnBase,
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
      color: "#1d4ed8",
      fontWeight: 900,
    });

  const miniBtn = (kind) => {
    // keep the look consistent with your dashboard styles
    if (kind === "join") return btnPrimary;
    return btnBase;
  };

  return (
    <div style={S.card}>
      <div style={S.row}>
        <h2 style={{ ...S.h2, margin: 0 }}>{title}</h2>
        {showCount && <span style={S.pill}>{items.length} items</span>}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {items.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 12,
              background: "#ffffff",
            }}
          >
            <div style={S.row}>
              <div style={{ fontWeight: 900 }}>{c.title}</div>
              <span style={S.pill}>{c.type}</span>
              <span style={S.pill}>{c.audience}</span>
              <span style={S.pill}>{c.region}</span>
            </div>

            <div style={{ marginTop: 8, fontSize: 13 }}>{c.description}</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={S.pill}>Points: {c.points}</span>
              <span style={S.pill}>Reward: {c.reward}</span>
              {c.creator && <span style={S.pill}>Creator: {c.creator}</span>}
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={miniBtn("details")}
                onClick={() => onAction && onAction("details", c)}
              >
                Details
              </button>

              <button
                type="button"
                style={miniBtn("join")}
                onClick={() => onAction && onAction("join", c)}
              >
                Join
              </button>

              <button
                type="button"
                style={miniBtn("prize")}
                onClick={() => onAction && onAction("prize", c)}
              >
                Prize
              </button>

              <button
                type="button"
                style={miniBtn("leaderboard")}
                onClick={() => onAction && onAction("leaderboard", c)}
              >
                Leaderboard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
