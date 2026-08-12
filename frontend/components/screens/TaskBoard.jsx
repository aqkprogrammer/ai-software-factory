"use client";

import { C, TASK_COLUMNS } from "../../lib/theme";
import { byId } from "../../lib/roster";

const PRIORITY = {
  critical: "#EF4444", high: "#F97316", medium: "#EAB308", low: C.faint,
};

export default function TaskBoard({ tasks, onSelectAgent }) {
  const list = Object.values(tasks);

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Task board</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {list.length ? `${list.length} tasks in this run` : "No tasks yet"}
        </div>
        {!list.length && (
          <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 520, lineHeight: 1.6 }}>
            The planner writes this board. Start a run — or a demo run — and the
            columns fill as the coder picks tasks up.
          </p>
        )}
      </div>

      <div className="vo-board">
        {TASK_COLUMNS.map((col) => {
          const items = list.filter((t) => (t.status || "backlog") === col.id);
          return (
            <div key={col.id} className="vo-board-col">
              <div className="vo-board-head">
                <span style={{ width: 7, height: 7, borderRadius: 7, background: col.c }} />
                <span style={{ fontSize: 12 }}>{col.label}</span>
                <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint, marginLeft: "auto" }}>
                  {items.length}
                </span>
              </div>

              {items.map((t) => {
                const owner = byId[t.assignedAgentId];
                return (
                  <button key={t.id} className="vo-task"
                    onClick={() => owner && onSelectAgent(t.assignedAgentId)}>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 3,
                        background: PRIORITY[t.priority] ?? C.faint, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, lineHeight: 1.4, textAlign: "left" }}>
                        {t.title || t.id}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                      <span className="vo-mono" style={{ fontSize: 10, color: C.faint }}>
                        {owner?.name ?? "unassigned"}
                      </span>
                      <span className="vo-mono" style={{ fontSize: 10, color: C.faint, marginLeft: "auto" }}>
                        {t.progress ?? 0}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: C.raise, borderRadius: 3, marginTop: 6 }}>
                      <div style={{ width: `${t.progress ?? 0}%`, height: "100%", borderRadius: 3,
                        background: col.c, transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
                    </div>
                  </button>
                );
              })}

              {items.length === 0 && <div className="vo-board-empty">—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
