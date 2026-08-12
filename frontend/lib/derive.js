/**
 * Projections over the event feed.
 *
 * The backend stores events, not entities — there is no "files" table and no
 * "test runs" table. Everything the code, testing, analytics and cost screens
 * show is folded out of the same stream here, so those screens can never
 * disagree with the activity log they were derived from.
 */
import { useMemo } from "react";

const WRITE = new Set(["file_created", "file_modified"]);
const READ = new Set(["file_read", "search_performed"]);

/** Files this run touched, most recently touched first. */
export function useFiles(feed) {
  return useMemo(() => {
    const byPath = new Map();
    // oldest first, so `last*` ends up holding the newest
    [...feed].reverse().forEach((e) => {
      const path = e.path;
      if (!path || (!WRITE.has(e.type) && !READ.has(e.type))) return;
      const cur = byPath.get(path) ?? {
        path, reads: 0, writes: 0, created: false,
        agents: new Set(), lastTs: e.ts, lastAgent: e.agentId, lastType: e.type,
      };
      if (WRITE.has(e.type)) cur.writes += 1; else cur.reads += 1;
      if (e.type === "file_created") cur.created = true;
      cur.agents.add(e.agentId);
      cur.lastTs = e.ts;
      cur.lastAgent = e.agentId;
      cur.lastType = e.type;
      byPath.set(path, cur);
    });
    return [...byPath.values()].sort((a, b) => (b.writes - a.writes) || a.path.localeCompare(b.path));
  }, [feed]);
}

/** Test executions, newest first. A start with no result is still running. */
export function useTestRuns(feed) {
  return useMemo(() => {
    const out = [];
    // oldest first so a result can attach to the start that preceded it
    [...feed].reverse().forEach((e) => {
      if (e.type === "test_started") {
        out.push({ id: e.id, agentId: e.agentId, ts: e.ts, command: e.path || e.message,
                   status: "running", passed: null, total: null });
        return;
      }
      if (e.type === "test_passed" || e.type === "test_failed") {
        const open = [...out].reverse().find((r) => r.agentId === e.agentId && r.status === "running");
        const rec = open ?? { id: e.id, agentId: e.agentId, ts: e.ts, command: "test suite",
                              status: "running", passed: null, total: null };
        rec.status = e.type === "test_passed" ? "passed" : "failed";
        rec.passed = e.passed ?? rec.passed;
        rec.total = e.total ?? rec.total;
        rec.finishedTs = e.ts;
        rec.message = e.message;
        if (!open) out.push(rec);
      }
    });
    return out.reverse();
  }, [feed]);
}

/** Counts for the analytics screen: over time, by agent, by tool, by category. */
export function useAnalytics(feed, agents) {
  return useMemo(() => {
    const byAgent = {}, byCategory = {}, byType = {};
    feed.forEach((e) => {
      byAgent[e.agentId] = (byAgent[e.agentId] || 0) + 1;
      byCategory[e.cat] = (byCategory[e.cat] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    const stamps = feed.map((e) => new Date(e.iso).getTime()).filter((t) => !Number.isNaN(t));
    const n = 48;
    const timeline = new Array(n).fill(0);
    if (stamps.length > 1) {
      const min = Math.min(...stamps), max = Math.max(...stamps);
      const span = Math.max(1, max - min);
      stamps.forEach((t) => { timeline[Math.min(n - 1, Math.floor(((t - min) / span) * n))] += 1; });
    }
    const spanSeconds = stamps.length > 1
      ? Math.round((Math.max(...stamps) - Math.min(...stamps)) / 1000) : 0;

    const tests = Object.values(agents).reduce(
      (acc, a) => ({ passed: acc.passed + (a.testsPassed || 0), total: acc.total + (a.testsTotal || 0) }),
      { passed: 0, total: 0 });

    return {
      byAgent, byCategory, byType, timeline, spanSeconds, tests,
      peak: Math.max(1, ...timeline),
      eventsPerMinute: spanSeconds ? (feed.length / (spanSeconds / 60)) : 0,
    };
  }, [feed, agents]);
}

/** Token spend per desk, and what it costs. */
export function useCosts(agents, pricePerMillion = 9) {
  return useMemo(() => {
    const rows = Object.entries(agents)
      .map(([id, a]) => ({ id, tokens: a.tokens || 0, toolCalls: a.toolCalls || 0,
                           cost: ((a.tokens || 0) / 1e6) * pricePerMillion }))
      .filter((r) => r.tokens > 0 || r.toolCalls > 0)
      .sort((a, b) => b.tokens - a.tokens);
    return {
      rows,
      tokens: rows.reduce((n, r) => n + r.tokens, 0),
      cost: rows.reduce((n, r) => n + r.cost, 0),
      toolCalls: rows.reduce((n, r) => n + r.toolCalls, 0),
    };
  }, [agents, pricePerMillion]);
}
