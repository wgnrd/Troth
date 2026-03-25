# Deployment

Troth is currently best deployed as an internal-only web app.

The app talks directly from the browser to the Vikunja API and stores the
personal API token in browser local storage. That makes it a good fit for a
private network, VPN, or Tailscale deployment, but not a public internet
deployment yet.

## Recommended topology

- Run Troth as a small Node container.
- Keep Troth and Vikunja reachable from the same private network.
- Publish Troth behind your existing reverse proxy on an internal hostname such
  as `troth.example.internal`.
- In Troth, enter either your Vikunja site URL or full API URL in Settings.

## Important networking note

Troth makes API requests from the browser to Vikunja.

That means one of these must be true:

- Vikunja allows the Troth origin via CORS.
- Your reverse proxy makes Vikunja available on a same-origin path that the
  browser can reach without cross-origin restrictions.
- You only access both apps in a setup where your browser can already reach the
  Vikunja origin directly.

If you see connection errors mentioning network access, HTML responses, or CORS,
double-check the Vikunja URL you entered and the reverse-proxy routing.

## Docker build

Build the image:

```bash
docker build -t troth .
```

Run it:

```bash
docker run -d \
  --name troth \
  -p 3000:3000 \
  --restart unless-stopped \
  troth
```

Then open `http://YOUR-HOST:3000`.

## Docker Compose

For a simple private deployment, use the checked-in compose file:

```bash
docker compose up -d --build
```

This starts Troth on port `3000` on the host.

To stop it:

```bash
docker compose down
```

To rebuild after changes:

```bash
docker compose up -d --build
```

## Reverse proxy

Put your proxy in front of the container and forward traffic to port `3000`.

Examples:

- Nginx Proxy Manager: proxy host to `http://troth:3000` if the proxy is on the same
  Docker network, or `http://YOUR-HOST:3000` if it runs outside Docker
- Caddy: reverse proxy to `troth:3000`
- Traefik: route the internal hostname to the Troth container

## First-run setup

1. Open Troth.
2. Go to Settings.
3. Paste your Vikunja base URL, for example `https://vikunja.example.com`.
4. Paste a Vikunja personal API token.
5. Save the connection.

Troth will normalize the URL to `/api/v1` automatically.

If your Vikunja instance is only reachable on your LAN, VPN, or Tailscale, open
Troth from a browser that can also reach that Vikunja URL.

## Updating

After pulling new code, rebuild and restart the container:

```bash
docker build -t troth .
docker rm -f troth
docker run -d \
  --name troth \
  -p 3000:3000 \
  --restart unless-stopped \
  troth
```

Or, if you use compose:

```bash
docker compose up -d --build
```
