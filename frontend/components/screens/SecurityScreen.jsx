"use client";

/**
 * What actually constrains these agents.
 *
 * There is no security scanner in this pipeline yet, so this screen does not
 * invent findings. It shows the controls that genuinely exist — read from the
 * live agent config — and states plainly what is not covered.
 */
import { ShieldCheck, ShieldAlert, Lock, Unlock } from "lucide-react";

import { C } from "../../lib/theme";
import { byId } from "../../lib/roster";

const CONTROLS = [
  {
    id: "allowlist", label: "Tool allowlist per agent", status: "enforced",
    detail: "An agent can only call tools it was handed. The planner holds none, so it cannot touch the filesystem at all.",
    where: "agency/agents.py",
  },
  {
    id: "sandbox", label: "Workspace path boundary", status: "enforced",
    detail: "Every path is resolved and rejected if it escapes the workspace root. Covered by a test that runs without an API key.",
    where: "agency/tools.py · Workspace.path()",
  },
  {
    id: "gate", label: "Human approval before production", status: "enforced",
    detail: "The pipeline stops at a gate and waits for a person. Nothing deploys on an agent's say-so.",
    where: "agency/orchestrator.py",
  },
  {
    id: "review", label: "Read-only reviewer", status: "enforced",
    detail: "The reviewer holds read and run tools only, so it can inspect and execute but never rewrite what it is judging.",
    where: "agency/agents.py · REVIEWER",
  },
  {
    id: "container", label: "Container isolation", status: "available",
    detail: "A Dockerfile and compose file ship with the backend, but running in it is opt-in. run_command executes whatever the model decides to run.",
    where: "backend/docker-compose.yml",
  },
  {
    id: "scanner", label: "Automated security scan", status: "missing",
    detail: "No SAST, dependency audit or secret scan runs in the pipeline. The Aegis desk is empty.",
    where: "not implemented",
  },
  {
    id: "authz", label: "API authentication", status: "missing",
    detail: "The backend has no auth. POST /runs executes code — do not expose the port.",
    where: "backend/server.py",
  },
];

const TONE = {
  enforced:  { c: "#22C55E", Icon: ShieldCheck, label: "enforced" },
  available: { c: "#EAB308", Icon: ShieldAlert, label: "opt-in" },
  missing:   { c: "#EF4444", Icon: ShieldAlert, label: "not implemented" },
};

export default function SecurityScreen({ roster, live }) {
  const counts = CONTROLS.reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Security</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {counts.enforced} controls enforced, {counts.missing} gaps
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 640, lineHeight: 1.6 }}>
          No scanner runs in this pipeline, so there are no findings to show and
          none are invented here. What follows is the real boundary: what these
          agents can do, and what stops them.
        </p>
      </div>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 12 }}>Controls</div>
          {CONTROLS.map((c) => {
            const t = TONE[c.status];
            return (
              <div key={c.id} style={{ display: "flex", gap: 11, padding: "11px 0",
                borderBottom: `1px solid ${C.borderSoft}` }}>
                <t.Icon size={15} color={t.c} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13 }}>{c.label}</span>
                    <span className="vo-tag" style={{ color: t.c, borderColor: `${t.c}44` }}>{t.label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.faint, marginTop: 4, lineHeight: 1.55 }}>{c.detail}</div>
                  <div className="vo-mono" style={{ fontSize: 10, color: C.faint, marginTop: 4 }}>{c.where}</div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">Permissions</div>
          <div className="vo-h" style={{ fontSize: 15, margin: "3px 0 4px" }}>Who can do what</div>
          <p style={{ fontSize: 11.5, color: C.faint, margin: "0 0 14px", lineHeight: 1.55 }}>
            {live ? "Read from the running backend." : "Simulated — start the backend for the real allowlist."}
          </p>

          {(roster || []).map((a) => (
            <div key={a.name} style={{ padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5 }}>{byId[a.deskId]?.name ?? a.deskId}</span>
                <span style={{ fontSize: 11, color: C.faint }}>{a.name}</span>
                <span style={{ marginLeft: "auto", display: "inline-flex", gap: 5 }}>
                  {a.canWrite
                    ? <Unlock size={12} color="#F97316" aria-label="can write" />
                    : <Lock size={12} color="#22C55E" aria-label="read only" />}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 7 }}>
                {a.tools.length === 0 && <span className="vo-tag">no tools</span>}
                {a.tools.map((t) => (
                  <span key={t} className="vo-tag vo-mono"
                    style={["write_file", "edit_file", "run_command"].includes(t)
                      ? { color: "#F97316", borderColor: "#F9731644" } : {}}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {(!roster || roster.length === 0) && (
            <div style={{ fontSize: 12.5, color: C.faint }}>Backend not reachable.</div>
          )}
        </section>
      </div>
    </div>
  );
}
