import { json } from '@sveltejs/kit';
import { getServerVikunjaClient, toApiErrorResponse } from '$lib/server/vikunja';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		return json(await client.fetchSavedFilters());
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
