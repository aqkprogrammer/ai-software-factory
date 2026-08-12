"use client";

/**
 * The office floor: an isometric SVG scene.
 *
 * Projection is one line — `iso()` below. Everything else is polygons stacked
 * in painter's order, sorted back-to-front by (gx + gy) so near desks overlap
 * far ones. No canvas, no 3D library, no game engine.
 *
 * Motion is CSS keyframes (see globals.css) and communicates state: a desk
 * bobs while its agent is typing, the monitor pulses, a ping ripples outward
 * when an event lands. Everything stops under prefers-reduced-motion.
 */
import { useMemo } from "react";

import { C, STATUS, BUSY } from "../../lib/theme";
import { ROOMS, STAFF } from "../../lib/roster";

const TW = 46, TH = 23; // tile half-width / half-height
const iso = (gx, gy) => ({ x: (gx - gy) * TW, y: (gx + gy) * TH });

function RoomPlate({ room, active }) {
  const a = iso(room.gx, room.gy);
  const b = iso(room.gx + room.w, room.gy);
  const c = iso(room.gx + room.w, room.gy + room.h);
  const d = iso(room.gx, room.gy + room.h);
  const pts = `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
  const label = iso(room.gx + 0.35, room.gy + 0.35);
  return (
    <g>
      <polygon points={pts} fill={C.floor} stroke={C.border} strokeWidth="1" />
      <polygon points={pts} fill={room.tint} opacity={active ? 0.22 : 0.12}
        style={{ transition: "opacity 400ms ease" }} />
      <text x={label.x} y={label.y + 14} fill={C.faint} fontSize="10"
        fontFamily="'JetBrains Mono', monospace" letterSpacing="1.4">
        {room.label.toUpperCase()}
      </text>
    </g>
  );
}

/** Isometric box: top face + left face + right face. */
function IsoBox({ gx, gy, w, d, h, top, left, right, opacity = 1 }) {
  const p = (x, y, z = 0) => { const s = iso(x, y); return `${s.x},${s.y - z}`; };
  return (
    <g opacity={opacity}>
      <polygon points={`${p(gx, gy, h)} ${p(gx + w, gy, h)} ${p(gx + w, gy + d, h)} ${p(gx, gy + d, h)}`} fill={top} />
      <polygon points={`${p(gx, gy + d, h)} ${p(gx + w, gy + d, h)} ${p(gx + w, gy + d, 0)} ${p(gx, gy + d, 0)}`} fill={right} />
      <polygon points={`${p(gx, gy, h)} ${p(gx, gy + d, h)} ${p(gx, gy + d, 0)} ${p(gx, gy, 0)}`} fill={left} />
    </g>
  );
}

function Workstation({ person, state, selected, onSelect, ping }) {
  const s = STATUS[state.status] ?? STATUS.offline;
  const base = iso(person.gx + 0.9, person.gy + 0.9);
  const busy = BUSY.includes(state.status);

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onSelect(person.id)}
      className="vo-station" tabIndex={0} role="button"
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(person.id); }}
      aria-label={`${person.name}, ${person.role}, ${s.label}`}>

      {selected && (
        <ellipse cx={base.x} cy={base.y + 6} rx="52" ry="26" fill="none"
          stroke={C.accent} strokeWidth="1.5" strokeDasharray="4 4" className="vo-rotate"
          style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />
      )}

      {/* the office reacting to the feed */}
      {ping > 0 && (
        <ellipse key={ping} cx={base.x} cy={base.y + 6} rx="30" ry="15" fill="none"
          stroke={s.c} strokeWidth="1.5" className="vo-ping"
          style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />
      )}

      <ellipse cx={base.x} cy={base.y + 6} rx="34" ry="17" fill={s.c} opacity={busy ? 0.14 : 0.07}
        className={busy ? "vo-wash" : ""} style={{ transformOrigin: `${base.x}px ${base.y + 6}px` }} />

      <IsoBox gx={person.gx} gy={person.gy} w={1.8} d={1.1} h={16}
        top="#1C2745" left="#141C33" right="#18213C" />

      <g>
        <IsoBox gx={person.gx + 0.35} gy={person.gy + 0.1} w={1.1} d={0.12} h={44}
          top="#243156" left="#1A2340" right="#1E2947" />
        <polygon
          points={(() => {
            const a = iso(person.gx + 0.4, person.gy + 0.2), b = iso(person.gx + 1.45, person.gy + 0.2);
            return `${a.x},${a.y - 42} ${b.x},${b.y - 42} ${b.x},${b.y - 20} ${a.x},${a.y - 20}`;
          })()}
          fill={s.c} opacity={busy ? 0.75 : 0.28}
          className={state.status === "working" ? "vo-monitor" : ""} />
      </g>

      <g transform={`translate(${base.x}, ${base.y})`}>
        {!person.standing && (
          <path d="M-13 4 q0 -13 13 -13 q13 0 13 13 z" fill="#141C33" opacity="0.9" />
        )}
        <g className={state.status === "working" ? "vo-type" : busy ? "vo-breathe" : ""}
          style={{ transformOrigin: "0px 0px" }}>
          <path d="M-11 2 q0 -16 11 -16 q11 0 11 16 z" fill={C.raise} stroke={s.c} strokeWidth="1.2" strokeOpacity="0.55" />
          <circle cx="0" cy="-22" r="7.5" fill="#2A3758" stroke={s.c} strokeWidth="1.2" strokeOpacity="0.55" />
          <circle cx="0" cy="-24" r="3" fill={s.c} opacity="0.55" />
        </g>

        <g transform="translate(0,-46)">
          <circle r="4.5" fill={s.c} className={busy ? "vo-pulse" : ""} />
          <circle r="4.5" fill="none" stroke={s.c} strokeWidth="1" opacity="0.4"
            className={busy ? "vo-halo" : ""} style={{ transformOrigin: "0px 0px" }} />
        </g>

        <g transform="translate(0,22)" className="vo-plate">
          <rect x="-42" y="-9" width="84" height="18" rx="9" fill="rgba(8,13,25,0.85)" stroke={C.border} strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill={C.dim} fontSize="9.5"
            fontFamily="'JetBrains Mono', monospace">{person.name}</text>
        </g>
      </g>
    </g>
  );
}

export default function Floor({ agents, selected, onSelect, zoom = false }) {
  const activeRooms = useMemo(() => {
    const set = new Set();
    STAFF.forEach((p) => { if (BUSY.includes(agents[p.id]?.status)) set.add(p.room); });
    return set;
  }, [agents]);

  /*  Camera. Zooming is a transform on the whole scene, not a viewBox change,
      so it animates in CSS instead of needing a tween loop. The target is the
      selected desk, pulled to the centre of the frame.                      */
  const focus = STAFF.find((p) => p.id === selected);
  const target = focus ? iso(focus.gx + 0.9, focus.gy + 0.9) : { x: 0, y: 0 };
  const k = zoom ? 1.9 : 1;
  const camera = zoom
    ? `translate(${-target.x * k}px, ${-target.y * k + 130}px) scale(${k})`
    : "translate(0px, 0px) scale(1)";

  return (
    <svg viewBox="-620 -90 1240 700" className="vo-floor"
      role="group" aria-label="Isometric office floor plan">
      <defs>
        <radialGradient id="voGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#080D19" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-620" y="-90" width="1240" height="700" fill="url(#voGlow)" />

      <g style={{ transform: camera, transition: "transform 700ms cubic-bezier(.22,1,.36,1)" }}>
        {ROOMS.map((r) => <RoomPlate key={r.id} room={r} active={activeRooms.has(r.id)} />)}
        {[...STAFF].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy)).map((p) => (
          <Workstation key={p.id} person={p} state={agents[p.id] ?? { status: "offline", ping: 0 }}
            selected={p.id === selected} onSelect={onSelect}
            ping={agents[p.id]?.ping ?? 0} />
        ))}
      </g>
    </svg>
  );
}
