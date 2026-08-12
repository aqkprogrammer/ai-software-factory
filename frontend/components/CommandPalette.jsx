"use client";

/**
 * ⌘K. The top bar advertised this long before it existed.
 *
 * Commands are built from live state — every desk, every screen, every pending
 * approval — so the palette can't list something that isn't there.
 */
import { useState, useEffect, useMemo, useRef } from "react";

import { C } from "../lib/theme";
import { STAFF } from "../lib/roster";

export default function CommandPalette({ open, onClose, nav, onRoute, onSelectAgent,
                                         approvals, onStartDemo, onToggleLive, live }) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const commands = useMemo(() => {
    const out = [];
    nav.forEach((n) => out.push({
      id: `go:${n.id}`, group: "Go to", label: n.label,
      hint: n.ready ? "" : "not built yet",
      run: () => onRoute(n.id),
    }));
    STAFF.forEach((p) => out.push({
      id: `agent:${p.id}`, group: "Agents", label: `${p.name} — ${p.role}`,
      hint: p.live ? "live" : "empty desk",
      run: () => { onSelectAgent(p.id); onRoute("office"); },
    }));
    Object.values(approvals || {}).filter((a) => a.status === "pending").forEach((a) => out.push({
      id: `ap:${a.id}`, group: "Approvals", label: a.title || a.id, hint: "pending",
      run: () => onRoute("approvals"),
    }));
    out.push({ id: "run:demo", group: "Actions", label: "Start a demo run",
               hint: "no API key needed", run: onStartDemo });
    out.push({ id: "toggle:live", group: "Actions",
               label: live ? "Switch to simulated data" : "Switch to live backend data",
               run: onToggleLive });
    return out;
  }, [nav, approvals, onRoute, onSelectAgent, onStartDemo, onToggleLive, live]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.slice(0, 12);
    return commands
      .filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [q, commands]);

  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => {
    if (open) { setQ(""); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  /*  Navigation keys are bound to the window rather than the input. Binding
      them to the input means a stray click on the list — or any other focus
      change — silently kills the keyboard, which is exactly when you most
      want it to keep working.                                              */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setCursor((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const c = results[cursor];
        if (c) { c.run?.(); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, cursor, onClose]);

  if (!open) return null;

  const fire = (c) => { c?.run?.(); onClose(); };

  return (
    <div className="vo-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="vo-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="vo-palette-input"
          placeholder="Jump to a screen, an agent, or an action…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="vo-palette-list">
          {results.length === 0 && (
            <div style={{ padding: "14px 16px", fontSize: 12.5, color: C.faint }}>Nothing matches.</div>
          )}
          {results.map((c, i) => (
            <button key={c.id} className="vo-palette-row" data-on={i === cursor}
              onMouseEnter={() => setCursor(i)} onClick={() => fire(c)}>
              <span className="vo-eyebrow" style={{ fontSize: 9, width: 62, flexShrink: 0 }}>{c.group}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{c.label}</span>
              {c.hint && <span style={{ fontSize: 10.5, color: C.faint }}>{c.hint}</span>}
            </button>
          ))}
        </div>
        <div className="vo-palette-foot vo-mono">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
