import { json } from '@sveltejs/kit';
import type { CreateProjectInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		return json(await client.fetchProjects());
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const PUT = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const input = await readJsonBody<CreateProjectInput>(event);
		return json(await client.createProject(input));
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
