"use client";

/** The roster, with what each desk is actually allowed to do.
 *  Permissions come from GET /agents — the same objects the runtime uses. */
import { Circle, Lock } from "lucide-react";

import { C, STATUS, BUSY, compact } from "../../lib/theme";
import { STAFF } from "../../lib/roster";

export default function Employees({ agents, roster, onSelectAgent }) {
  const byDesk = Object.fromEntries((roster || []).map((r) => [r.deskId, r]));

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">AI employees</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {roster?.length ?? 0} implemented, {STAFF.length - (roster?.length ?? 0)} desks empty
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          An agent is a system prompt plus a tool allowlist. The allowlist is the
          permission system — the reviewer cannot write code because the write
          tools were never handed to it, not because the prompt asked nicely.
        </p>
      </div>

      <div className="vo-grid">
        {STAFF.map((p) => {
          const a = agents[p.id] ?? { status: "offline" };
          const s = STATUS[a.status] ?? STATUS.offline;
          const impl = byDesk[p.id];
          return (
            <button key={p.id} className="vo-card vo-emp" onClick={() => onSelectAgent(p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="vo-emp-avatar" style={{ borderColor: `${s.c}66`, color: s.c }}>
                  {p.name.slice(0, 2)}
                </span>
                <div style={{ minWidth: 0, textAlign: "left" }}>
                  <div className="vo-h" style={{ fontSize: 13.5 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{p.role}</div>
                </div>
                <Circle size={8} fill={s.c} strokeWidth={0}
                  className={BUSY.includes(a.status) ? "vo-pulse" : ""}
                  style={{ marginLeft: "auto", flexShrink: 0 }} />
              </div>

              <div style={{ fontSize: 11.5, color: BUSY.includes(a.status) ? C.dim : C.faint,
                marginTop: 10, minHeight: 30, textAlign: "left" }}>
                {impl ? (a.activity ?? "Idle") : "Desk not provisioned — no agent implemented yet"}
              </div>

              {impl ? (
                <>
                  <div className="vo-emp-stats">
                    <span>{impl.model}</span>
                    <span>{impl.tools.length} tools</span>
                    <span>{compact(a.tokens || 0)} tok</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {impl.tools.length === 0 && (
                      <span className="vo-tag" style={{ color: "#22C55E", borderColor: "#22C55E44" }}>
                        <Lock size={9} /> no filesystem access
                      </span>
                    )}
                    {impl.canWrite && <span className="vo-tag" style={{ color: "#F97316", borderColor: "#F9731644" }}>can write</span>}
                    {impl.canExecute && <span className="vo-tag" style={{ color: "#F97316", borderColor: "#F9731644" }}>can execute</span>}
                    {!impl.canWrite && impl.tools.length > 0 && (
                      <span className="vo-tag" style={{ color: "#22C55E", borderColor: "#22C55E44" }}>read only</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="vo-emp-stats"><span>—</span><span>no tools</span><span>—</span></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
