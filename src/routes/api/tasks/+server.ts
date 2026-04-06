import { json, type RequestHandler } from '@sveltejs/kit';
import type { CreateTaskInput } from '$lib/api/vikunja';
import { getServerVikunjaClient, readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

const PAGE_SIZE = 50;

export const GET: RequestHandler = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const view = event.url.searchParams.get('view');
		const page = Number.parseInt(event.url.searchParams.get('page') ?? '1', 10);
		const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;

		if (view === 'active') {
			const response = await client.fetchTaskPage({
				page: currentPage,
				pageSize: PAGE_SIZE,
				filter: 'done = false'
			});

			return json({
				items: response.items,
				hasMore: response.hasMore,
				page: currentPage,
				view: 'active'
			});
		}

		if (view === 'completed') {
			const response = await client.fetchTaskPage({
				page: currentPage,
				pageSize: PAGE_SIZE,
				filter: 'done = true'
			});

			return json({
				items: response.items,
				hasMore: response.hasMore,
				page: currentPage,
				view: 'completed'
			});
		}

		return json({
			items: await client.fetchTasks(),
			hasMore: false,
			page: 1,
			view: 'all'
		});
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};

export const PUT: RequestHandler = async (event) => {
	try {
		const client = getServerVikunjaClient(event);
		const input = await readJsonBody<CreateTaskInput>(event);
		return json(await client.createTask(input));
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
