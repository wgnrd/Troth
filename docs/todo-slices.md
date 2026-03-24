# Todo Slices

## Post-MVP polish

### 1. Tests for current MVP

- Add unit coverage for `src/lib/tasks/view.ts`.
- Add store-level tests for optimistic create, update, and complete flows.
- Add a small settings-flow integration pass for invalid connection input and reconnect behavior.

### 2. Save-state clarity

- Surface per-row save feedback if repeated real-world use shows the global inline error is not enough.
- Review whether the editor should close after save or stay open by default.
- Tighten retry copy only if real API failure cases prove confusing.

### 3. Mobile detail polish

- Review the task editor spacing and sticky actions after small-screen usage.
- Check whether the mobile nav needs a stronger active-route cue.
- Revisit task row density if longer titles feel cramped on smaller phones.

## Future features

### 1. Inbox configuration

- Let the user choose which project acts as Inbox instead of relying on the project name.
- Keep the fallback convention-based behavior until that exists.

### 2. Upcoming grouping

- Group upcoming tasks by date once the flat list starts to feel too long.
- Keep the same simple date-window rules unless grouping creates confusion.

### 3. Better project context

- Add a lightweight project summary or color cue in the editor if it helps orientation.
- Avoid turning the task editor into a full inspector.

### 4. Notes and task detail depth

- Consider richer markdown affordances only if they reduce friction in the current editor.
- Keep raw markdown as the source of truth.
