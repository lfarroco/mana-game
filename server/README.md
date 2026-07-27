# Mana Battle — Game Server

Authoritative multiplayer game server for Mana Battle.

## Quick Start

```bash
cd server
npm install
npm run dev        # http://127.0.0.1:8787
npm run test       # jest unit + integration tests
npm run typecheck  # tsc --noEmit
```

## API (v1, local-only)

All endpoints are under `/api/v1`. No auth required for local development.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check → `{ ok: true }` |
| POST | `/api/v1/sessions` | Create session → `SessionData` |
| GET | `/api/v1/sessions/current` | Get active session |
| POST | `/api/v1/sessions/current/actions` | Dispatch action → `{ session, combatState? }` |
| DELETE | `/api/v1/sessions/current` | Abandon run → 204 |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `MANA_SERVER_HOST` | `127.0.0.1` | Bind address |
| `MANA_SERVER_PORT` | `8787` | Bind port |
