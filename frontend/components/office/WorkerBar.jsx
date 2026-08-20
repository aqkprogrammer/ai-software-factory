"use client";

/**
 * The roster strip under the office — one card per desk, with the same sprite
 * the canvas draws so a worker is recognisable in both places.
 */
import { useRef, useEffect } from "react";

import { STAFF } from "../../lib/roster";
import { STATUS, BUSY } from "../../lib/theme";
import { drawAvatar } from "../../lib/pixel";

function Avatar({ index, status }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;
    let raf = 0, last = 0, frame = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 160) return;
      last = now;
      drawAvatar(ctx, index, status, (frame += 1));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, status]);

  return <canvas ref={ref} width={20} height={20} className="px-avatar" />;
}

export default function WorkerBar({ agents, selected, onSelect }) {
  return (
    <div className="px-bar" role="list">
      {STAFF.map((p, i) => {
        const a = agents[p.id] ?? { status: "offline" };
        const s = STATUS[a.status] ?? STATUS.offline;
        const on = p.id === selected;
        return (
          <button key={p.id} role="listitem" className="px-card" data-on={on}
            onClick={() => onSelect(p.id)}
            aria-label={`${p.name}, ${p.role}, ${s.label}`}>
            <Avatar index={i} status={a.status ?? "offline"} />
            <span className="px-card-text">
              <span className="px-card-name">{p.name}</span>
              <span className="px-card-role">{p.role}</span>
            </span>
            <span className="px-card-status" style={{ color: s.c }}>
              <span className={`px-dot ${BUSY.includes(a.status) ? "vo-pulse" : ""}`}
                style={{ background: s.c }} />
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
