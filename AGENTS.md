# AGENTS.md

## Project Snapshot

- App name: `troth`
- Stack: SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS 4, Bits UI, shadcn-svelte primitives
- Package manager: `pnpm`
- Purpose: a focused personal task client for Vikunja with simple, predictable views like Today, Inbox, Upcoming, All Active, and Completed

## Working Agreement

- Keep changes small, local, and easy to reason about.
- Prefer extending the existing architecture over introducing new abstractions.
- Preserve the app's current feel: calm, lightweight, and intentionally simple rather than overly feature-dense.
- Avoid pulling raw API logic into routes or components when it belongs in the Vikunja API layer or stores.

## Useful Commands

- Install deps: `pnpm install`
- Start dev server: `pnpm dev`
- Type and Svelte checks: `pnpm check`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Build: `pnpm build`

## Architecture Notes

### API layer

- Vikunja access is centralized in `src/lib/api/vikunja/`.
- `client.ts` handles request details and endpoint wrappers.
- `mappers.ts` converts Vikunja payloads into flatter app-facing types.
- Components should consume app models and store methods, not raw API responses.

### State

- App state lives in small Svelte stores under `src/lib/stores/`.
- `connection.ts` owns persisted Vikunja credentials and validation.
- `lists.ts` owns project loading and refresh.
- `tasks.ts` owns task loading, mutations, and optimistic updates.

### Task UI

- Route-facing task screens should stay thin.
- `src/lib/components/tasks/TaskPage.svelte` coordinates view state and composition.
- Task-specific UI belongs in `src/lib/components/tasks/`.
- Route-specific filtering and due-date formatting logic belong in `src/lib/tasks/view.ts`.

## File Placement

- Put reusable feature components in `src/lib/components/`.
- Put UI primitives and wrappers in `src/lib/components/ui/`.
- Put route files in `src/routes/`.
- Put shared low-level helpers in `src/lib/utils/`.
- Put short design or architecture notes in `docs/`.

## UI Conventions

- Reuse the existing shadcn-svelte and Bits UI wrappers before adding new primitives.
- Prefer updating shared UI primitives only when the change genuinely benefits every consumer.
- For one-off presentation changes, keep styling local to the feature component.
- Match the current design language: soft surfaces, subtle borders, rounded corners, and restrained motion.

## Data And Behavior Rules

- `Today` shows incomplete tasks due today or earlier.
- `Inbox` shows incomplete tasks in the project named `Inbox`.
- `Upcoming` shows incomplete tasks due after today.
- `All Active` shows every incomplete task.
- `Completed` shows completed tasks.

If behavior changes touch these rules, update `docs/architecture.md` too.

## Change Guidelines

- Prefer typed app-facing models over passing raw backend shapes through the UI.
- Keep optimistic update behavior intact when changing task mutations.
- Avoid broad refactors unless they clearly reduce complexity for the current feature.
- When editing shared components, quickly check for other consumers before changing defaults.

## Validation Expectations

- Run `pnpm check` after code changes.
- Run `pnpm lint` when touching multiple files or shared patterns.
- If you change formatting-sensitive Svelte or Tailwind-heavy files, run `pnpm format`.

## Documentation Hygiene

- Update docs when changing architecture, task-view rules, or setup expectations.
- Prefer concise documentation with concrete paths and commands over long prose.
