"use client";

/**
 * The office as a sprite game.
 *
 * A 576x352 logical canvas scaled up with `image-rendering: pixelated`, redrawn
 * on a fixed 6fps beat — the low frame rate is the point, it's what makes the
 * typing bob and screen flicker read as animation frames rather than easing.
 *
 * State comes from the same event stream as every other screen: `agents` here
 * is exactly what the isometric floor renders.
 */
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

import { drawScene, hitTest, LOGICAL_W, LOGICAL_H } from "../../lib/pixel";

export default function PixelOffice({ agents, feed = [], selected, onSelect }) {
  /*  Whoever moved most recently gets a speech bubble — three at a time, so
      the floor looks busy without turning into a wall of text.            */
  const talking = useMemo(() => {
    const out = new Set();
    for (const e of feed) {
      out.add(e.agentId);
      if (out.size >= 3) break;
    }
    return out;
  }, [feed]);

  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  // Latest props without restarting the render loop on every event.
  const live = useRef({ agents, selected, hovered, talking });
  live.current = { agents, selected, hovered, talking };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return undefined;
    ctx.imageSmoothingEnabled = false;

    let raf = 0, last = 0, frame = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 160) return;          // ~6fps, on purpose
      last = now;
      frame += 1;
      drawScene(ctx, { ...live.current, frame });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** Screen pixels -> logical pixels, so hit testing survives any scale. */
  const toLogical = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * LOGICAL_W,
      y: ((e.clientY - r.top) / r.height) * LOGICAL_H,
    };
  }, []);

  return (
    <div className="px-stage" ref={boxRef}>
      <canvas
        ref={canvasRef}
        width={LOGICAL_W}
        height={LOGICAL_H}
        className="px-canvas"
        onMouseMove={(e) => { const p = toLogical(e); setHovered(hitTest(p.x, p.y)); }}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => { const p = toLogical(e); const id = hitTest(p.x, p.y); if (id) onSelect(id); }}
        style={{ cursor: hovered ? "pointer" : "default" }}
        role="img"
        aria-label="Pixel-art office floor. Each desk is an agent; click one to inspect it."
      />
    </div>
  );
}
