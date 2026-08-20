# The office UI

Next.js app. The screen is an isometric floor plan where each AI agent is an
employee at a desk, and everything on it comes from events the backend emits.

```bash
npm install
npm run dev          # http://localhost:3000
```

Point it somewhere other than `http://localhost:8000`:

```bash
cp .env.local.example .env.local   # then edit NEXT_PUBLIC_API_URL
```

## Layout

| Path | What it is |
|---|---|
| `app/page.jsx` | Route. Passes the API URL in. |
| `components/OfficeClient.jsx` | Loads the app client-side only — it's a live view, there is nothing to server-render. |
| `components/Shell.jsx` | Sidebar, top bar, run bar, routing, ⌘K. |
| `components/office/Floor.jsx` | The isometric floor plan, including the camera. |
| `components/office/PixelOffice.jsx` | The pixel-art floor: one canvas, ~6fps, click-to-select. |
| `components/office/WorkerBar.jsx` | The roster strip under the pixel office. |
| `lib/pixel.js` | The sprite renderer — palette, 3x5 bitmap font, scene drawing. |
| `components/screens/` | Command center, workflow graph, task board, activity log, approvals. |
| `components/CommandPalette.jsx` | ⌘K. Commands are built from live state. |
| `lib/useRealtime.js` | Snapshot from `/state`, then live over `/stream`, with reconnect and dedupe. |
| `lib/mockEngine.js` | The simulation, for when the backend is down. |
| `lib/roster.js` / `lib/theme.js` | The desks and the design tokens. |
| `lib/types.ts` | The event and entity contract. Mirror it when you add a backend field. |

The screen lives in the URL (`?screen=workflow`), so a refresh keeps you where
you were and a link to a screen is one someone else can open.

## Two data sources

The office runs the mock engine and the socket at the same time and shows one
of them. It switches to live as soon as the socket connects; the toggle in the
top bar switches back. With no backend running you still get a populated
screen — a dropped connection should never look like an idle team.

Live mode is honest about scope: four desks (Atlas, Forge, Sieve, Lens) light
up because four agents exist. The other eight sit `offline` until you build
them.

## Not built yet

Projects, AI Employees, Code, Testing, Security, Deployments, Analytics, Costs
and Settings are placeholders — they say so rather than showing fake data.
