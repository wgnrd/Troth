import { json } from '@sveltejs/kit';
import type { CreateTaskInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		return json(await client.fetchTasks());
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const PUT = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const input = await readJsonBody<CreateTaskInput>(event);
		return json(await client.createTask(input));
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
