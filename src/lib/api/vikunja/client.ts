import {
	mapCreateTaskInput,
	mapProjectToList,
	mapTaskToAppTask,
	mapUpdateTaskInput
} from './mappers';
import type {
	AppList,
	AppTask,
	ConnectionSettings,
	CreateTaskInput,
	UpdateTaskInput,
	VikunjaErrorResponse,
	VikunjaProject,
	VikunjaTask
} from './types';

const DEFAULT_PAGE_SIZE = 100;

export class VikunjaClientError extends Error {
	status: number;

	constructor(message: string, status = 500) {
		super(message);
		this.name = 'VikunjaClientError';
		this.status = status;
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

		return projects.map(mapProjectToList);
	}

	async fetchTasks(options: { pageSize?: number } = {}): Promise<AppTask[]> {
		const tasks = await this.getAllPages<VikunjaTask>('/tasks', {
			per_page: String(options.pageSize ?? DEFAULT_PAGE_SIZE),
			sort_by: 'due_date',
			order_by: 'asc'
		});

		return tasks.map(mapTaskToAppTask);
	}

	async createTask(input: CreateTaskInput): Promise<AppTask> {
		const task = await this.request<VikunjaTask>(`/projects/${input.listId}/tasks`, {
			method: 'PUT',
			body: mapCreateTaskInput(input)
		});

		return mapTaskToAppTask(task);
	}

	async updateTask(input: UpdateTaskInput): Promise<AppTask> {
		const task = await this.request<VikunjaTask>(`/tasks/${input.id}`, {
			method: 'POST',
			body: mapUpdateTaskInput(input)
		});

		return mapTaskToAppTask(task);
	}

	async setTaskCompleted(input: UpdateTaskInput, completed: boolean): Promise<AppTask> {
		return this.updateTask({
			...input,
			completed
		});
	}

	async deleteTask(id: number): Promise<void> {
		await this.request<void>(`/tasks/${id}`, {
			method: 'DELETE'
		});
	}

	private async getAllPages<T>(path: string, params: Record<string, string>): Promise<T[]> {
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
			page += 1;
		}

		return results;
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
			`Could not reach Vikunja at ${url.origin}. Check the base URL, network connection, or CORS/proxy setup.`,
			0
		);
	}

	return new VikunjaClientError(
		`Could not reach Vikunja at ${url.origin}. Check the base URL and network connection.`,
		0
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
