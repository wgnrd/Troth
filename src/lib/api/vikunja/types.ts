export type ConnectionSettings = {
	baseUrl: string;
	token: string;
};

export type VikunjaErrorResponse = {
	code?: number;
	message?: string;
};

export type VikunjaTask = {
	id: number;
	title: string;
	description?: string;
	done?: boolean;
	done_at?: string;
	due_date?: string;
	repeat_after?: number;
	repeat_mode?: number;
	priority?: number;
	project_id?: number;
	identifier?: string;
	created?: string;
	updated?: string;
	related_tasks?: Record<string, Array<{ id: number }> | undefined>;
};

export type VikunjaProject = {
	id: number;
	title: string;
	description?: string;
	is_archived?: boolean;
	hex_color?: string;
	identifier?: string;
	parent_project_id?: number | null;
	position?: number;
	max_permission?: number;
	views?: Array<Record<string, unknown>>;
	created?: string;
	updated?: string;
};

export type VikunjaSavedFilter = {
	id: number;
	title: string;
	description?: string;
	filters?: Record<string, unknown>;
	is_favorite?: boolean;
	created?: string;
	updated?: string;
};

export type VikunjaProjectView = {
	id: number;
	title?: string;
	position?: number;
	view_kind?: 'list' | 'gantt' | 'table' | 'kanban';
};

export type AppList = {
	id: number;
	title: string;
	description: string;
	isArchived: boolean;
	color: string | null;
	identifier: string | null;
	parentId: number | null;
};

export type AppSavedFilter = {
	id: number;
	title: string;
	description: string;
	position: number | null;
};

export type CreateProjectInput = {
	title: string;
	description?: string;
	color?: string | null;
	parentId?: number | null;
};

export type UpdateProjectInput = {
	id: number;
	title: string;
	description?: string;
	color?: string | null;
	parentId?: number | null;
};

export type AppTask = {
	id: number;
	title: string;
	description: string;
	completed: boolean;
	completedAt: string | null;
	dueDate: string | null;
	repeatAfter: number | null;
	repeatMode: number | null;
	priority: number;
	listId: number | null;
	parentTaskId: number | null;
	identifier: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type CreateTaskInput = {
	title: string;
	listId: number;
	dueDate?: string | null;
	priority?: number;
	parentTaskId?: number | null;
};

export type UpdateTaskInput = {
	id: number;
	title: string;
	description: string;
	dueDate: string | null;
	repeatAfter: number | null;
	repeatMode: number | null;
	priority: number;
	listId: number;
	parentTaskId: number | null;
	completed?: boolean;
};

export type VikunjaTaskWrite = {
	title?: string;
	description?: string;
	done?: boolean;
	due_date?: string | null;
	repeat_after?: number;
	repeat_mode?: number;
	priority?: number;
	project_id?: number;
};

export type VikunjaProjectWrite = {
	title?: string;
	description?: string;
	hex_color?: string | null;
	parent_project_id?: number | null;
};
