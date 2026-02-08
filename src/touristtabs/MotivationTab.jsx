import React from "react";

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
})();
export default function MotivationTab({ S }) {
  return (
    <>
      <div style={S.card}>
        <h2 style={S.h2}>Motivation & Engagement</h2>
        <div style={S.muted}>Streaks, mini-leaderboards, surprise tasks (fake data).</div>
      </div>

      <div style={S.grid3}>
        <div style={S.card}>
          <h2 style={S.h2}>Streaks</h2>
          <div style={{ fontWeight: 900, fontSize: 18 }}>3 days</div>
          <div style={S.muted}>Completed tasks in a row</div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Mini-Leaderboard</h2>
          <div style={S.muted}>You vs group</div>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, fontSize: 13 }}>
            <li>You: 5 tasks</li>
            <li>Aaliyah: 7 tasks</li>
            <li>Jordan: 6 tasks</li>
          </ul>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Surprise Task</h2>
          <div style={{ fontWeight: 900 }}>Try a local snack today</div>
          <div style={S.muted}>Optional + fun</div>
        </div>
      </div>
    </>
  );
}
