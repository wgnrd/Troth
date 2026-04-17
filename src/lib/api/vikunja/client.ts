import {
	isProjectLike,
	isSavedFilter,
	mapCreateSavedFilterInput,
	mapCreateProjectInput,
	mapProjectToLegacySavedFilter,
	mapCreateTaskInput,
	mapProjectToList,
	mapSavedFilterToAppFilter,
	mapTaskToAppTask,
	mapUpdateSavedFilterInput,
	mapUpdateProjectInput,
	mapUpdateTaskInput
} from './mappers';
import type {
	AppList,
	AppSavedFilter,
	AppTask,
	ConnectionSettings,
	CreateSavedFilterInput,
	CreateProjectInput,
	CreateTaskInput,
	UpdateSavedFilterInput,
	UpdateProjectInput,
	UpdateTaskInput,
	VikunjaErrorResponse,
	VikunjaProject,
	VikunjaProjectView,
	VikunjaSavedFilter,
	VikunjaTask
} from './types';

const DEFAULT_PAGE_SIZE = 100;

type TaskFetchOptions = {
	pageSize?: number;
	filter?: string;
	filterIncludeNulls?: boolean;
	search?: string;
	sortBy?: string[];
	orderBy?: string[];
	defaultSort?: boolean;
	pageLimit?: number;
};

type TaskPageOptions = {
	page?: number;
	pageSize?: number;
	filter?: string;
	filterIncludeNulls?: boolean;
	search?: string;
	sortBy?: string[];
	orderBy?: string[];
	defaultSort?: boolean;
};

export class VikunjaClientError extends Error {
	status: number;

	constructor(message: string, status = 500) {
		super(message);
		this.name = 'VikunjaClientError';
		this.status = status;
	}
}

export class VikunjaTaskMutationError extends VikunjaClientError {
	task: AppTask | null;

	constructor(message: string, status = 500, task: AppTask | null = null) {
		super(message, status);
		this.name = 'VikunjaTaskMutationError';
		this.task = task;
	}
}

export class VikunjaClient {
	readonly baseUrl: string;
	readonly token: string;

	constructor(settings: ConnectionSettings) {
		this.baseUrl = normalizeVikunjaBaseUrl(settings.baseUrl);
		this.token = settings.token.trim();
	}

	async checkConnection(): Promise<void> {
		await this.request<Record<string, unknown>>('/info', {
			method: 'GET',
			auth: false
		});

		await this.fetchProjects({ pageSize: 1 });
	}

	async fetchProjects(options: { pageSize?: number } = {}): Promise<AppList[]> {
		const projects = await this.getAllPages<VikunjaProject>('/projects', {
			per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE),
			is_archived: 'false'
		});

