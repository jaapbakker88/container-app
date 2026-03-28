# BINMATE

Track and report the status of recycling bins in your neighbourhood.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run typecheck
npm test
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DB_PATH` | No | Path to the SQLite database file (default: `./data/app.db`) |
| `ADMIN_PASSWORD` | No | Password for the admin panel at `/admin`. Route returns 404 if unset. |
| `MAPS_KEY` | No | Google Maps API key for static map tiles. Falls back to OpenStreetMap if unset. |

Example `.env` for local development:

```
ADMIN_PASSWORD=secret
MAPS_KEY=your-google-maps-api-key
```

## Admin panel

Visit `/admin` and enter your `ADMIN_PASSWORD` to manage bins (mark full/empty, clear location, delete).

## Deployment

Hosted on a self-managed server via [Coolify](https://coolify.io) using the included `Dockerfile`. Set the environment variables above in your Coolify service configuration.
