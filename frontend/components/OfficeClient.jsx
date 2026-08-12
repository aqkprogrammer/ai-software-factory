"use client";

import dynamic from "next/dynamic";

/*  The app is a live view of a running system: sockets, timers, clocks.
    None of that has a meaningful server render, and pre-rendering it only
    creates hydration mismatches between the HTML built at request time and
    the first client paint. So it loads on the client, and the shell below is
    what you see for the few hundred ms before it does.                      */
const Shell = dynamic(() => import("./Shell"), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center",
      background: "#080D19", color: "#5A6889",
      font: "13px 'JetBrains Mono', ui-monospace, monospace", letterSpacing: ".08em",
    }}>
      OPENING THE OFFICE…
    </div>
  ),
});

export default function OfficeClient({ apiUrl }) {
  return <Shell apiUrl={apiUrl} />;
}
