"use client";

/** Every suite execution the run reported, straight from the event stream. */
import { CheckCircle2, XCircle, Loader } from "lucide-react";

import { C } from "../../lib/theme";
import { byId } from "../../lib/roster";
import { useTestRuns } from "../../lib/derive";

export default function TestingScreen({ feed, metrics, onSelectAgent }) {
  const runs = useTestRuns(feed);
  const failed = runs.filter((r) => r.status === "failed").length;
  const passed = runs.filter((r) => r.status === "passed").length;
  const rate = runs.length ? Math.round((passed / (passed + failed || 1)) * 100) : 0;

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Testing</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {runs.length ? `${runs.length} suite executions this run` : "No tests run yet"}
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          The tester writes its own cases and never fixes the code. When a suite
          fails, the report goes back to the coder as new input — the red rows
          below are that loop working, not the pipeline breaking.
        </p>
      </div>

      <div className="vo-metrics" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <div className="vo-card" style={{ padding: "14px 16px" }}>
          <div className="vo-eyebrow">Assertions</div>
          <div className="vo-mono" style={{ fontSize: 26, marginTop: 6, lineHeight: 1,
            color: metrics.tests.total && metrics.tests.passed === metrics.tests.total ? "#22C55E" : C.ink }}>
            {metrics.tests.total ? `${metrics.tests.passed}/${metrics.tests.total}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>passing across all desks</div>
        </div>
        <div className="vo-card" style={{ padding: "14px 16px" }}>
          <div className="vo-eyebrow">Suites green</div>
          <div className="vo-mono" style={{ fontSize: 26, marginTop: 6, lineHeight: 1, color: "#22C55E" }}>{passed}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>executions that passed</div>
        </div>
        <div className="vo-card" style={{ padding: "14px 16px" }}>
          <div className="vo-eyebrow">Suites red</div>
          <div className="vo-mono" style={{ fontSize: 26, marginTop: 6, lineHeight: 1,
            color: failed ? "#EF4444" : C.ink }}>{failed}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>each one fed back to the coder</div>
        </div>
        <div className="vo-card" style={{ padding: "14px 16px" }}>
          <div className="vo-eyebrow">First-run rate</div>
          <div className="vo-mono" style={{ fontSize: 26, marginTop: 6, lineHeight: 1 }}>
            {runs.length ? `${rate}%` : "—"}
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>suites green without a fix</div>
        </div>
      </div>

      <section className="vo-card" style={{ padding: 16 }}>
        <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Executions</div>
        {runs.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.faint }}>
            Nothing yet. The tester runs a suite as soon as there is something to test.
          </div>
        )}
        {runs.map((r) => {
          const Icon = r.status === "passed" ? CheckCircle2 : r.status === "failed" ? XCircle : Loader;
          const col = r.status === "passed" ? "#22C55E" : r.status === "failed" ? "#EF4444" : C.faint;
          return (
            <button key={r.id} className="vo-row" onClick={() => onSelectAgent(r.agentId)}>
              <Icon size={13} color={col} className={r.status === "running" ? "vo-pulse" : ""}
                style={{ flexShrink: 0 }} />
              <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint, flex: "0 0 58px" }}>{r.ts}</span>
              <span style={{ fontSize: 12, width: 58, flexShrink: 0 }}>{byId[r.agentId]?.name ?? r.agentId}</span>
              <span className="vo-mono" style={{ fontSize: 11.5, flex: 1, minWidth: 0, color: C.dim,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.command}
              </span>
              <span className="vo-mono" style={{ fontSize: 11, color: col, flexShrink: 0 }}>
                {r.total ? `${r.passed}/${r.total}` : r.status}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
