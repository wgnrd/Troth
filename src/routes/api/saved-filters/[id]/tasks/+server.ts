import { json } from '@sveltejs/kit';
import { getServerVikunjaClient, toApiErrorResponse } from '$lib/server/vikunja';

const allowMethods = 'GET, HEAD, OPTIONS';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const id = Number.parseInt(event.params.id ?? '', 10);

		return json(await client.fetchSavedFilterTasks(id));
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const OPTIONS = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			allow: allowMethods,
			'access-control-allow-methods': allowMethods
		}
	});
};
