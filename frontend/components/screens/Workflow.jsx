"use client";

/**
 * The pipeline as a graph, with live state.
 *
 * The nodes are the stages `orchestrator.build()` actually runs, so this is a
 * picture of the code rather than a diagram someone drew once and let rot.
 * Edge animation is a dashed stroke with a moving offset — active edges flow,
 * settled ones sit still.
 */
import { C, STATUS } from "../../lib/theme";
import { PIPELINE, byId } from "../../lib/roster";

const NODE_W = 190, NODE_H = 54, GAP_X = 230, GAP_Y = 96;

/** Derive each stage's state from agents, tasks and approvals. */
function stageStates({ agents, tasks, approvals }) {
  const taskList = Object.values(tasks);
  const done = (a) => a && ["waiting", "offline"].includes(a.status);
  const busy = (a) => a && ["working", "thinking", "reviewing"].includes(a.status);

  const cto = agents.cto, backend = agents.backend, qa = agents.qa, reviewer = agents.reviewer;
  const anyTasks = taskList.length > 0;
  const allDone = anyTasks && taskList.every((t) => t.status === "completed");
  const pending = Object.values(approvals).filter((a) => a.status === "pending");
  const approved = Object.values(approvals).filter((a) => a.status === "approved");

  return {
    requirements: anyTasks || busy(cto) ? "done" : "idle",
    plan: anyTasks ? (busy(cto) ? "active" : "done") : busy(cto) ? "active" : "idle",
    code: busy(backend) ? "active" : taskList.some((t) => ["review", "completed"].includes(t.status)) ? "done" : "idle",
    tests: busy(qa) ? "active" : (agents.qa?.testsTotal ? "done" : "idle"),
    fix: agents.backend?.status === "error" ? "failed" : allDone ? "done" : busy(backend) ? "active" : "idle",
    review: busy(reviewer) ? "active" : done(reviewer) && anyTasks ? "done" : "idle",
    approval: pending.length ? "waiting" : approved.length ? "done" : "idle",
    production: approved.length ? "done" : "idle",
  };
}

const STATE_COLOR = {
  idle:    { stroke: C.border,  fill: "#131C31", text: C.faint,  label: "not started" },
  active:  { stroke: "#22C55E", fill: "#10251F", text: "#22C55E", label: "running" },
  done:    { stroke: "#3B82F6", fill: "#101C31", text: "#3B82F6", label: "complete" },
  waiting: { stroke: "#EAB308", fill: "#241F10", text: "#EAB308", label: "waiting on you" },
  failed:  { stroke: "#EF4444", fill: "#2A1417", text: "#EF4444", label: "failing" },
};

