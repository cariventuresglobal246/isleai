import React from "react";

export default function AutomationTab({ S, onAddNotification }) {
  return (
    <>
      <div style={S.card}>
        <h2 style={S.h2}>Automation</h2>
        <div style={S.muted}>Smart suggestions + location-triggered tasks (fake data / placeholders).</div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Smart Task Suggestions</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>If rain soon → suggest indoor museum + add task</li>
            <li>If low budget remaining → suggest free beaches + viewpoints</li>
            <li>If time left &gt; 5 days → suggest “North Coast day trip”</li>
          </ul>
          <div style={{ marginTop: 10 }}>
            <button style={S.btn} onClick={onAddNotification}>
              Simulate Suggestion
            </button>
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Location-Triggered Tasks</h2>
          <div style={S.muted}>Example triggers (placeholder):</div>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, fontSize: 13 }}>
            <li>Arrived near Museum → Task: Visit + Check In</li>
            <li>Near craft market → Task: Shopping hunt item</li>
            <li>Near beach at sunset → Smart notification</li>
          </ul>
        </div>
      </div>
    </>
  );
}
