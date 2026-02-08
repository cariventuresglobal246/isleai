import React from "react";

export default function TasksTab({ S, tasks, kanbanColumns, moveTask }) {
  return (
    <div style={S.kanban}>
      {kanbanColumns.map((col) => (
        <div key={col} style={S.col}>
          <h3>{col}</h3>
          {tasks
            .filter((t) => t.column === col)
            .map((t) => (
              <div key={t.id} style={S.task}>
                <strong>{t.title}</strong>
                <div style={S.mini}>{t.priority}</div>

                <select
                  value={t.column}
                  onChange={(e) => moveTask(t.id, e.target.value)}
                  style={S.select}
                >
                  {kanbanColumns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