export default function Workflow({ agents, tasks, approvals, onSelectAgent, onRoute }) {
  const states = stageStates({ agents, tasks, approvals });

  const pos = (n) => ({ x: n.x * GAP_X, y: n.y * GAP_Y });
  const xs = PIPELINE.map((n) => pos(n).x);
  const minX = Math.min(...xs) - NODE_W / 2 - 40;
  const width = Math.max(...xs) - Math.min(...xs) + NODE_W + 80;
  const height = (Math.max(...PIPELINE.map((n) => n.y)) + 1) * GAP_Y + 20;

  return (
    <div className="vo-screen">
      <section className="vo-card" style={{ padding: 18 }}>
        <div className="vo-eyebrow">Pipeline</div>
        <div className="vo-h" style={{ fontSize: 16, margin: "3px 0 4px" }}>
          What runs, in what order, and where it is right now
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, maxWidth: 620, lineHeight: 1.6, margin: "0 0 10px" }}>
          These are the stages <span className="vo-mono">orchestrator.build()</span> executes. The
          test stage feeds failures back into the fix stage — that loop, capped
          at <span className="vo-mono">max_fix_attempts</span>, is what makes the output converge.
        </p>

        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`${minX} -40 ${width} ${height}`} style={{ width: "100%", minWidth: 520, maxHeight: 620 }}>
            <defs>
              <marker id="wfArrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={C.border} />
              </marker>
            </defs>

            {PIPELINE.map((n) => n.needs.map((needId) => {
              const from = PIPELINE.find((p) => p.id === needId);
              const a = pos(from), b = pos(n);
              const live = states[n.id] === "active" || states[needId] === "active";
              const mid = (a.y + NODE_H / 2 + b.y - NODE_H / 2) / 2;
              const d = `M ${a.x} ${a.y + NODE_H / 2} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y - NODE_H / 2}`;
              return (
                <path key={`${needId}-${n.id}`} d={d} fill="none" markerEnd="url(#wfArrow)"
                  stroke={live ? "#22C55E" : C.border} strokeWidth={live ? 1.8 : 1.2}
                  strokeDasharray="5 5" className={live ? "vo-flow" : ""} opacity={live ? 0.95 : 0.5} />
              );
            }))}

            {/* the fix loop, drawn explicitly because it goes backwards */}
            <path d={`M ${pos(PIPELINE.find((n) => n.id === "fix")).x - NODE_W / 2} ${pos(PIPELINE.find((n) => n.id === "fix")).y}
                      C ${-260} ${pos(PIPELINE.find((n) => n.id === "fix")).y}, ${-260} ${pos(PIPELINE.find((n) => n.id === "code")).y}, ${pos(PIPELINE.find((n) => n.id === "code")).x - NODE_W / 2} ${pos(PIPELINE.find((n) => n.id === "code")).y}`}
              fill="none" stroke={states.fix === "failed" ? "#EF4444" : C.border} strokeWidth="1.2"
              strokeDasharray="4 6" markerEnd="url(#wfArrow)"
              className={states.fix === "failed" ? "vo-flow" : ""} opacity={0.75} />
            <text x={-268} y={(pos(PIPELINE.find((n) => n.id === "fix")).y + pos(PIPELINE.find((n) => n.id === "code")).y) / 2}
              fill={C.faint} fontSize="9.5" textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90 -268 ${(pos(PIPELINE.find((n) => n.id === "fix")).y + pos(PIPELINE.find((n) => n.id === "code")).y) / 2})`}>
              ON FAIL
            </text>

            {PIPELINE.map((n) => {
              const p = pos(n);
              const st = STATE_COLOR[states[n.id]] ?? STATE_COLOR.idle;
              const owner = n.agent ? byId[n.agent] : null;
              const agentStatus = n.agent ? STATUS[agents[n.agent]?.status ?? "offline"] : null;
              return (
                <g key={n.id} transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                  style={{ cursor: n.agent ? "pointer" : "default" }}
                  onClick={() => n.agent ? onSelectAgent(n.agent) : n.id === "approval" && onRoute("approvals")}>
                  <rect width={NODE_W} height={NODE_H} rx="10" fill={st.fill} stroke={st.stroke}
                    strokeWidth={states[n.id] === "active" ? 1.8 : 1}
                    className={states[n.id] === "active" ? "vo-node-live" : ""} />
                  <text x="14" y="22" fill={C.ink} fontSize="12.5" fontFamily="Inter, sans-serif">{n.label}</text>
                  <text x="14" y="39" fill={st.text} fontSize="10"
                    fontFamily="'JetBrains Mono', monospace">{st.label.toUpperCase()}</text>
                  {owner && (
                    <>
                      <circle cx={NODE_W - 20} cy="20" r="4" fill={agentStatus.c} />
                      <text x={NODE_W - 30} y="24" fill={C.faint} fontSize="10" textAnchor="end"
                        fontFamily="'JetBrains Mono', monospace">{owner.name}</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
          {Object.entries(STATE_COLOR).map(([k, v]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, color: C.faint }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: v.fill, border: `1px solid ${v.stroke}` }} />
              {v.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
