import { json } from '@sveltejs/kit';
import { getServerVikunjaClient, toApiErrorResponse } from '$lib/server/vikunja';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const id = Number.parseInt(event.params.id ?? '', 10);

		return json(await client.fetchSavedFilterTasks(id));
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
