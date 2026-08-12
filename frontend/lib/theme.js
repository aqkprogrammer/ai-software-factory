/** Design tokens. One source, so a screen can't drift from the office. */

export const C = {
  bg: "#080D19",
  floor: "#0F1830",
  panel: "rgba(19,28,49,0.72)",
  panelSolid: "#131C31",
  raise: "#1B2540",
  border: "#22304F",
  borderSoft: "#1A2440",
  ink: "#E6ECF8",
  dim: "#8C9CBF",
  faint: "#5A6889",
  accent: "#6366F1",
  cyan: "#06B6D4",
};

export const STATUS = {
  working:   { c: "#22C55E", label: "Working" },
  thinking:  { c: "#3B82F6", label: "Thinking" },
  reviewing: { c: "#A855F7", label: "Reviewing" },
  waiting:   { c: "#EAB308", label: "Waiting" },
  blocked:   { c: "#F97316", label: "Blocked" },
  error:     { c: "#EF4444", label: "Error" },
  offline:   { c: "#64748B", label: "Offline" },
};

export const BUSY = ["working", "thinking", "reviewing"];

export const CAT_COLOR = {
  error: "#EF4444",
  test: "#22C55E",
  git: "#A855F7",
  deployment: "#06B6D4",
  code: C.dim,
  agent: C.dim,
};

export const TASK_COLUMNS = [
  { id: "backlog",   label: "Backlog",   c: C.faint },
  { id: "ready",     label: "Ready",     c: "#3B82F6" },
  { id: "running",   label: "Running",   c: "#22C55E" },
  { id: "review",    label: "Review",    c: "#A855F7" },
  { id: "blocked",   label: "Blocked",   c: "#F97316" },
  { id: "completed", label: "Completed", c: C.dim },
];

/** 12345 -> "12.3k". Keeps metric tiles from wrapping. */
export const compact = (n) => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(n));
};

export const clock = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime())
    ? "--:--:--"
    : d.toLocaleTimeString("en-GB", { hour12: false });
};
