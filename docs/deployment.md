# Deployment

Troth now talks to Vikunja through its own SvelteKit server routes instead of
calling Vikunja directly from the browser.

That makes deployment much simpler:

- Troth only needs to reach Vikunja from the server/container network
- browsers only need to reach Troth itself
- core task and project flows no longer depend on browser-side CORS access to
  Vikunja

## Recommended topology

- Run Troth as a small Node container.
- Keep Troth able to reach Vikunja from the same Docker or private network.
- Publish Troth behind your reverse proxy on the hostname you want users to
  visit, such as `troth.example.internal`.
- In Troth, enter either your Vikunja site URL or full API URL in Settings.
- Set `TROTH_SESSION_SECRET` in the Troth container environment before
  publishing it beyond a local dev setup.

## Important networking note

Troth makes API requests from the server to Vikunja.

That means one of these must be true:

- the Troth container can reach the Vikunja base URL you enter in Settings
- or your reverse proxy/network routing makes the Vikunja URL reachable from the
  Troth server process

If you see connection errors mentioning network access or HTML responses,
double-check the Vikunja URL you entered and the reverse-proxy routing from the
Troth server/container.

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
  -e TROTH_SESSION_SECRET="replace-this-with-a-long-random-secret" \
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

Troth will normalize the URL to `/api/v1` automatically and store the token in
an encrypted HTTP-only session cookie.

If your Vikunja instance is only reachable on your LAN, VPN, or Tailscale, the
important requirement is that the Troth server/container can reach that URL.

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
