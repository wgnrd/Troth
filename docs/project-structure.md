# Project Structure

```text
docs/
src/
  lib/
    api/
    assets/
    components/
      ui/
    hooks/
    stores/
    types/
    utils/
  routes/
  app.d.ts
  app.html
static/
```

## Folder purposes

- `docs/`: short project notes for setup and structure.
- `src/lib/api/`: future API-layer helpers and request code.
- `src/lib/assets/`: static app assets imported through Svelte.
- `src/lib/components/`: shared Svelte components for the app shell and features.
- `src/lib/components/filters/`: saved-filter browser, editor, and task pages.
- `src/lib/components/ui/`: `shadcn-svelte` UI primitives and related wrappers.
- `src/lib/hooks/`: reserved for framework-level hooks or helper adapters if needed later.
- `src/lib/stores/`: app-level Svelte stores when state becomes necessary.
- `src/lib/types/`: shared TypeScript types and interfaces.
- `src/lib/utils/`: low-level reusable utilities such as class merging helpers.
- `src/routes/`: SvelteKit layouts, pages, and route files.
- `static/`: files served directly without bundling.
