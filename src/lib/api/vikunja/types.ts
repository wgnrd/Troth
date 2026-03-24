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
	priority?: number;
	project_id?: number;
	identifier?: string;
	created?: string;
	updated?: string;
};

export type VikunjaProject = {
	id: number;
	title: string;
	description?: string;
	is_archived?: boolean;
	hex_color?: string;
	identifier?: string;
	created?: string;
	updated?: string;
};

export type AppList = {
	id: number;
	title: string;
	description: string;
	isArchived: boolean;
	color: string | null;
	identifier: string | null;
};

export type AppTask = {
	id: number;
	title: string;
	description: string;
	completed: boolean;
	completedAt: string | null;
	dueDate: string | null;
	priority: number;
	listId: number | null;
	identifier: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type CreateTaskInput = {
	title: string;
	listId: number;
	dueDate?: string | null;
	priority?: number;
};

export type UpdateTaskInput = {
	id: number;
	title: string;
	description: string;
	dueDate: string | null;
	priority: number;
	listId: number;
	completed?: boolean;
};

export type VikunjaTaskWrite = {
	title?: string;
	description?: string;
	done?: boolean;
	due_date?: string | null;
	priority?: number;
	project_id?: number;
};
