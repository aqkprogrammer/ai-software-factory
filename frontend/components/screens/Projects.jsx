"use client";

/** Runs are the unit of work here, and the event log is the run history. */
import { C, compact } from "../../lib/theme";

const stamp = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB", { hour12: false }).replace(",", "");
};

const duration = (a, b) => {
  if (!a || !b) return "—";
  const s = Math.round((new Date(b) - new Date(a)) / 1000);
  if (Number.isNaN(s)) return "—";
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
};

export default function Projects({ runs, metrics, live, onRoute }) {
  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Projects</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>AI CRM Platform</div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          One project, many runs. Each run is a full pass of the pipeline against
          a workspace directory, and every run below is reconstructed from the
          event log — there is no separate runs table.
        </p>
      </div>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 12 }}>Run history</div>

          {runs.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.faint }}>
              No runs recorded yet. Start one from the bar above.
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            {runs.length > 0 && (
              <table className="vo-table">
                <thead>
                  <tr>
                    <th>Run</th><th>Started</th><th>Duration</th>
                    <th className="num">Events</th><th className="num">Writes</th>
                    <th className="num">Tests</th><th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.runId}>
                      <td className="vo-mono" style={{ color: C.ink }}>{r.runId}</td>
                      <td>{r.simulated ? "simulated" : stamp(r.startedAt)}</td>
                      <td>{r.simulated ? "—" : duration(r.startedAt, r.endedAt)}</td>
                      <td className="num">{r.events}</td>
                      <td className="num">{r.fileWrites}</td>
                      <td className="num">
                        <span style={{ color: "#22C55E" }}>{r.testsPassed}</span>
                        {r.testsFailed > 0 && <span style={{ color: "#EF4444" }}> / {r.testsFailed}</span>}
                      </td>
                      <td>
                        <span className="vo-chip" style={{ padding: "2px 8px",
                          color: r.current ? "#22C55E" : C.faint,
                          borderColor: r.current ? "#22C55E55" : C.border }}>
                          {r.current ? "current" : "finished"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">This run</div>
          <div className="vo-h" style={{ fontSize: 15, margin: "3px 0 14px" }}>
            {metrics.tasksTotal ? `${metrics.tasksDone}/${metrics.tasksTotal} tasks done` : "Not started"}
          </div>

          {[
            ["Workspace", live ? "./workspace/demo" : "simulated"],
            ["Stack", "FastAPI · SQLite · pytest"],
            ["Files changed", metrics.filesChanged],
            ["Tool calls", compact(metrics.toolCalls)],
            ["Tests", metrics.tests.total ? `${metrics.tests.passed}/${metrics.tests.total}` : "—"],
            ["Spend", `$${metrics.cost.toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", padding: "7px 0", fontSize: 12.5,
              borderBottom: `1px solid ${C.borderSoft}` }}>
              <span style={{ color: C.faint }}>{k}</span>
              <span className="vo-mono" style={{ marginLeft: "auto" }}>{v}</span>
            </div>
          ))}

          <button className="vo-btn" style={{ marginTop: 14 }} onClick={() => onRoute("tasks")}>
            Open the task board
          </button>
        </section>
      </div>
    </div>
  );
}
