"use client";

import { Circle, AlertTriangle } from "lucide-react";

import { C, STATUS, BUSY, compact } from "../../lib/theme";
import { STAFF } from "../../lib/roster";
import ActivityFeed from "../ActivityFeed";

function Metric({ label, value, sub, accent = C.ink }) {
  return (
    <div className="vo-card" style={{ padding: "14px 16px" }}>
      <div className="vo-eyebrow">{label}</div>
      <div className="vo-mono" style={{ fontSize: 26, marginTop: 6, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Bar({ value, color = C.accent, height = 6 }) {
  return (
    <div style={{ height, background: C.raise, borderRadius: height, overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color,
        borderRadius: height, transition: "width 700ms cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

export default function CommandCenter({ agents, feed, tasks, metrics, onSelectAgent, onRoute }) {
  const taskList = Object.values(tasks);
  const errors = feed.filter((e) => e.cat === "error").slice(0, 6);

  return (
    <div className="vo-screen">
      <div className="vo-metrics">
        <Metric label="Agents working" value={metrics.busy} accent="#22C55E"
          sub={`${metrics.offline} desks not provisioned`} />
        <Metric label="Tasks" value={metrics.tasksTotal ? `${metrics.tasksDone}/${metrics.tasksTotal}` : "—"}
          sub={`${metrics.tasksRunning} running now`} />
        <Metric label="Tests" value={metrics.tests.total ? `${metrics.tests.passed}/${metrics.tests.total}` : "—"}
          accent={metrics.tests.total && metrics.tests.passed === metrics.tests.total ? "#22C55E" : C.ink}
          sub="across every desk this run" />
        <Metric label="Tool calls" value={compact(metrics.toolCalls)}
          sub={`${metrics.filesChanged} files changed`} />
        <Metric label="Tokens" value={compact(metrics.tokens)}
          sub={`≈ $${metrics.cost.toFixed(2)} this run`} />
        <Metric label="Needs you" value={metrics.pendingApprovals + metrics.needsAttention}
          accent={(metrics.pendingApprovals + metrics.needsAttention) ? "#F97316" : C.ink}
          sub={`${metrics.pendingApprovals} approvals, ${metrics.needsAttention} blocked`} />
      </div>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">Delivery</div>
          <div className="vo-h" style={{ fontSize: 16, margin: "3px 0 14px" }}>Where the work stands</div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>AI CRM Platform</span>
            <span className="vo-mono" style={{ fontSize: 11, color: C.dim, marginLeft: "auto" }}>
              {metrics.progress}%
            </span>
          </div>
          <Bar value={metrics.progress} />

          <div style={{ marginTop: 18 }}>
            <div className="vo-eyebrow" style={{ marginBottom: 8 }}>Tasks in flight</div>
            {taskList.filter((t) => ["running", "review"].includes(t.status)).slice(0, 6).map((t) => (
              <div key={t.id} style={{ padding: "7px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap" }}>{t.title || t.id}</span>
                  <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ marginTop: 6 }}><Bar value={t.progress ?? 0} height={4}
                  color={t.status === "review" ? "#A855F7" : "#22C55E"} /></div>
              </div>
            ))}
            {taskList.length === 0 && (
              <div style={{ fontSize: 12.5, color: C.faint }}>
                No tasks yet. Start a run and the planner fills this in.
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="vo-eyebrow" style={{ marginBottom: 8, color: "#EF4444" }}>
                <AlertTriangle size={11} style={{ verticalAlign: -1 }} /> Recent failures
              </div>
              <ActivityFeed events={errors} onSelectAgent={onSelectAgent} maxHeight={150} dense />
            </div>
          )}
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">The team</div>
          <div className="vo-h" style={{ fontSize: 16, margin: "3px 0 14px" }}>Who is doing what</div>

          {STAFF.map((p) => {
            const a = agents[p.id] ?? { status: "offline" };
            const s = STATUS[a.status] ?? STATUS.offline;
            const busy = BUSY.includes(a.status);
            return (
              <button key={p.id} className="vo-row" onClick={() => onSelectAgent(p.id)}>
                <Circle size={8} fill={s.c} strokeWidth={0} className={busy ? "vo-pulse" : ""} />
                <span style={{ width: 68, flexShrink: 0, fontSize: 12.5 }}>{p.name}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: busy ? C.dim : C.faint,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.status === "offline" ? "not provisioned" : a.activity}
                </span>
                <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint, width: 34, textAlign: "right" }}>
                  {a.status === "offline" ? "—" : `${Math.round(a.progress ?? 0)}%`}
                </span>
              </button>
            );
          })}

          <button className="vo-btn" style={{ marginTop: 14 }} onClick={() => onRoute("office")}>
            Open the floor
          </button>
        </section>
      </div>
    </div>
  );
}
