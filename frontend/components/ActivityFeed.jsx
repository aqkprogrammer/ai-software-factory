"use client";

import { C, CAT_COLOR } from "../lib/theme";
import { byId } from "../lib/roster";
import { FILTERS } from "../lib/roster";

export function FilterChips({ value, onChange, options = FILTERS }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {options.map((f) => (
        <button key={f.id} className="vo-fbtn" data-on={value === f.id}
          onClick={() => onChange(f.id)}>{f.label}</button>
      ))}
    </div>
  );
}

export default function ActivityFeed({ events, onSelectAgent, maxHeight = 320, dense = false }) {
  if (!events.length) {
    return <div style={{ fontSize: 12.5, color: C.faint, padding: "14px 0" }}>
      No events in this filter yet.
    </div>;
  }

  return (
    <div style={{ maxHeight, overflowY: "auto" }}>
      {events.map((e) => {
        // The backend can emit ids with no desk (e.g. "system"). Show them,
        // don't crash on them, and don't try to select them.
        const who = byId[e.agentId] ?? { name: e.agentId ?? "system", role: "Unassigned" };
        const known = Boolean(byId[e.agentId]);
        const col = CAT_COLOR[e.cat] ?? C.dim;
        return (
          <button key={e.id} className="vo-evt"
            onClick={() => known && onSelectAgent?.(e.agentId)}>
            <span className="vo-mono" style={{ fontSize: 10, color: C.faint, flex: "0 0 54px" }}>{e.ts}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 11.5, color: C.ink, fontWeight: 500 }}>{who.name}</span>
              {!dense && <span style={{ fontSize: 10.5, color: C.faint }}> · {who.role}</span>}
              <span style={{ display: "block", fontSize: 12, color: col, overflowWrap: "anywhere", marginTop: 1 }}>
                {e.message}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
