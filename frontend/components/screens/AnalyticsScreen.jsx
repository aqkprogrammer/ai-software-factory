"use client";

/** Counts over the event stream. Every number here is events, not estimates. */
import { C, CAT_COLOR, compact } from "../../lib/theme";
import { STAFF, byId } from "../../lib/roster";
import { useAnalytics } from "../../lib/derive";

function BarRow({ label, value, max, color = C.accent, suffix = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span style={{ width: 74, fontSize: 12, color: C.dim, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 7, background: C.raise, borderRadius: 7, overflow: "hidden" }}>
        <div style={{ width: `${max ? (value / max) * 100 : 0}%`, height: "100%", background: color,
          borderRadius: 7, transition: "width 500ms cubic-bezier(.22,1,.36,1)" }} />
      </div>
      <span className="vo-mono" style={{ fontSize: 11, color: C.faint, width: 46, textAlign: "right" }}>
        {value}{suffix}
      </span>
    </div>
  );
}

export default function AnalyticsScreen({ feed, agents, metrics }) {
  const a = useAnalytics(feed, agents);
  const agentMax = Math.max(1, ...Object.values(a.byAgent));
  const catMax = Math.max(1, ...Object.values(a.byCategory));
  const topTypes = Object.entries(a.byType).sort((x, y) => y[1] - x[1]).slice(0, 8);
  const typeMax = Math.max(1, ...topTypes.map((t) => t[1]));

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Analytics</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {feed.length} events over {a.spanSeconds ? `${a.spanSeconds}s` : "—"}
        </div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          Everything here is counted from the same event stream the office
          renders. Nothing is sampled and nothing is estimated.
        </p>
      </div>

      <div className="vo-metrics" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        {[
          ["Events/min", a.eventsPerMinute ? a.eventsPerMinute.toFixed(0) : "—", "how busy the floor is"],
          ["Tool calls", compact(metrics.toolCalls), `${metrics.filesChanged} of them file writes`],
          ["Failures", metrics.errors, "events in the error category"],
          ["Spend", `$${metrics.cost.toFixed(2)}`, `${compact(metrics.tokens)} tokens`],
        ].map(([l, v, s]) => (
          <div key={l} className="vo-card" style={{ padding: "14px 16px" }}>
            <div className="vo-eyebrow">{l}</div>
            <div className="vo-mono" style={{ fontSize: 24, marginTop: 6, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{s}</div>
          </div>
        ))}
      </div>

      <section className="vo-card" style={{ padding: 16, marginBottom: 14 }}>
        <div className="vo-eyebrow" style={{ marginBottom: 12 }}>Activity over time</div>
        <div className="vo-spark" style={{ height: 96 }}>
          {a.timeline.map((v, i) => (
            <span key={i} style={{ height: `${Math.max(3, (v / a.peak) * 100)}%`,
              background: v ? C.accent : C.raise, opacity: v ? 0.5 + (v / a.peak) * 0.5 : 1 }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint }}>
          <span>oldest</span>
          <span>peak {a.peak} events per bucket</span>
          <span>now</span>
        </div>
      </section>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Events by desk</div>
          {STAFF.filter((p) => a.byAgent[p.id]).map((p) => (
            <BarRow key={p.id} label={p.name} value={a.byAgent[p.id]} max={agentMax} />
          ))}
          {Object.keys(a.byAgent).filter((id) => !byId[id]).map((id) => (
            <BarRow key={id} label={id} value={a.byAgent[id]} max={agentMax} color={C.faint} />
          ))}
          {Object.keys(a.byAgent).length === 0 && (
            <div style={{ fontSize: 12.5, color: C.faint }}>No events yet.</div>
          )}
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 10 }}>By category</div>
          {Object.entries(a.byCategory).sort((x, y) => y[1] - x[1]).map(([k, v]) => (
            <BarRow key={k} label={k} value={v} max={catMax} color={CAT_COLOR[k] ?? C.accent} />
          ))}

          <div className="vo-eyebrow" style={{ margin: "18px 0 10px" }}>Most common events</div>
          {topTypes.map(([k, v]) => (
            <BarRow key={k} label={k.replace(/_/g, " ")} value={v} max={typeMax} color={C.cyan} />
          ))}
        </section>
      </div>
    </div>
  );
}
