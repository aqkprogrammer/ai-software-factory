"use client";

/**
 * The full event log, with a scrubber.
 *
 * Replay is honest here: every event is already persisted server-side and
 * replayed to the client on connect, so dragging the scrubber is showing you
 * real history, not a re-simulation.
 */
import { useMemo, useState } from "react";
import { History, Rewind } from "lucide-react";

import { C, CAT_COLOR } from "../../lib/theme";
import { STAFF, byId, FILTERS } from "../../lib/roster";
import ActivityFeed, { FilterChips } from "../ActivityFeed";

export default function ActivityScreen({ feed, onSelectAgent }) {
  const [cat, setCat] = useState("all");
  const [agent, setAgent] = useState("all");
  const [cut, setCut] = useState(0);          // events hidden from the newest end

  const filtered = useMemo(() => feed.filter((e) =>
    (cat === "all" || e.cat === cat) && (agent === "all" || e.agentId === agent)), [feed, cat, agent]);

  const replaying = cut > 0;
  const shown = replaying ? filtered.slice(cut) : filtered;
  const marker = replaying ? filtered[cut] : null;

  const agentOptions = [{ id: "all", label: "Everyone" },
    ...STAFF.filter((p) => feed.some((e) => e.agentId === p.id)).map((p) => ({ id: p.id, label: p.name }))];

  /*  Histogram of events over *time*, not over index — bucketing by index
      gives you a flat bar chart that looks like data and tells you nothing.
      Bucketing by timestamp shows the actual bursts: a coder hammering the
      filesystem spikes, a model call waiting is a gap.                     */
  const buckets = useMemo(() => {
    const n = 60, out = new Array(n).fill(0);
    const stamps = filtered.map((e) => new Date(e.iso).getTime()).filter((t) => !Number.isNaN(t));
    if (stamps.length < 2) return out.map(() => (stamps.length ? 1 : 0));

    const min = Math.min(...stamps), max = Math.max(...stamps);
    const span = Math.max(1, max - min);
    stamps.forEach((t) => { out[Math.min(n - 1, Math.floor(((t - min) / span) * n))] += 1; });
    const peak = Math.max(1, ...out);
    return out.map((v) => v / peak);
  }, [filtered]);

  return (
    <div className="vo-screen">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div className="vo-eyebrow">Agent activity</div>
          <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
            {feed.length} events this session
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FilterChips value={cat} onChange={setCat} options={FILTERS} />
          <FilterChips value={agent} onChange={setAgent} options={agentOptions} />
        </div>
      </div>

      <section className="vo-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <History size={13} color={C.dim} />
          <span className="vo-eyebrow" style={{ margin: 0 }}>Replay</span>
          <span style={{ fontSize: 11.5, color: replaying ? "#EAB308" : C.faint, marginLeft: 6 }}>
            {replaying
              ? `rewound to ${marker?.ts ?? "—"} · ${shown.length} of ${filtered.length} events`
              : "live — drag to rewind through what happened"}
          </span>
          {replaying && (
            <button className="vo-btn" style={{ marginLeft: "auto" }} onClick={() => setCut(0)}>
              <Rewind size={12} /> Back to live
            </button>
          )}
        </div>

        <div className="vo-spark">
          {buckets.map((v, i) => (
            <span key={i} style={{ height: `${8 + v * 100}%`,
              background: i / buckets.length > 1 - cut / Math.max(1, filtered.length) ? C.raise : C.accent,
              opacity: 0.55 + v * 0.45 }} />
          ))}
        </div>

        <input type="range" className="vo-range" min={0} max={Math.max(0, filtered.length - 1)}
          value={cut} onChange={(e) => setCut(Number(e.target.value))}
          aria-label="Rewind the event log" />
      </section>

      <section className="vo-card" style={{ padding: 16 }}>
        <ActivityFeed events={shown} onSelectAgent={onSelectAgent} maxHeight={520} />
      </section>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
        {Object.entries(CAT_COLOR).map(([k, v]) => (
          <span key={k} style={{ fontSize: 10.5, color: C.faint, display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: v }} />{k}
          </span>
        ))}
      </div>
    </div>
  );
}
