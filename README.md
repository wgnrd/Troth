<p align="center">
  <img src="static/logo.png" alt="Troth logo" width="96" height="96">
</p>

# Troth

Troth is a focused personal task client for [Vikunja](https://vikunja.io/) for people who want a calmer, faster, more opinionated daily workflow.

It keeps the interface small and predictable around a few core views: Today, Inbox, Upcoming, All Active, Completed, projects, and saved filters.

## Why Troth

- Built for people who already like Vikunja but want a more focused personal client
- Keeps the UI intentionally small instead of exposing every backend concept everywhere
- Routes all browser writes and reads through same-origin server endpoints
- Stores Vikunja credentials in an HTTP-only encrypted server session
- Adds lightweight calendar context without turning the app into a full calendar clone

## Stack

- SvelteKit 2
- Svelte 5
- TypeScript
- Tailwind CSS 4
- Bits UI and shadcn-svelte primitives
- `pnpm`

## What Troth Does

- Connects to an existing Vikunja instance with a personal API token
- Stores the normalized Vikunja base URL and token in an HTTP-only server session
- Proxies browser requests through Troth’s own `/api/*` routes instead of calling Vikunja directly from the browser
- Keeps task and project views intentionally simple rather than exposing all of Vikunja

## Quick Start

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite, connect your Vikunja instance in Settings, and start working.

## Requirements

- Node.js 22 or newer
- `pnpm`
- A running Vikunja instance
- A Vikunja personal API token

Troth uses [Vikunja](https://vikunja.io/) as its task backend.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Expose the dev server on your local network:

```bash
pnpm dev:lan
```

On iPhone, open the LAN URL shown in the terminal, such as
`http://YOUR-HOST:5173/`.

The app shell, manifest, and service worker are now wired up, but Safari only
treats service workers as fully active in a secure context. `localhost` counts;
a plain LAN `http://` address does not. That means layout and install metadata
are easy to test on your phone over the local network, while offline caching and
full PWA behavior still need HTTPS.

Run checks:

```bash
pnpm check
pnpm lint
```

Format files:

```bash
pnpm format
```

## Build And Run

Create a production build:

```bash
pnpm build
```

Run the built app:

```bash
node build
```

By default Troth listens on port `3000`.

## Docker

Build the image:

```bash
docker build -t troth .
```

Run it:

```bash
docker run -d \
  --name troth \
  -p 3000:3000 \
  -e TROTH_SESSION_SECRET="replace-with-a-long-random-secret" \
  troth
```

Important environment variables:

- `TROTH_SESSION_SECRET`: required outside local development; used to encrypt the Vikunja session cookie
- `TROTH_SESSION_SECURE`: set to `false` only if you intentionally run Troth over plain HTTP on a trusted LAN
- `TROTH_BUILD_REF`: optional build label shown in the Settings page, for example a git hash or deployment tag
- `HOST`: defaults to `0.0.0.0` in the runtime image
- `PORT`: defaults to `3000` in the runtime image
- `ORIGIN`: set this to the public Troth URL when deploying behind a fixed hostname

## First-Run Setup

1. Open Troth in the browser.
2. Go to Settings.
3. Enter your Vikunja URL.
4. Paste a Vikunja personal API token.
5. Save the connection.

Troth accepts either:

- a site URL such as `https://vikunja.example.com`
- or a full API URL such as `https://vikunja.example.com/api/v1`

Troth normalizes the URL to `/api/v1` automatically.

## Using Troth With Dockerized Vikunja

If Troth and Vikunja run on the same Docker network, the Vikunja URL entered in Troth Settings can be an internal container address such as:

```text
http://vikunja:3456
```

That works because Troth talks to Vikunja from the server side. The browser does not need direct access to the Vikunja container for normal task usage.

## Project Commands

- `pnpm dev`: start the dev server
- `pnpm dev:lan`: start the dev server on `0.0.0.0` for phone testing
- `pnpm build`: create the production build
- `pnpm preview:lan`: preview the built app on `0.0.0.0`
- `pnpm check`: run Svelte and TypeScript checks
- `pnpm lint`: run Prettier and ESLint
- `pnpm format`: format the codebase

## Docs

- [docs/architecture.md](docs/architecture.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/setup.md](docs/setup.md)
- [docs/api-notes.md](docs/api-notes.md)
