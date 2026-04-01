# Setup

## Installed

- SvelteKit with the minimal template and TypeScript
- Tailwind CSS via the official Svelte CLI add-on
- `shadcn-svelte` with the `nova` style preset and stone base color
- `eslint` and `prettier` for a lean baseline of linting and formatting
- `shadcn-svelte` support dependencies added by the CLI:
  `@fontsource-variable/inter`, `@lucide/svelte`, `clsx`, `tailwind-merge`,
  `tailwind-variants`, and `tw-animate-css`

## Commands used

```bash
npx sv create . --template minimal --types ts --add eslint prettier tailwindcss="plugins:none" --install pnpm --no-dir-check --no-download-check
npx shadcn-svelte@latest init --cwd . --skip-preflight --overwrite --preset aIRvSC --css src/routes/layout.css --components-alias '$lib/components' --ui-alias '$lib/components/ui' --utils-alias '$lib/utils' --lib-alias '$lib' --hooks-alias '$lib/hooks'
npx shadcn-svelte@latest add button --yes
pnpm run check
pnpm run lint
pnpm run dev -- --host 127.0.0.1
```

## Run the app

```bash
pnpm install
pnpm run dev
```

Open the local URL shown in the terminal, usually `http://localhost:5173/`.

## Test on iPhone over your LAN

```bash
pnpm run dev:lan
```

Open the `http://YOUR-HOST:5173/` URL from Safari on the same Wi-Fi network.

Troth now includes a manifest, install icons, and a service worker. Safari on
iPhone still requires a secure context for service-worker-backed behavior, so a
plain LAN `http://` URL is useful for layout and install checks, but not for
fully validating offline caching.
