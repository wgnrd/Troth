import type { AppCalendarEvent, CalendarFeedInput, CalendarFeedSummary } from '$lib/api/calendar';
import type {
	AppList,
	AppSavedFilter,
	AppTask,
	CreateSavedFilterInput,
	CreateProjectInput,
	CreateTaskInput,
	UpdateSavedFilterInput,
	UpdateProjectInput,
	UpdateTaskInput
} from '$lib/api/vikunja';

export type ConnectionSummary = {
	baseUrl: string;
	sessionKey: string;
};

export type TaskPageResponse = {
	items: AppTask[];
	hasMore: boolean;
	page: number;
	view: 'all' | 'active' | 'completed';
};

type ApiErrorPayload = {
	message?: string;
	task?: AppTask | null;
};

export class TrothApiError extends Error {
	status: number;

	constructor(message: string, status = 500) {
		super(message);
		this.name = 'TrothApiError';
		this.status = status;
	}
}

export class TrothTaskMutationError extends TrothApiError {
	task: AppTask | null;

	constructor(message: string, status = 500, task: AppTask | null = null) {
		super(message, status);
		this.name = 'TrothTaskMutationError';
		this.task = task;
	}
}

export async function fetchSession() {
	const response = await request<{ connection: ConnectionSummary | null }>('/api/session', {
		method: 'GET'
	});

	return response.connection;
}

export async function connectSession(input: { baseUrl: string; token: string }) {
	const response = await request<{ connection: ConnectionSummary }>('/api/session', {
		method: 'PUT',
		body: input
	});

	return response.connection;
}

export async function disconnectSession() {
	await request('/api/session', {
		method: 'DELETE'
	});
}

export async function fetchCalendarFeed() {
	const response = await request<{ calendarFeed: CalendarFeedSummary | null }>('/api/calendar', {
		method: 'GET'
	});

	return response.calendarFeed;
}

export async function connectCalendarFeed(input: CalendarFeedInput) {
	const response = await request<{ calendarFeed: CalendarFeedSummary }>('/api/calendar', {
		method: 'PUT',
		body: input
	});

	return response.calendarFeed;
}

export async function disconnectCalendarFeed() {
	await request('/api/calendar', {
		method: 'DELETE'
	});
}

export async function fetchCalendarEvents(day: string, timezoneOffsetMinutes: number) {
	const query = new URLSearchParams({
		day,
		timezoneOffsetMinutes: String(timezoneOffsetMinutes)
	});
	const response = await request<{ events: AppCalendarEvent[] }>(`/api/calendar/events?${query}`, {
		method: 'GET'
	});

	return response.events;
}

export function fetchProjects() {
	return request<AppList[]>('/api/projects', {
		method: 'GET'
	});
}

export function createProject(input: CreateProjectInput) {
	return request<AppList>('/api/projects', {
		method: 'PUT',
		body: input
	});
}

export function updateProject(input: UpdateProjectInput) {
	return request<AppList>(`/api/projects/${input.id}`, {
		method: 'POST',
		body: input
	});
}

export function deleteProject(id: number) {
	return request<void>(`/api/projects/${id}`, {
		method: 'DELETE'
	});
}

export function fetchTasks(view: 'all' | 'active' | 'completed' = 'all', page = 1) {
	const query = new URLSearchParams();

	if (view !== 'all') {
		query.set('view', view);
		query.set('page', String(page));
	}

	return request<TaskPageResponse>(`/api/tasks${query.size > 0 ? `?${query.toString()}` : ''}`, {
		method: 'GET'
	});
}

export function createTask(input: CreateTaskInput) {
	return request<AppTask>('/api/tasks', {
		method: 'PUT',
		body: input
	});
}

export function updateTask(input: UpdateTaskInput, currentParentTaskId: number | null = null) {
	return request<AppTask>(`/api/tasks/${input.id}`, {
		method: 'POST',
		body: input,
		headers: {
			'x-troth-current-parent-task-id':
				currentParentTaskId === null ? '' : String(currentParentTaskId)
		}
	});
}

export function deleteTask(id: number) {
	return request<void>(`/api/tasks/${id}`, {
		method: 'DELETE'
	});
}

export function fetchSavedFilters() {
	return request<AppSavedFilter[]>('/api/saved-filters', {
		method: 'GET'
	});
}

export function getSavedFilter(id: number) {
	return request<AppSavedFilter>(`/api/saved-filters/${id}`, {
		method: 'GET'
	});
}

export function createSavedFilter(input: CreateSavedFilterInput) {
	return request<AppSavedFilter>('/api/saved-filters', {
		method: 'PUT',
		body: input
	});
}

export function updateSavedFilter(input: UpdateSavedFilterInput) {
	return request<AppSavedFilter>(`/api/saved-filters/${input.id}`, {
		method: 'POST',
		body: input
	});
}

export function deleteSavedFilter(id: number) {
	return request<void>(`/api/saved-filters/${id}`, {
		method: 'DELETE'
	});
}

export function fetchSavedFilterTasks(filterId: number) {
	return request<AppTask[]>(`/api/saved-filters/${filterId}/tasks`, {
		method: 'GET'
	});
}

async function request<T>(
	path: string,
	options: {
		method: 'GET' | 'POST' | 'PUT' | 'DELETE';
		body?: unknown;
		headers?: Record<string, string>;
	}
): Promise<T> {
	const response = await fetch(path, {
		method: options.method,
		headers: {
			Accept: 'application/json',
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...(options.headers ?? {})
		},
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		throw await toApiError(response);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return (await response.json()) as T;
}

async function toApiError(response: Response) {
	let payload: ApiErrorPayload | null = null;

	try {
		payload = (await response.json()) as ApiErrorPayload;
	} catch {
		payload = null;
	}

	const message = payload?.message ?? `Request failed with status ${response.status}.`;

	if (payload?.task) {
		return new TrothTaskMutationError(message, response.status, payload.task);
	}

	return new TrothApiError(message, response.status);
}