		return projects.filter((project) => project.id > 0).map(mapProjectToList);
	}

	async fetchSavedFilters(options: { pageSize?: number } = {}): Promise<AppSavedFilter[]> {
		try {
			const filters = await this.getAllPages<VikunjaSavedFilter>('/filters', {
				per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE)
			});

			return filters.map(mapSavedFilterToAppFilter).sort(sortSavedFilters);
		} catch (error) {
			if (!isMethodNotAllowed(error)) {
				throw error;
			}

			return this.fetchLegacySavedFilters(options);
		}
	}

	async getSavedFilter(id: number): Promise<AppSavedFilter> {
		try {
			const filter = await this.request<VikunjaSavedFilter>(`/filters/${id}`, {
				method: 'GET'
			});

			return mapSavedFilterToAppFilter(filter);
		} catch (error) {
			if (!isLegacySavedFilterReadFallback(error)) {
				throw error;
			}

			const filters = await this.fetchLegacySavedFilters();
			const filter = filters.find((entry) => entry.id === id) ?? null;

			if (!filter) {
				throw new VikunjaClientError('Saved filter not found.', 404);
			}

			return filter;
		}
	}

	async createSavedFilter(input: CreateSavedFilterInput): Promise<AppSavedFilter> {
		try {
			const filter = await this.request<VikunjaSavedFilter>('/filters', {
				method: 'PUT',
				body: mapCreateSavedFilterInput(input)
			});

			return mapSavedFilterToAppFilter(filter);
		} catch (error) {
			if (isMethodNotAllowed(error)) {
				throw new VikunjaClientError(
					'Your Vikunja server does not support saved-filter creation through the filters API.',
					405
				);
			}

			throw error;
		}
	}

	async updateSavedFilter(input: UpdateSavedFilterInput): Promise<AppSavedFilter> {
		try {
			const filter = await this.request<VikunjaSavedFilter>(`/filters/${input.id}`, {
				method: 'POST',
				body: mapUpdateSavedFilterInput(input)
			});

			return mapSavedFilterToAppFilter(filter);
		} catch (error) {
			if (isMethodNotAllowed(error)) {
				throw new VikunjaClientError(
					'Your Vikunja server does not support saved-filter updates through the filters API.',
					405
				);
			}

			throw error;
		}
	}

	async deleteSavedFilter(id: number): Promise<void> {
		try {
			await this.request<void>(`/filters/${id}`, {
				method: 'DELETE'
			});
		} catch (error) {
			if (isMethodNotAllowed(error)) {
				throw new VikunjaClientError(
					'Your Vikunja server does not support saved-filter deletion through the filters API.',
					405
				);
			}

			throw error;
		}
	}

	async fetchSavedFilterTasks(
		filterId: number,
		options: { pageSize?: number } = {}
	): Promise<AppTask[]> {
		try {
			const filter = await this.request<VikunjaSavedFilter>(`/filters/${filterId}`, {
				method: 'GET'
			});
			const appFilter = mapSavedFilterToAppFilter(filter);

			return this.fetchTasks({
				pageSize: options.pageSize,
				filter: appFilter.query.filter || undefined,
				filterIncludeNulls: appFilter.query.filterIncludeNulls,
				search: appFilter.query.search || undefined,
				sortBy: appFilter.query.sortBy,
				orderBy: appFilter.query.orderBy,
				defaultSort: false
			});
		} catch (error) {
			if (!isLegacySavedFilterReadFallback(error)) {
				throw error;
			}

			return this.fetchLegacySavedFilterTasks(filterId, options);
		}
	}

	async fetchTasks(options: TaskFetchOptions = {}): Promise<AppTask[]> {
		const tasks = await this.getAllPages<VikunjaTask>(
			'/tasks',
			buildTaskQueryParams(options),
			options.pageLimit
		);

		return tasks.map(mapTaskToAppTask);
	}

	async fetchTaskPage(
		options: TaskPageOptions = {}
	): Promise<{ items: AppTask[]; hasMore: boolean }> {
		const page = options.page ?? 1;
		const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

		const response = await this.requestWithResponse<VikunjaTask[]>('/tasks', {
			method: 'GET',
			params: {
				...buildTaskQueryParams({
					pageSize,
					filter: options.filter,
					filterIncludeNulls: options.filterIncludeNulls,
					search: options.search,
					sortBy: options.sortBy,
					orderBy: options.orderBy,
					defaultSort: options.defaultSort
				}),
				page: String(page),
				per_page: String(pageSize)
			}
		});

		const totalPages = Number(response.response.headers.get('x-pagination-total-pages') ?? '1');

		return {
			items: response.data.map(mapTaskToAppTask),
			hasMore: page < totalPages
		};
	}

	async createProject(input: CreateProjectInput): Promise<AppList> {
		const project = await this.request<VikunjaProject>('/projects', {
			method: 'PUT',
			body: mapCreateProjectInput(input)
		});

		return mapProjectToList(project);
	}

	async updateProject(input: UpdateProjectInput): Promise<AppList> {
		const project = await this.request<VikunjaProject>(`/projects/${input.id}`, {
			method: 'POST',
			body: mapUpdateProjectInput(input)
		});

		return mapProjectToList(project);
	}

	async deleteProject(id: number): Promise<void> {
		await this.request<void>(`/projects/${id}`, {
			method: 'DELETE'
		});
	}

	async createTask(input: CreateTaskInput): Promise<AppTask> {
		const task = await this.request<VikunjaTask>(`/projects/${input.listId}/tasks`, {
			method: 'PUT',
			body: mapCreateTaskInput(input)
		});

		const createdTask = mapTaskToAppTask(task);

		if (input.parentTaskId === undefined || input.parentTaskId === null) {
			return createdTask;
		}

		try {
			await this.createTaskRelation(input.parentTaskId, createdTask.id, 'subtask');
		} catch (error) {
			throw toTaskMutationError(
				error,
				createdTask,
				`Created "${createdTask.title}" but could not link it as a subtask.`
			);
		}

		return {
			...createdTask,
			parentTaskId: input.parentTaskId
		};
	}

	async updateTask(
		input: UpdateTaskInput,
		currentParentTaskId: number | null = null
	): Promise<AppTask> {
		const task = await this.request<VikunjaTask>(`/tasks/${input.id}`, {
			method: 'POST',
			body: mapUpdateTaskInput(input)
		});

		const savedTask = mapTaskToAppTask(task);

		if (currentParentTaskId === input.parentTaskId) {
			return {
				...savedTask,
				parentTaskId: input.parentTaskId
			};
		}

		if (currentParentTaskId !== null) {
			try {
				await this.deleteTaskRelation(currentParentTaskId, input.id, 'subtask');
			} catch (error) {
				throw toTaskMutationError(
					error,
					{ ...savedTask, parentTaskId: currentParentTaskId },
					`Saved "${savedTask.title}" but could not keep its parent task relation in sync.`
				);
			}
		}

		if (input.parentTaskId !== null) {
			try {
				await this.createTaskRelation(input.parentTaskId, input.id, 'subtask');
			} catch (error) {
				throw toTaskMutationError(
					error,
					{ ...savedTask, parentTaskId: null },
					`Saved "${savedTask.title}" but could not update its parent task relation.`
				);
			}
		}

		return {
			...savedTask,
			parentTaskId: input.parentTaskId
		};
	}

	async setTaskCompleted(
		input: UpdateTaskInput,
		completed: boolean,
		currentParentTaskId: number | null = null
	): Promise<AppTask> {
		return this.updateTask(
			{
				...input,
				completed
			},
			currentParentTaskId
		);
	}

	async deleteTask(id: number): Promise<void> {
		await this.request<void>(`/tasks/${id}`, {
			method: 'DELETE'
		});
	}

	private async getAllPages<T>(
		path: string,
		params: Record<string, string>,
		pageLimit?: number
	): Promise<T[]> {
		const pageSize = Number(params.per_page ?? DEFAULT_PAGE_SIZE);
		let page = 1;
		let totalPages = 1;
		const results: T[] = [];

		while (page <= totalPages) {
			const response = await this.requestWithResponse<T[]>(path, {
				method: 'GET',
				params: {
					...params,
					page: String(page),
					per_page: String(pageSize)
				}
			});

			results.push(...response.data);
			totalPages = Number(response.response.headers.get('x-pagination-total-pages') ?? '1');

			if (pageLimit) {
				totalPages = Math.min(totalPages, pageLimit);
			}

			page += 1;
		}

		return results;
	}

	private async createTaskRelation(
		taskId: number,
		otherTaskId: number,
		relationKind: 'subtask' | 'parenttask'
	) {
		await this.request(`/tasks/${taskId}/relations`, {
			method: 'PUT',
			body: {
				task_id: taskId,
				other_task_id: otherTaskId,
				relation_kind: relationKind
			}
		});
	}

	private async deleteTaskRelation(
		taskId: number,
		otherTaskId: number,
		relationKind: 'subtask' | 'parenttask'
	) {
		await this.request(`/tasks/${taskId}/relations/${relationKind}/${otherTaskId}`, {
			method: 'DELETE'
		});
	}

	private async request<T>(
		path: string,
		options: {
			method: 'GET' | 'POST' | 'PUT' | 'DELETE';
			params?: Record<string, string>;
			body?: unknown;
			auth?: boolean;
		}
	): Promise<T> {
		const { data } = await this.requestWithResponse<T>(path, options);
		return data;
	}

	private async requestWithResponse<T>(
		path: string,
		options: {
			method: 'GET' | 'POST' | 'PUT' | 'DELETE';
			params?: Record<string, string>;
			body?: unknown;
			auth?: boolean;
		}
	): Promise<{ data: T; response: Response }> {
		const normalizedPath = path.replace(/^\/+/, '');
		const url = new URL(normalizedPath, `${this.baseUrl}/`);

		for (const [key, value] of Object.entries(options.params ?? {})) {
			url.searchParams.set(key, value);
		}

		let response: Response;

		try {
			response = await fetch(url, {
				method: options.method,
				headers: {
					Accept: 'application/json',
					...(options.auth === false ? {} : { Authorization: `Bearer ${this.token}` }),
					...(options.body ? { 'Content-Type': 'application/json' } : {})
				},
				body: options.body ? JSON.stringify(options.body) : undefined
			});
		} catch (error) {
			throw toNetworkError(error, url);
		}

		if (!response.ok) {
			throw await toClientError(response);
		}

		if (response.status === 204) {
			return {
				data: undefined as T,
				response
			};
		}

		const contentType = response.headers.get('content-type') ?? '';

		if (!contentType.toLowerCase().includes('application/json')) {
			throw new VikunjaClientError(
				`Expected Vikunja JSON at ${url.toString()}, but received HTML. Check the base URL or reverse-proxy routing to the Vikunja API.`,
				response.status
			);
		}

		let data: T;

		try {
			data = (await response.json()) as T;
		} catch {
			throw new VikunjaClientError(
				`Received an unreadable response from ${url.toString()}. Check that this URL points to the Vikunja API, not the frontend.`,
				response.status
			);
		}

		return {
			data,
			response
		};
	}

	private async fetchLegacySavedFilters(options: { pageSize?: number } = {}) {
		const entries = await this.getAllPages<VikunjaProject | VikunjaSavedFilter>('/projects', {
			per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE),
			is_archived: 'false'
		});

		return entries
			.filter(
				(entry): entry is VikunjaProject =>
					entry.id <= 0 && !isSavedFilter(entry) && isProjectLike(entry)
			)
			.map(mapProjectToLegacySavedFilter)
			.sort(sortSavedFilters);
	}

	private async fetchLegacySavedFilterTasks(
		filterId: number,
		options: { pageSize?: number } = {}
	): Promise<AppTask[]> {
		const views = await this.request<VikunjaProjectView[]>(`/projects/${filterId}/views`, {
			method: 'GET'
		});
		const selectedView =
			[...views]
				.sort((left, right) => {
					const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
					const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;

					if (left.view_kind === 'list' && right.view_kind !== 'list') {
						return -1;
					}

					if (left.view_kind !== 'list' && right.view_kind === 'list') {
						return 1;
					}

					if (leftPosition !== rightPosition) {
						return leftPosition - rightPosition;
					}

					return left.id - right.id;
				})
				.at(0) ?? null;

		if (!selectedView) {
			return [];
		}

		const tasks = await this.getAllPages<VikunjaTask>(
			`/projects/${filterId}/views/${selectedView.id}/tasks`,
			{
				per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE),
				sort_by: 'due_date',
				order_by: 'asc'
			}
		);

		return tasks.map(mapTaskToAppTask);
	}
}

