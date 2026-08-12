"use client";

/**
 * What the agents touched.
 *
 * The backend streams the path with every file event, so this is a real index
 * of the run's filesystem activity. It is not a file browser: the API does not
 * serve file contents, so the right pane shows the event history for a path
 * rather than pretending to show a diff.
 */
import { useState } from "react";
import { FileCode2, FilePlus2, Eye } from "lucide-react";

import { C, CAT_COLOR } from "../../lib/theme";
import { byId } from "../../lib/roster";
import { useFiles } from "../../lib/derive";

const ICON = { file_created: FilePlus2, file_modified: FileCode2, file_read: Eye };

export default function CodeScreen({ feed, onSelectAgent }) {
  const files = useFiles(feed);
  const [selected, setSelected] = useState(null);
  const current = files.find((f) => f.path === selected) ?? files[0];
  const history = current ? feed.filter((e) => e.path === current.path) : [];

  return (
    <div className="vo-screen">
      <div style={{ marginBottom: 14 }}>
        <div className="vo-eyebrow">Code</div>
        <div className="vo-h" style={{ fontSize: 16, marginTop: 3 }}>
          {files.length ? `${files.length} files touched this run` : "Nothing touched yet"}
        </div>
        {!files.length && (
          <p style={{ fontSize: 12.5, color: C.faint, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }}>
            File activity is derived from the event stream. Start a run and every
            read, write and edit lands here as it happens.
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="vo-two-col">
          <section className="vo-card" style={{ padding: 16 }}>
            <div className="vo-eyebrow" style={{ marginBottom: 10 }}>Files</div>
            {files.map((f) => {
              const Icon = ICON[f.lastType] ?? FileCode2;
              const on = current?.path === f.path;
              return (
                <button key={f.path} className="vo-row" data-on={on}
                  onClick={() => setSelected(f.path)}>
                  <Icon size={13} color={f.writes ? "#22C55E" : C.faint} style={{ flexShrink: 0 }} />
                  <span className="vo-mono" style={{ fontSize: 12, flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: on ? C.ink : C.dim }}>
                    {f.path}
                  </span>
                  {f.created && <span className="vo-tag" style={{ color: "#22C55E", borderColor: "#22C55E44", flexShrink: 0 }}>new</span>}
                  <span className="vo-mono" style={{ fontSize: 10.5, color: C.faint,
                    whiteSpace: "nowrap", flexShrink: 0, paddingRight: 2 }}>
                    {f.writes}w · {f.reads}r
                  </span>
                </button>
              );
            })}
          </section>

          <section className="vo-card" style={{ padding: 16 }}>
            <div className="vo-eyebrow">Selected</div>
            <div className="vo-mono" style={{ fontSize: 13, margin: "5px 0 4px", overflowWrap: "anywhere" }}>
              {current?.path}
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 14 }}>
              {current?.writes} writes · {current?.reads} reads · touched by{" "}
              {[...(current?.agents ?? [])].map((id) => byId[id]?.name ?? id).join(", ")}
            </div>

            <div className="vo-eyebrow" style={{ marginBottom: 8 }}>History</div>
            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {history.map((e) => (
                <button key={e.id} className="vo-evt" onClick={() => onSelectAgent(e.agentId)}>
                  <span className="vo-mono" style={{ fontSize: 10, color: C.faint, flex: "0 0 54px" }}>{e.ts}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, color: C.ink }}>{byId[e.agentId]?.name ?? e.agentId}</span>
                    <span style={{ display: "block", fontSize: 12, marginTop: 1,
                      color: CAT_COLOR[e.cat] ?? C.dim }}>{e.message}</span>
                  </span>
                </button>
              ))}
            </div>

            <p style={{ fontSize: 11, color: C.faint, marginTop: 14, lineHeight: 1.6 }}>
              File contents aren&apos;t served by the API yet, so there is no diff
              viewer here. The workspace is on disk —
              <span className="vo-mono"> backend/workspace/</span>.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
