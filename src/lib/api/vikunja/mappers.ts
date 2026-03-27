import type {
	AppList,
	AppSavedFilter,
	AppTask,
	CreateProjectInput,
	CreateTaskInput,
	UpdateProjectInput,
	UpdateTaskInput,
	VikunjaProject,
	VikunjaProjectWrite,
	VikunjaSavedFilter,
	VikunjaTask,
	VikunjaTaskWrite
} from './types';

export function mapProjectToList(project: VikunjaProject): AppList {
	return {
		id: project.id,
		title: project.title,
		description: project.description ?? '',
		isArchived: project.is_archived ?? false,
		color: normalizeProjectColor(project.hex_color),
		identifier: project.identifier ?? null,
		parentId: project.parent_project_id ?? null
	};
}

export function mapProjectToSavedFilter(project: VikunjaProject): AppSavedFilter {
	return {
		id: project.id,
		title: project.title,
		description: project.description ?? '',
		position: typeof project.position === 'number' ? project.position : null
	};
}

export function isSavedFilter(
	candidate: VikunjaProject | VikunjaSavedFilter
): candidate is VikunjaSavedFilter {
	return 'filters' in candidate;
}

export function isProjectLike(
	candidate: VikunjaProject | VikunjaSavedFilter
): candidate is VikunjaProject {
	return (
		'is_archived' in candidate ||
		'hex_color' in candidate ||
		'identifier' in candidate ||
		'parent_project_id' in candidate ||
		'position' in candidate ||
		'max_permission' in candidate ||
		'views' in candidate
	);
}

export function mapTaskToAppTask(task: VikunjaTask): AppTask {
	return {
		id: task.id,
		title: task.title,
		description: task.description ?? '',
		completed: task.done ?? false,
		completedAt: task.done_at ?? null,
		dueDate: task.due_date ?? null,
		repeatAfter: task.repeat_after ?? null,
		repeatMode: task.repeat_mode ?? null,
		priority: task.priority ?? 0,
		listId: task.project_id ?? null,
		parentTaskId: getParentTaskId(task),
		identifier: task.identifier ?? null,
		createdAt: task.created ?? null,
		updatedAt: task.updated ?? null
	};
}

export function mapCreateTaskInput(input: CreateTaskInput): VikunjaTaskWrite {
	return {
		title: input.title.trim(),
		due_date: input.dueDate ?? null,
		priority: input.priority ?? 0
	};
}

export function mapCreateProjectInput(input: CreateProjectInput): VikunjaProjectWrite {
	return {
		title: input.title.trim(),
		description: input.description?.trim() ?? '',
		hex_color: normalizeProjectColor(input.color),
		parent_project_id: input.parentId ?? null
	};
}

export function mapUpdateProjectInput(input: UpdateProjectInput): VikunjaProjectWrite {
	return {
		title: input.title.trim(),
		description: input.description?.trim() ?? '',
		hex_color: normalizeProjectColor(input.color),
		parent_project_id: input.parentId ?? null
	};
}

export function mapUpdateTaskInput(input: UpdateTaskInput): VikunjaTaskWrite {
	return {
		title: input.title.trim(),
		description: input.description.trim(),
		due_date: input.dueDate,
		repeat_after: input.repeatAfter ?? 0,
		repeat_mode: input.repeatMode ?? 0,
		priority: input.priority,
		project_id: input.listId,
		done: input.completed
	};
}

function getParentTaskId(task: VikunjaTask) {
	return task.related_tasks?.parenttask?.[0]?.id ?? null;
}

function normalizeProjectColor(color: string | null | undefined) {
	if (!color) {
		return null;
	}

	const normalized = color.trim();

	if (!normalized) {
		return null;
	}

	if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) {
		return normalized;
	}

	if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) {
		return `#${normalized}`;
	}

	return normalized;
}
