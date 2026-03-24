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
