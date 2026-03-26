# Architecture

## API layer

Vikunja access is centralized under `src/lib/api/vikunja/`.

- `client.ts` owns base URL normalization, bearer-token headers, pagination, and the wrapped endpoints.
- `types.ts` keeps the raw Vikunja response shapes and the smaller app-facing task/list types in one place.
- `mappers.ts` converts Vikunja task and project payloads into the flatter types the UI uses.
- `index.ts` is the public entry point for the rest of the app.

The goal for this slice is to keep raw `fetch` usage out of routes and components. Components only deal with typed app models plus store methods.

## Stores

The app uses small Svelte stores instead of a larger query or state library.

- `src/lib/stores/connection.ts` persists the Vikunja base URL and API token in browser local storage, validates input, and checks the connection before saving it.
- `src/lib/stores/lists.ts` loads and refreshes Vikunja projects, then exposes them as app lists.
- `src/lib/stores/tasks.ts` loads and refreshes tasks, and handles create, update, and complete/reopen writes with lightweight optimistic updates.

Both the task and list stores reset themselves when the saved Vikunja connection changes so stale data does not linger across reconnects. Refresh failures now keep the last successful data in place and surface the error inline so the MVP stays usable during temporary API issues.

## Task UI composition

The first real task workflow lives in `src/lib/components/tasks/`.

- `TaskPage.svelte` is the thin route-facing wrapper. It loads data, selects the route-specific slice, and coordinates quick add plus editing.
- `QuickAdd.svelte` handles title-first creation with a project picker when needed.
- `TaskList.svelte` and `TaskRow.svelte` render the task collection and the per-task complete/open interactions.
- `TaskEditor.svelte` is the first detail surface for editing title, notes, due date, priority, and project.
- `TaskListSkeleton.svelte` provides the subtle loading shell used across task views.

Route-specific filtering lives in `src/lib/tasks/view.ts`. That file owns the readable helpers for Today, Inbox, Upcoming, All Active, and Completed so the classification rules stay out of the route components.

## MVP behavior rules

- `Today` shows incomplete tasks due today or earlier.
- `Inbox` shows incomplete tasks in the project named `Inbox`.
- `Upcoming` shows incomplete tasks due after today.
- `All Active` shows every incomplete task.
- `Completed` shows completed tasks.
- Subtasks are stored as normal Vikunja tasks linked by a parent-task relation.
- Main task lists stay flat and show only top-level tasks.
- Parent rows show subtask progress like `2 of 5 done` when subtasks exist.
- Subtasks are managed primarily from the parent task editor and inherit only the parent project by default.

These rules are intentionally simple. Troth does not try to mirror every Vikunja view; it keeps a small personal workflow with predictable overlaps between views.
