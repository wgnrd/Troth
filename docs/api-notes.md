# API Notes

## Connection shape

Troth stores two pieces of connection state for this MVP slice:

- Vikunja base URL
- Vikunja API token

Users can enter either:

- a site URL like `https://vikunja.example.com`
- or a full API root like `https://vikunja.example.com/api/v1`

The client normalizes both into a final `/api/v1` base URL and sends the token as `Authorization: Bearer <token>`.

For this step, the token is persisted in browser local storage through `src/lib/stores/connection.ts`. This is deliberate MVP storage, not a full auth system.

## Wrapped endpoints

The current API layer wraps only the endpoints needed for the first real task flow:

- `GET /projects`
- `GET /projects/{id}/views`
- `GET /projects/{id}/views/{view}/tasks`
- `GET /tasks`
- `PUT /projects/{id}/tasks`
- `POST /tasks/{id}`

Connection testing also uses the project fetch path, since it requires valid authenticated access.

## Assumptions and limitations

- Vikunja projects are treated as the app’s lists/projects surface for now.
- Troth currently excludes saved filters from its project loading path, even if a Vikunja instance returns them alongside projects.
- Troth also excludes Vikunja virtual or system entries with non-positive ids, such as built-in smart views like `Today`, from the project loading path.
- Saved filters are surfaced separately from projects, using the non-positive ids Vikunja exposes through the project index.
- Task filtering for Today, Inbox, All Active, and Completed happens client-side after loading the user’s tasks.
- The Inbox view assumes there is a Vikunja project named `Inbox`. If that project does not exist, the route stays functional but shows an explicit empty/instruction state.
- Due dates are edited as date-only values in the UI and mapped back to Vikunja as noon UTC timestamps to avoid common timezone drift in this MVP step.
- The API layer intentionally ignores broader Vikunja features such as labels, comments, recurring rules, buckets, and collaboration until later slices.
