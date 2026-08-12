"use client";

import { Circle, FileCode2, Terminal as TerminalIcon, Pause, Square, Crosshair } from "lucide-react";

import { C, STATUS, compact } from "../lib/theme";
import { byId, CHECKLIST, DEFAULT_CHECKLIST, IDLE_TASK } from "../lib/roster";

export default function AgentPanel({ id, state, tasks, zoom, onToggleZoom }) {
  const person = byId[id];
  const st = state ?? { status: "offline", terminal: [] };
  const s = STATUS[st.status] ?? STATUS.offline;
  const checklist = CHECKLIST[id] || DEFAULT_CHECKLIST;

  // Prefer the task the backend actually assigned; fall back to the role's
  // standing job so an idle desk still reads as a person with a remit.
  const assigned = Object.values(tasks || {}).find(
    (t) => t.id === st.currentTaskId || (t.assignedAgentId === id && t.status === "running"));
  const headline = assigned?.title || IDLE_TASK[id] || "Idle";
  const mins = Math.floor((st.activeSeconds || 0) / 60);

  return (
    <section className="vo-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div className="vo-h" style={{ fontSize: 17 }}>{person?.name ?? id}</div>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{person?.role}</div>
        </div>
        <span className="vo-chip" style={{ color: s.c, borderColor: `${s.c}55` }}>
          <Circle size={7} fill={s.c} strokeWidth={0} />{s.label}
        </span>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="vo-eyebrow">Current task</div>
        <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.45 }}>{headline}</div>
        <div className="vo-mono" style={{ fontSize: 11.5, color: s.c, marginTop: 7, display: "flex", gap: 6 }}>
          <span style={{ flexShrink: 0 }}>&rsaquo;</span>{st.activity ?? "—"}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: C.raise, borderRadius: 5 }}>
          <div style={{ width: `${st.progress ?? 0}%`, height: "100%", background: s.c, borderRadius: 5,
            transition: "width 600ms cubic-bezier(.22,1,.36,1)" }} />
        </div>
        <span className="vo-mono" style={{ fontSize: 11, color: C.dim }}>{Math.round(st.progress ?? 0)}%</span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="vo-eyebrow" style={{ marginBottom: 8 }}>Steps</div>
        {checklist.map((item, i) => {
          const state_ = i < (st.checklistIndex ?? 0) ? "done"
            : i === (st.checklistIndex ?? 0) ? "active" : "pending";
          return (
            <div key={item} style={{ display: "flex", gap: 9, alignItems: "center", padding: "3.5px 0",
              fontSize: 12.5, color: state_ === "pending" ? C.faint : state_ === "active" ? C.ink : C.dim }}>
              <span style={{ width: 13, textAlign: "center",
                color: state_ === "done" ? "#22C55E" : state_ === "active" ? s.c : C.faint }}>
                {state_ === "done" ? "✓" : state_ === "active" ? "●" : "○"}
              </span>
              <span>{item}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          ["Files changed", st.filesChanged ?? 0],
          ["Tests", st.testsTotal ? `${st.testsPassed}/${st.testsTotal}` : "—"],
          ["Tool calls", st.toolCalls ?? 0],
          ["Time working", mins ? `${mins}m` : "—"],
          ["Tokens", st.tokens ? compact(st.tokens) : "—"],
          ["Est. cost", st.tokens ? `$${((st.tokens / 1e6) * 9).toFixed(2)}` : "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="vo-mono" style={{ fontSize: 15 }}>{v}</div>
            <div className="vo-eyebrow" style={{ fontSize: 9, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
        <button className="vo-btn" data-on={zoom} onClick={onToggleZoom}>
          <Crosshair size={12} /> {zoom ? "Wide shot" : "Focus desk"}
        </button>
        <button className="vo-btn" disabled title="Not built yet"><FileCode2 size={12} /> View diff</button>
        <button className="vo-btn" disabled title="Not built yet"><TerminalIcon size={12} /> Logs</button>
        <button className="vo-btn" disabled title="Not built yet"><Pause size={12} /> Pause</button>
        <button className="vo-btn" disabled title="Not built yet"><Square size={12} /> Stop</button>
      </div>

      {st.terminal?.length > 0 && (
        <div className="vo-term">
          {st.terminal.slice(-8).map((l, i) => (
            <div key={i} style={{ overflowWrap: "anywhere", color: l.startsWith("$") ? "#818CF8"
              : /FAILED|failed/.test(l) ? "#EF4444" : /passed/.test(l) ? "#22C55E" : C.dim }}>{l}</div>
          ))}
        </div>
      )}
    </section>
  );
}
