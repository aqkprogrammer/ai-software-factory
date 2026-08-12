"use client";

/** Live configuration, read from the backend rather than typed in twice. */
import { Check, X, Wifi, WifiOff } from "lucide-react";

import { C } from "../../lib/theme";
import { STAFF } from "../../lib/roster";

function Row({ k, v, tone }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "9px 0", fontSize: 12.5,
      borderBottom: `1px solid ${C.borderSoft}` }}>
      <span style={{ color: C.faint, flex: "0 0 190px" }}>{k}</span>
      <span className="vo-mono" style={{ color: tone ?? C.ink, overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}

export default function SettingsScreen({ health, apiUrl, connected, live, onToggleLive, runs }) {
  const keySet = health?.api_key_present;

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Settings</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>Configuration</div>
        <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
          Read from the running backend, not stored in the browser. Change these
          with environment variables and restart the server.
        </p>
      </div>

      <div className="vo-two-col">
        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 8 }}>Backend</div>
          <Row k="API" v={apiUrl ?? "not connected"} />
          <Row k="Connection" v={connected ? "connected" : "unreachable"}
            tone={connected ? "#22C55E" : "#EF4444"} />
          <Row k="Provider" v={health?.provider ?? "—"} />
          <Row k="Model" v={health?.model ?? "—"} />
          <Row k="Key" v={health ? (keySet ? `${health.api_key_env_var} is set` : `${health.api_key_env_var} not set`) : "—"}
            tone={health ? (keySet ? "#22C55E" : "#EAB308") : C.ink} />
          <Row k="Runs recorded" v={runs?.length ?? 0} />

          {health && !keySet && (
            <p style={{ fontSize: 11.5, color: "#EAB308", marginTop: 12, lineHeight: 1.6 }}>
              No key set, so real builds will fail with a clear error. Demo runs
              work regardless — they never call a model.
            </p>
          )}

          <div className="vo-eyebrow" style={{ margin: "18px 0 8px" }}>Change the provider</div>
          <pre className="vo-pre">{`export ANTHROPIC_API_KEY=sk-ant-...   # default
export OPENAI_API_KEY=sk-...          # or
export XAI_API_KEY=xai-...            # or

export AGENT_MODEL=claude-opus-5      # override the model
export AGENT_PROVIDER=openai          # force a provider`}</pre>
        </section>

        <section className="vo-card" style={{ padding: 16 }}>
          <div className="vo-eyebrow" style={{ marginBottom: 8 }}>This screen</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
            borderBottom: `1px solid ${C.borderSoft}` }}>
            {live ? <Wifi size={14} color="#22C55E" /> : <WifiOff size={14} color={C.faint} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5 }}>Data source</div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                {live ? "Real events from the backend" : "Simulation — nothing here is a real run"}
              </div>
            </div>
            <button className="vo-btn" style={{ marginLeft: "auto" }} onClick={onToggleLive}>
              {live ? "Use simulation" : "Use live data"}
            </button>
          </div>

          <Row k="Desks" v={`${STAFF.length} total`} />
          <Row k="Implemented agents" v="4 — planner, coder, tester, reviewer" />
          <Row k="Reduced motion" v="follows your OS setting" />

          <div className="vo-eyebrow" style={{ margin: "18px 0 8px" }}>What is not configurable here</div>
          {[
            ["Auth", "The API has none. Do not expose the port."],
            ["Concurrency", "One run at a time, enforced by a lock in the server."],
            ["Storage", "SQLite next to the backend. Delete agency.db to reset history."],
            ["Workspace", "Set per run in the request body, not globally."],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "8px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
              <div style={{ fontSize: 12.5 }}>{k}</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3, lineHeight: 1.5 }}>{v}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
