import React, { useMemo } from "react";

export default function ProgressTab({ S, tripProgress, budget, budgetStatus }) {
  // normalize to avoid crashes
  const normalized = useMemo(() => {
    const isObj = budget && typeof budget === "object" && !Array.isArray(budget);
    const total = Number(isObj ? budget.total ?? 0 : budget ?? 0);
    const spent = Number(isObj ? budget.spent ?? 0 : budgetStatus?.spent ?? 0);
    const categories = isObj && Array.isArray(budget.categories) ? budget.categories : [];

    const remaining =
      budgetStatus && budgetStatus.remaining != null
        ? Number(budgetStatus.remaining)
        : Math.max(0, total - spent);

    const pct =
      budgetStatus && budgetStatus.pct != null
        ? Number(budgetStatus.pct)
        : total > 0
        ? Math.min(100, Math.round((spent / total) * 100))
        : 0;

    const underOver =
      budgetStatus && budgetStatus.underOver
        ? String(budgetStatus.underOver)
        : spent <= total
        ? "Under budget"
        : "Over budget";

    return {
      total: Number.isFinite(total) ? total : 0,
      spent: Number.isFinite(spent) ? spent : 0,
      remaining: Number.isFinite(remaining) ? remaining : 0,
      pct: Number.isFinite(pct) ? pct : 0,
      underOver,
      categories,
    };
  }, [budget, budgetStatus]);

  const safeTripProgress = Number.isFinite(Number(tripProgress)) ? Number(tripProgress) : 0;

  return (
    <>
      <div style={S.card}>
        <h2 style={S.h2}>Progress & Analytics</h2>
        <div style={S.muted}>Trip progress, budget progress, milestones (fake data).</div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <h2 style={S.h2}>Trip Progress</h2>
          <div style={{ ...S.muted, marginBottom: 10 }}>{safeTripProgress}% of tasks completed</div>
          <div style={{ height: 12, borderRadius: 999, background: "#f1f5f9", overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <div style={{ width: `${safeTripProgress}%`, height: "100%", background: "#bfdbfe" }} />
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Smart Budget Tracker</h2>
          <div style={S.row}>
            <span style={S.pill}>Spent: ${normalized.spent}</span>
            <span style={S.pill}>Total: ${normalized.total}</span>
            <span style={S.pill}>{normalized.underOver}</span>
            <span style={S.pill}>Remaining: ${normalized.remaining}</span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ height: 12, borderRadius: 999, background: "#f1f5f9", overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <div style={{ width: `${normalized.pct}%`, height: "100%", background: "#bbf7d0" }} />
            </div>

            <div style={{ marginTop: 10, fontSize: 13 }}>
              Categories:
              {normalized.categories.length > 0 ? (
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 18 }}>
                  {normalized.categories.map((c) => (
                    <li key={c.name}>
                      {c.name}: ${c.amount}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ ...S.muted, marginTop: 6 }}>No category breakdown available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
