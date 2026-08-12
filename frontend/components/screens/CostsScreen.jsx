"use client";

/**
 * What the run cost.
 *
 * Tokens come from the model's own usage numbers, reported per desk on every
 * turn. The rate below is a blended estimate — the authoritative per-stage
 * figure is written to `.agency/run.jsonl` in the workspace by the orchestrator.
 */
import { C, compact } from "../../lib/theme";
import { byId } from "../../lib/roster";
import { useCosts } from "../../lib/derive";

const PRICES = [
  { model: "claude-opus-5", input: 5, output: 25 },
  { model: "claude-sonnet-5", input: 3, output: 15 },
  { model: "claude-haiku-4-5", input: 1, output: 5 },
];

export default function CostsScreen({ agents, metrics, health, live, onSelectAgent }) {
  const costs = useCosts(agents);
  const max = Math.max(1, ...costs.rows.map((r) => r.tokens));
  const model = health?.model ?? (live ? "unknown" : "simulated");

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Costs</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          ${costs.cost.toFixed(2)} this run
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 640, lineHeight: 1.6 }}>
          Token counts are the model&apos;s own, reported per desk on every turn.
          The dollar figure is a blended estimate — the per-stage numbers land in{" "}
          <span className="vo-mono">.agency/run.jsonl</span> next to the code the
          agents wrote.
        </p>
      </div>

      <div className="vo-metrics" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        {[
          ["Tokens", compact(costs.tokens), "input + output, all desks"],
          ["Estimated", `$${costs.cost.toFixed(2)}`, "at a blended rate"],
          ["Tool calls", compact(costs.toolCalls), "each one a model turn or more"],
          ["Per task", metrics.tasksTotal ? `$${(costs.cost / metrics.tasksTotal).toFixed(2)}` : "—",
            `${metrics.tasksTotal} tasks planned`],
        ].map(([l, v, s]) => (
          <div key={l} className="vo-card" style={{ padding: "14px 16px" }}>
            <div className="vo-eyebrow">{l}</div>
            <div className="vo-mono" style={{ fontSize: 24, marginTop: 6, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 12 }}>Spend by desk</div>
          {costs.rows.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.faint }}>
              No token usage recorded yet. A demo run reports none — it never calls a model.
            </div>
          )}
          {costs.rows.map((r) => (
            <button key={r.id} className="vo-row" onClick={() => onSelectAgent(r.id)}>
              <span style={{ width: 66, fontSize: 12.5, flexShrink: 0 }}>{byId[r.id]?.name ?? r.id}</span>
              <div style={{ flex: 1, height: 7, background: C.raise, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: `${(r.tokens / max) * 100}%`, height: "100%",
                  background: C.accent, borderRadius: 7 }} />
              </div>
              <span className="vo-mono" style={{ fontSize: 11, color: C.dim, width: 52, textAlign: "right" }}>
                {compact(r.tokens)}
              </span>
              <span className="vo-mono" style={{ fontSize: 11, color: C.faint, width: 48, textAlign: "right" }}>
                ${r.cost.toFixed(2)}
              </span>
            </button>
          ))}
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow">Rates</div>
          <div className="vo-h" style={{ fontSize: 15, margin: "3px 0 4px" }}>USD per million tokens</div>
          <p style={{ fontSize: 11.5, color: C.faint, margin: "0 0 12px" }}>
            Currently running <span className="vo-mono">{model}</span>.
          </p>

          <table className="vo-table">
            <thead>
              <tr><th>Model</th><th className="num">Input</th><th className="num">Output</th></tr>
            </thead>
            <tbody>
              {PRICES.map((p) => (
                <tr key={p.model} data-on={p.model === model}>
                  <td className="vo-mono">{p.model}</td>
                  <td className="num">${p.input.toFixed(2)}</td>
                  <td className="num">${p.output.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="vo-eyebrow" style={{ margin: "18px 0 8px" }}>Where the money goes</div>
          <p style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.6 }}>
            The coder re-reads files on every task, which is the single largest
            avoidable cost in this pipeline. A compact repo map plus a summary of
            what earlier tasks changed would cut it — and routing planning to a
            strong model while mechanical edits run on a cheap one would cut it
            again.
          </p>
        </section>
      </div>
    </div>
  );
}
