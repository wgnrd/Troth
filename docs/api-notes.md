# API Notes

## Connection shape

Troth still needs two pieces of Vikunja connection state:

- Vikunja base URL
- Vikunja API token

Users can enter either:

- a site URL like `https://vikunja.example.com`
- or a full API root like `https://vikunja.example.com/api/v1`

Troth normalizes both into a final `/api/v1` base URL and sends the token to Vikunja as `Authorization: Bearer <token>`.

The important change is where that state lives:

- the browser submits the connection details to `PUT /api/session`
- Troth stores the normalized base URL and token in an encrypted HTTP-only cookie-backed session
- the browser only keeps a small connection summary with the normalized base URL and a session key

That removes direct browser-to-Vikunja traffic and avoids deployment-time CORS requirements for the core app flows.

## Wrapped endpoints

Troth’s server boundary currently wraps only the endpoints needed for the real task flow:

- `GET /api/session`
- `PUT /api/session`
- `DELETE /api/session`
- `GET /api/projects`
- `PUT /api/projects`
- `POST /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/saved-filters`
- `GET /api/saved-filters/{id}/tasks`
- `GET /api/tasks`
- `PUT /api/tasks`
- `POST /api/tasks/{id}`
- `DELETE /api/tasks/{id}`

Those server routes then call Vikunja endpoints such as:

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
- Troth still uses a Vikunja personal API token for now. The token is no longer stored in browser local storage, but this is still a session-backed token flow rather than a full Troth-managed username/password login.
- The Inbox view assumes there is a Vikunja project named `Inbox`. If that project does not exist, the route stays functional but shows an explicit empty/instruction state.
- Due dates are edited as date-only values in the UI and mapped back to Vikunja as noon UTC timestamps to avoid common timezone drift in this MVP step.
- The API layer intentionally ignores broader Vikunja features such as labels, comments, recurring rules, buckets, and collaboration until later slices.
