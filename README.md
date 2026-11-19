# Red Mini Bot

Red Mini is an Express dashboard and WhatsApp bot. The frontend and API run on the **same server**: the dashboard is at `/status`, the pairing form is at `/pair`, and service health is at `/api/status`.

## Requirements

- Node.js 22 or newer and npm.
- A Supabase project for storing WhatsApp credentials and settings.
- `ffmpeg` on the server's PATH if the sticker command is used.
- HTTPS and a private, access-controlled deployment. This bot stores sensitive WhatsApp session credentials.

## Setup

1. Run `npm ci`.
2. Run [`schema.sql`](schema.sql) in your Supabase SQL editor. The tables have row-level security enabled and the schema grants access only to the server role; do not add public policies for session credentials.
3. In Supabase, open **Settings → API Keys** and create/copy a server-only secret key beginning with `sb_secret_`. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and a strong random `DASHBOARD_TOKEN`. The app still accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` if your project has not created a secret key yet. The Supabase key must remain server-only. The dashboard token is required for pairing and reconnecting and must be shared only with trusted administrators. To generate one, run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Optionally set `OWNER_NUMBER` to an international phone number with digits only. Without it, instance-wide owner commands are disabled; the linked number still controls its own session. Set `OPENWEATHER_API_KEY` if using weather.
5. Start locally with `node --env-file=.env index.js`, or configure those environment variables in your hosting provider and run `npm start`. Visit `http://localhost:8002/status` (or the provider's HTTPS address). The application does not automatically load `.env` when using `npm start`.

Without Supabase or a dashboard token, the web service starts but pairing and session restoration are disabled. Use the same dashboard token in the pairing page and reconnect dialog. Never share pairing codes, the Supabase service-role key, or the token publicly.

`.play` and `.video` use the official YouTube Data API search and therefore require a server-only `YOUTUBE_API_KEY`. Create a YouTube Data API v3 key in Google Cloud, enable the YouTube Data API v3 for that project, and place the key only in the server environment. `.play song` returns Audio and Audio document buttons; `.playaudio <selection>` and `.playdoc <selection>` download the selected format. `.video name` searches YouTube and sends the selected video. Search is separate from media downloading, so the configured `MEDIA_DOWNLOAD_API_BASE` provider must also be reachable and compatible.

Themes are stored as JSON files in [`themes/`](themes). The default is `silva`; the built-in alternatives are `red`, `gold`, and `ocean`. The owner can run `.theme` to list themes and `.theme <name>` to switch the active response theme. All outgoing text and media captions are normalized through the compact RedDragon formatter to avoid long wrapping separators and overlapping lines. Theme changes are process-local and reset to `THEME` after a restart.

### Security and operational notes

- Session credentials and Signal keys are stored in Supabase. Protect backups and restrict database access. Do not run multiple server instances against the same session without implementing distributed locking: concurrent instances can overwrite credentials or defeat deletion safeguards.
- The previously committed weather API key was exposed in Git history. **Rotate or revoke it** with the provider and configure a new key via `OPENWEATHER_API_KEY`.
- Older versions wrote session files to system temporary directories named `session_<number>`. On a previous deployment, inspect these paths and securely remove them after confirming they are no longer needed; do not publish or commit them. Sessions created by older versions may need to be paired again because Signal keys were not fully backed up.
- Pairing attempts are limited in-process and require the dashboard token. Use additional network access controls and durable rate limiting for a public deployment.
- Third-party downloader and search commands depend on external services and may stop working or change independently. Verify them against your intended providers before relying on them.
- `npm audit` currently reports vulnerabilities in the existing Baileys fork and its transitive dependencies; review and remediate them before production. The project still uses the original third-party Baileys fork.

## HTTP endpoints

- `GET /status` — dashboard.
- `GET /pair` — pairing form.
- `GET /api/status` — web-service uptime, masked session identifiers and database health. `status: online` means the web service is running, not that a WhatsApp session is connected.
- `POST /code` — request a code with JSON `{ "number": "27634988678" }` and header `Authorization: Bearer <DASHBOARD_TOKEN>`. Responses may indicate `already_connected` or `connecting` instead of a code.
- `POST /code/connect-all` — ask the server to reconnect saved sessions, with the same authorization header. The response describes attempts, not confirmed connections.

## Verification

Run `npm run check` and `npm test`. Tests cover HTML parsing and inline JavaScript, HTTP routes, authorization, mocked pairing and reconnection, credential/key persistence, error propagation, and delayed-write revocation. They do not connect to a live Supabase project or WhatsApp account; a real-device pairing and restart test is still required after configuration.
