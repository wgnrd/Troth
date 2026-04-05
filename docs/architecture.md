# Architecture

## API layer

Vikunja access is split across a server-only boundary plus a small same-origin browser client.

- `src/lib/api/vikunja/client.ts` owns base URL normalization, bearer-token headers, pagination, and the wrapped endpoint logic against Vikunja itself.
- `types.ts` keeps the raw Vikunja response shapes and the smaller app-facing task/list types in one place.
- `mappers.ts` converts Vikunja task and project payloads into the flatter types the UI uses.
- `index.ts` is the public entry point for the rest of the app.
- `src/lib/server/session.ts` owns the encrypted HTTP-only session cookie that stores the normalized Vikunja base URL plus API token on the server boundary.
- `src/lib/server/session.ts` also stores the optional encrypted HTTP-only ICS calendar feed session used for read-only event previews.
- `src/lib/server/vikunja.ts` creates authenticated Vikunja clients for SvelteKit server routes and translates Vikunja failures into app-facing JSON responses.
- `src/lib/server/calendar/ics.ts` fetches and parses one external ICS feed into small app-facing calendar events.
- `src/lib/api/troth/client.ts` is the browser-facing client for Troth’s own same-origin `/api/*` endpoints.

The browser never calls Vikunja directly anymore. Components only deal with typed app models plus store methods, while SvelteKit routes proxy authenticated requests to Vikunja.

## Stores

The app uses small Svelte stores instead of a larger query or state library.

- `src/lib/stores/connection.ts` submits the Vikunja base URL and API token to a same-origin session endpoint, then keeps only a small connection summary in browser state.
- `src/lib/stores/calendar-feed.ts` submits the optional ICS feed URL to a same-origin endpoint and keeps only a small safe summary in browser state.
- `src/lib/stores/calendar-events.ts` loads read-only day events from the saved ICS feed through Troth’s own API endpoints.
- `src/lib/stores/calendar-preview-preferences.ts` keeps local non-secret preview preferences such as whether mock calendar events are enabled.
- `src/lib/stores/lists.ts` loads and refreshes Vikunja projects through Troth’s own API endpoints, then exposes them as app lists.
- `src/lib/stores/saved-filters.ts` loads and refreshes Vikunja saved filters and smart views through Troth’s own API endpoints.
- `src/lib/stores/tasks.ts` loads and refreshes tasks through Troth’s own API endpoints, and handles create, update, and complete/reopen writes with lightweight optimistic updates.

Both the task and list stores reset themselves when the authenticated Troth session changes so stale data does not linger across reconnects. Refresh failures now keep the last successful data in place and surface the error inline so the MVP stays usable during temporary API issues.

## Task UI composition

The first real task workflow lives in `src/lib/components/tasks/`.

- `TaskPage.svelte` is the thin route-facing wrapper. It loads data, selects the route-specific slice, and coordinates quick add plus editing.
- `CalendarDayPreview.svelte` shows a compact read-only per-day preview of events from the configured ICS feed.
- `src/lib/calendar/mock.ts` generates demo events used when mock calendar mode is enabled in Settings and no ICS feed is connected.
- `QuickAdd.svelte` handles title-first creation with a project picker when needed.
- `TaskList.svelte` and `TaskRow.svelte` render the task collection and the per-task complete/open interactions.
- `TaskEditor.svelte` is the first detail surface for editing title, notes, due date, priority, and project.
- `TaskListSkeleton.svelte` provides the subtle loading shell used across task views.

Route-specific filtering lives in `src/lib/tasks/view.ts`. That file owns the readable helpers for Today, Inbox, Upcoming, All Active, and Completed so the classification rules stay out of the route components.

Saved-filter task pages live under `src/lib/components/filters/` and reuse the same task list/editor components, but refresh their membership from Vikunja after task edits so filter results stay in sync.

## MVP behavior rules

- `Today` shows incomplete tasks due today or earlier.
- `Inbox` shows incomplete tasks in the project named `Inbox`.
- `Upcoming` shows incomplete tasks due in the next 7 days, including today.
- `All Active` shows every incomplete task.
- `Completed` shows completed tasks.
- Subtasks are stored as normal Vikunja tasks linked by a parent-task relation.
- Main task lists stay flat and show only top-level tasks.
- Parent rows show subtask progress like `2 of 5 done` when subtasks exist.
- Completing or reopening a parent task cascades the same completion state to all of its subtasks.
- Subtasks are managed primarily from the parent task editor and inherit only the parent project by default.

These rules are intentionally simple. Troth does not try to mirror every Vikunja view; it keeps a small personal workflow with predictable overlaps between views.
