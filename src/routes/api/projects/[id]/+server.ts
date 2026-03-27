import { error } from '@sveltejs/kit';
import type { UpdateProjectInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

export const POST = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const routeId = Number.parseInt(event.params.id ?? '', 10);

		if (!Number.isInteger(routeId)) {
			throw error(400, 'Invalid project id.');
		}

		const input = await readJsonBody<UpdateProjectInput>(event);

		if (input.id !== routeId) {
			throw error(400, 'Project id in the URL must match the request body.');
		}

		return new Response(JSON.stringify(await client.updateProject(input)), {
			status: 200,
			headers: {
				'content-type': 'application/json'
			}
		});
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const DELETE = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const id = Number.parseInt(event.params.id ?? '', 10);

		if (!Number.isInteger(id)) {
			throw error(400, 'Invalid project id.');
		}

		await client.deleteProject(id);
		return new Response(null, { status: 204 });
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
