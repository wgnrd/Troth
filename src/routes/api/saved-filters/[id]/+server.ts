import { error } from '@sveltejs/kit';
import type { UpdateSavedFilterInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

const allowMethods = 'GET, POST, DELETE, HEAD, OPTIONS';

export const GET = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const id = Number.parseInt(event.params.id ?? '', 10);

		if (!Number.isInteger(id)) {
			throw error(400, 'Invalid saved filter id.');
		}

		return new Response(JSON.stringify(await client.getSavedFilter(id)), {
			status: 200,
			headers: {
				'content-type': 'application/json'
			}
		});
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const POST = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const routeId = Number.parseInt(event.params.id ?? '', 10);

		if (!Number.isInteger(routeId)) {
			throw error(400, 'Invalid saved filter id.');
		}

		const input = await readJsonBody<UpdateSavedFilterInput>(event);

		if (input.id !== routeId) {
			throw error(400, 'Saved filter id in the URL must match the request body.');
		}

		return new Response(JSON.stringify(await client.updateSavedFilter(input)), {
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
			throw error(400, 'Invalid saved filter id.');
		}

		await client.deleteSavedFilter(id);
		return new Response(null, { status: 204 });
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