function buildTaskQueryParams(options: TaskFetchOptions | TaskPageOptions) {
	const params: Record<string, string> = {
		per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE)
	};

	if (options.filter) {
		params.filter = options.filter;
	}

	if (options.filterIncludeNulls) {
		params.filter_include_nulls = 'true';
	}

	if (options.search) {
		params.s = options.search;
	}

	const sortBy = normalizeQueryArray(options.sortBy);
	const orderBy = normalizeQueryArray(options.orderBy);

	if (sortBy.length > 0) {
		params.sort_by = sortBy.join(',');
	}

	if (orderBy.length > 0) {
		params.order_by = orderBy.join(',');
	}

	if (options.defaultSort !== false && !params.sort_by && !params.order_by) {
		params.sort_by = 'due_date';
		params.order_by = 'asc';
	}

	return params;
}

function normalizeQueryArray(values: string[] | undefined) {
	return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function sortSavedFilters(left: AppSavedFilter, right: AppSavedFilter) {
	if (left.isFavorite !== right.isFavorite) {
		return left.isFavorite ? -1 : 1;
	}

	return left.title.localeCompare(right.title);
}

function isMethodNotAllowed(error: unknown) {
	return error instanceof VikunjaClientError && error.status === 405;
}

function isLegacySavedFilterReadFallback(error: unknown) {
	return error instanceof VikunjaClientError && (error.status === 404 || error.status === 405);
}

function toTaskMutationError(error: unknown, task: AppTask, fallbackMessage: string) {
	if (error instanceof VikunjaClientError) {
		return new VikunjaTaskMutationError(error.message, error.status, task);
	}

	return new VikunjaTaskMutationError(fallbackMessage, 500, task);
}

export function normalizeVikunjaBaseUrl(rawBaseUrl: string): string {
	const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');

	if (!trimmed) {
		throw new VikunjaClientError('Enter your Vikunja URL.', 400);
	}

	let parsed: URL;

	try {
		parsed = new URL(trimmed);
	} catch {
		throw new VikunjaClientError('Enter a valid Vikunja URL, including http or https.', 400);
	}

	const normalizedPath = parsed.pathname.replace(/\/+$/, '');

	if (normalizedPath.endsWith('/api/v1')) {
		parsed.pathname = normalizedPath;
	} else {
		parsed.pathname = `${normalizedPath}/api/v1`.replace(/\/{2,}/g, '/');
	}

	return parsed.toString().replace(/\/+$/, '');
}

async function toClientError(response: Response): Promise<VikunjaClientError> {
	let message = getStatusFallbackMessage(response.status);

	try {
		const payload = (await response.json()) as VikunjaErrorResponse;
		if (payload.message) {
			message = payload.message;
		}
	} catch {
		// Ignore invalid error bodies and use the fallback message.
	}

	return new VikunjaClientError(message, response.status);
}

function toNetworkError(error: unknown, url: URL) {
	if (error instanceof Error) {
		return new VikunjaClientError(
			`The Vikunja server at ${url.origin} could not be reached. Check the base URL, that the server is running, and any network, proxy, or CORS setup.`,
			503
		);
	}

	return new VikunjaClientError(
		`The Vikunja server at ${url.origin} could not be reached. Check the base URL and that the server is running.`,
		503
	);
}

function getStatusFallbackMessage(status: number) {
	switch (status) {
		case 401:
			return 'Vikunja rejected the API token. Check the saved token and try again.';
		case 403:
			return 'Vikunja denied this request. Check the token permissions and try again.';
		case 404:
			return 'Troth could not find the Vikunja API at this URL. Check the base URL.';
		case 429:
			return 'Vikunja is rate-limiting requests right now. Wait a moment and try again.';
		default:
			if (status >= 500) {
				return 'Vikunja is temporarily unavailable. Try again in a moment.';
			}

			return `Request failed with status ${status}.`;
	}
}
