# Clinic12 Web (Next.js frontend)

Frontend for the Clinic12 medication & patient management system. React 19 + Next.js 16 + Tailwind CSS, served over HTTPS by `server.js` on port **3001**.

## Running

From the repository root, start both backend and frontend with:

```bash
bash start-all.sh fg        # backend :8000 + frontend :3001, Tailscale funnel auto-start
bash start-all.sh status    # check service health
```

Or run the frontend directly:

```bash
node server.js              # HTTPS on :3001 (requires certs/ generated first)
```

## URLs

- App: `https://vps.tailb5775.ts.net/` (public, via Tailscale funnel) or `https://localhost:3001`
- Backend proxy: `/api/*` → Django `:8000`
- Dify proxy: `/dify/*`, `/chat/*`, `/socket.io/*` → `10.0.1.75:80`

## Development layout

- `app/` — Next.js App Router pages (dashboard, patients, medications, queue)
- `components/doctor/` — feature components incl. `dify-chat.tsx` (direct-API Dify client)
- `components/ui/` — shadcn-style UI primitives (button, card, input, textarea, ...)
- `server.js` — HTTPS origin + reverse proxy to Django and Dify

## Notes

- `next.config.ts` `allowedDevOrigins` must include `vps.tailb5775.ts.net` for dev HMR through the funnel.
- Dify blocking chat requests can take minutes (large table answers) — the proxy timeout is 420 s.