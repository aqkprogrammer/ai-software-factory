"use client";

/**
 * The deployment pipeline, and an honest account of how far it gets.
 *
 * Stages up to the gate are real and derived from the run. Nothing past the
 * gate is implemented, so those stages say so instead of showing a green tick.
 */
import { Rocket, Check, X, Clock, Ban } from "lucide-react";

import { C } from "../../lib/theme";
import { byId } from "../../lib/roster";

export default function DeploymentsScreen({ metrics, approvals, tasks, onRoute }) {
  const list = Object.values(approvals || {});
  const pending = list.filter((a) => a.status === "pending");
  const approved = list.filter((a) => a.status === "approved");
  const taskList = Object.values(tasks || {});
  const built = taskList.length > 0 && taskList.every((t) => t.status === "completed");

  const stages = [
    { id: "build",    label: "Build",          state: taskList.length ? (built ? "passed" : "running") : "idle",
      note: taskList.length ? `${taskList.filter((t) => t.status === "completed").length}/${taskList.length} tasks complete` : "no tasks yet" },
    { id: "unit",     label: "Test suite",     state: metrics.tests.total ? (metrics.tests.passed === metrics.tests.total ? "passed" : "failed") : "idle",
      note: metrics.tests.total ? `${metrics.tests.passed}/${metrics.tests.total} assertions` : "not run" },
    { id: "scan",     label: "Security scan",  state: "skipped", note: "no scanner in the pipeline" },
    { id: "image",    label: "Container build", state: "skipped", note: "Dockerfile exists, not wired into a run" },
    { id: "staging",  label: "Staging",        state: "skipped", note: "no environment provisioned" },
    { id: "approval", label: "Human approval", state: pending.length ? "waiting" : approved.length ? "passed" : "idle",
      note: pending.length ? `${pending.length} waiting on you` : approved.length ? `${approved.length} approved` : "no gate raised yet" },
    { id: "prod",     label: "Production",     state: "never", note: "nothing has ever shipped from here" },
  ];

  const TONE = {
    passed:  { c: "#22C55E", Icon: Check },
    running: { c: "#3B82F6", Icon: Clock },
    waiting: { c: "#EAB308", Icon: Clock },
    failed:  { c: "#EF4444", Icon: X },
    skipped: { c: C.faint,   Icon: Ban },
    never:   { c: C.faint,   Icon: Ban },
    idle:    { c: C.faint,   Icon: Clock },
  };

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Deployments</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>Nothing has shipped</div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          The pipeline builds, tests and reviews, then stops at a human gate.
          There is no deploy step behind that gate yet — so this screen shows
          how far a run actually gets rather than a green production tick.
        </p>
      </div>

      <section className="vo-card" style={{ padding: 18, marginBottom: 14 }}>
        <div className="vo-eyebrow" style={{ marginBottom: 14 }}>Pipeline</div>
        <div className="vo-pipeline">
          {stages.map((s, i) => {
            const t = TONE[s.state];
            return (
              <div key={s.id} className="vo-stage">
                <div className="vo-stage-dot" style={{ borderColor: t.c, color: t.c }}>
                  <t.Icon size={12} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: s.state === "skipped" || s.state === "never" ? C.faint : C.ink }}>
                    {s.label}
                  </div>
                  <div className="vo-mono" style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>{s.note}</div>
                </div>
                {i < stages.length - 1 && <div className="vo-stage-line" />}
              </div>
            );
          })}
        </div>
      </section>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Gates raised</div>
          {list.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.faint }}>None yet — a run raises one after review.</div>
          )}
          {list.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: `1px solid ${C.borderSoft}`, fontSize: 12.5 }}>
              <Rocket size={13} color={a.status === "approved" ? "#22C55E" : a.status === "rejected" ? "#EF4444" : "#EAB308"} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap" }}>{a.title || a.id}</span>
              <span style={{ fontSize: 11, color: C.faint }}>
                {byId[a.requestedByAgentId]?.name ?? "agent"}
              </span>
              <span className="vo-mono" style={{ fontSize: 10.5,
                color: a.status === "approved" ? "#22C55E" : a.status === "rejected" ? "#EF4444" : "#EAB308" }}>
                {a.status}
              </span>
            </div>
          ))}
          {pending.length > 0 && (
            <button className="vo-btn" style={{ marginTop: 14 }} onClick={() => onRoute("approvals")}>
              Answer {pending.length} gate{pending.length > 1 ? "s" : ""}
            </button>
          )}
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">What&apos;s missing</div>
          <div className="vo-h" style={{ fontSize: 15, margin: "3px 0 12px" }}>To make this real</div>
          {[
            ["A container build in the run", "The Dockerfile ships, but no stage invokes it."],
            ["Somewhere to deploy", "No staging or production environment is provisioned."],
            ["A DevOps agent", "Pylon's desk is empty; nothing owns this stage."],
            ["Rollback", "There is no deploy, so there is nothing to roll back."],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "9px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
              <div style={{ fontSize: 12.5 }}>{k}</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3, lineHeight: 1.5 }}>{v}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
