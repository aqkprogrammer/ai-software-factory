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
| `components/OfficeClient.jsx` | Loads the office client-side only — it's a live view, there is nothing to server-render. |
| `components/VirtualOffice.jsx` | The office: SVG floor plan, employee panel, activity feed, and the mock engine. |
| `lib/useRealtime.js` | Snapshot from `/state`, then live over `/stream`, with reconnect. |
| `lib/types.ts` | The event and entity contract. Mirror it when you add a backend field. |

## Two data sources

The office runs the mock engine and the socket at the same time and shows one
of them. It switches to live as soon as the socket connects; the toggle in the
top bar switches back. With no backend running you still get a populated
screen — a dropped connection should never look like an idle team.

Live mode is honest about scope: four desks (Atlas, Forge, Sieve, Lens) light
up because four agents exist. The other eight sit `offline` until you build
them.

## Not built yet

Every sidebar item other than **Office** is a placeholder. The office and the
event model came first because they set the contract the other screens read
from.
