"use client";

/**
 * The human gate.
 *
 * The pipeline stops here on purpose — anything touching production waits for
 * a person. Approving posts back to the backend, which emits the decision as
 * an event, so the answer shows up in the log like everything else.
 */
import { useState } from "react";
import { ShieldCheck, AlertTriangle, Check, X } from "lucide-react";

import { C } from "../../lib/theme";
import { byId } from "../../lib/roster";

const LABEL = {
  production_deployment: "Production deployment",
  database_migration: "Database migration",
  infrastructure_change: "Infrastructure change",
  security_sensitive: "Security-sensitive change",
};

function Summary({ s }) {
  if (!s) return null;
  const rows = [
    ["Files changed", s.filesChanged],
    ["Tests", s.testsTotal ? `${s.testsPassed}/${s.testsTotal} passing` : "not run"],
    ["Security scan", s.securityStatus ?? "skipped"],
    ["Infrastructure changes", s.infrastructureChanges ?? 0],
    ["Monthly cost change", `${s.estimatedMonthlyCostDeltaUsd >= 0 ? "+" : ""}$${s.estimatedMonthlyCostDeltaUsd ?? 0}`],
  ];
  return (
    <div className="vo-summary">
      {rows.map(([k, v]) => (
        <div key={k}>
          <div className="vo-mono" style={{ fontSize: 14 }}>{v}</div>
          <div className="vo-eyebrow" style={{ fontSize: 9, marginTop: 3 }}>{k}</div>
        </div>
      ))}
    </div>
  );
}

export default function Approvals({ approvals, onResolve, live }) {
  const [busy, setBusy] = useState(null);
  const list = Object.values(approvals);
  const pending = list.filter((a) => a.status === "pending");
  const settled = list.filter((a) => a.status !== "pending");

  const decide = async (id, decision) => {
    setBusy(id);
    try { await onResolve(id, decision); } finally { setBusy(null); }
  };

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Approvals</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {pending.length ? `${pending.length} waiting on you` : "Nothing waiting"}
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>
          The agents can plan, write, test and review on their own. They stop
          here. Deployments, migrations and anything security-sensitive need a
          person to say yes — that boundary is in the pipeline, not in a prompt.
        </p>
      </div>

      {pending.length === 0 && settled.length === 0 && (
        <section className="vo-card" style={{ padding: 26, textAlign: "center", color: C.faint }}>
          <ShieldCheck size={22} style={{ opacity: 0.5 }} />
          <div style={{ fontSize: 13, marginTop: 10 }}>
            No gates reached yet. A run raises one when it finishes review.
          </div>
        </section>
      )}

      {pending.map((a) => (
        <section key={a.id} className="vo-card vo-approval" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <AlertTriangle size={15} color="#EAB308" />
            <div>
              <div className="vo-h" style={{ fontSize: 15 }}>{a.title || LABEL[a.type] || a.id}</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
                {LABEL[a.type] ?? a.type} · raised by {byId[a.requestedByAgentId]?.name ?? "an agent"}
              </div>
            </div>
            <span className="vo-chip" style={{ marginLeft: "auto", color: "#EAB308", borderColor: "#EAB30855" }}>
              pending
            </span>
          </div>

          <Summary s={a.summary} />

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button className="vo-btn vo-btn-danger" disabled={busy === a.id}
              onClick={() => decide(a.id, "rejected")}>
              <X size={12} /> Reject
            </button>
            <button className="vo-btn vo-btn-go" disabled={busy === a.id}
              onClick={() => decide(a.id, "approved")}>
              <Check size={12} /> {busy === a.id ? "Sending…" : "Approve"}
            </button>
            {!live && (
              <span style={{ fontSize: 11, color: C.faint, alignSelf: "center" }}>
                simulated — nothing ships
              </span>
            )}
          </div>
        </section>
      ))}

      {settled.length > 0 && (
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Decided</div>
          {settled.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderBottom: `1px solid ${C.borderSoft}`, fontSize: 12.5 }}>
              <span style={{ color: a.status === "approved" ? "#22C55E" : "#EF4444" }}>
                {a.status === "approved" ? <Check size={13} /> : <X size={13} />}
              </span>
              <span style={{ flex: 1 }}>{a.title || a.id}</span>
              <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint }}>{a.status}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
