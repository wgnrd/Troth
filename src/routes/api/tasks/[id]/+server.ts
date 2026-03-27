import { error } from '@sveltejs/kit';
import type { UpdateTaskInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

export const POST = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const routeId = Number.parseInt(event.params.id ?? '', 10);

		if (!Number.isInteger(routeId)) {
			throw error(400, 'Invalid task id.');
		}

		const input = await readJsonBody<UpdateTaskInput>(event);

		if (input.id !== routeId) {
			throw error(400, 'Task id in the URL must match the request body.');
		}

		const currentParentTaskIdHeader = event.request.headers.get('x-troth-current-parent-task-id');
		const currentParentTaskId =
			currentParentTaskIdHeader === null || currentParentTaskIdHeader === ''
				? null
				: Number.parseInt(currentParentTaskIdHeader, 10);

		return new Response(JSON.stringify(await client.updateTask(input, currentParentTaskId)), {
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
			throw error(400, 'Invalid task id.');
		}

		await client.deleteTask(id);
		return new Response(null, { status: 204 });
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
