import { json } from '@sveltejs/kit';
import type { CreateSavedFilterInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

const allowMethods = 'GET, PUT, HEAD, OPTIONS';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		return json(await client.fetchSavedFilters());
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const PUT = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const input = await readJsonBody<CreateSavedFilterInput>(event);
		return json(await client.createSavedFilter(input), { status: 201 });
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
