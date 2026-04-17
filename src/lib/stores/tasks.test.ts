import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppTask, UpdateTaskInput } from '$lib/api/vikunja';
import type { TaskPageResponse } from '$lib/api/troth/client';

const { fetchTasksMock, updateTaskMock, toastPushMock } = vi.hoisted(() => ({
	fetchTasksMock: vi.fn<() => Promise<TaskPageResponse>>(),
	updateTaskMock:
		vi.fn<(input: UpdateTaskInput, currentParentTaskId?: number | null) => Promise<AppTask>>(),
	toastPushMock: vi.fn()
}));

vi.mock('$lib/api/troth/client', () => {
	class MockTrothTaskMutationError extends Error {
		status: number;
		task: AppTask | null;

		constructor(message: string, status = 500, task: AppTask | null = null) {
			super(message);
			this.name = 'TrothTaskMutationError';
			this.status = status;
			this.task = task;
		}
	}

	return {
		createTask: vi.fn(),
		deleteTask: vi.fn(),
		fetchTasks: fetchTasksMock,
		updateTask: updateTaskMock,
		TrothTaskMutationError: MockTrothTaskMutationError
	};
});

vi.mock('$lib/stores/toasts', () => ({
	toast: {
		push: toastPushMock
	}
}));

import { connection } from './connection';
import { createTasksStore } from './tasks';

describe('createTasksStore', () => {
	let serverTasks: AppTask[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		connection.hydrate({
			baseUrl: 'https://example.com/api/v1',
			sessionKey: 'session-key'
		});

		serverTasks = [
			buildTask({
				id: 1,
				title: 'Weekly review',
				dueDate: '2026-04-04T12:00:00.000Z',
				repeatAfter: 604800,
				repeatMode: 2
			}),
			buildTask({
				id: 2,
				title: 'Check project board',
				parentTaskId: 1,
				completed: true,
				completedAt: '2026-04-04T08:30:00.000Z'
			}),
			buildTask({
				id: 3,
				title: 'Write summary',
				parentTaskId: 1,
				completed: true,
				completedAt: '2026-04-04T08:45:00.000Z'
			})
		];

		fetchTasksMock.mockImplementation(async () => ({
			items: cloneTasks(serverTasks),
			hasMore: false,
			page: 1,
			view: 'all'
		}));
		updateTaskMock.mockImplementation(async (input) => {
			if (input.id === 1 && input.completed === true) {
				const staleParentResponse = cloneTask(
					serverTasks.find((task) => task.id === 1) ?? buildTask({ id: 1, title: 'Weekly review' })
				);

				serverTasks = serverTasks.map((task) => {
					if (task.id === 1) {
						return {
							...task,
							completed: false,
							completedAt: null,
							dueDate: '2026-04-11T12:00:00.000Z'
						};
					}

					return task;
				});

				return {
					...staleParentResponse,
					completed: true,
					completedAt: '2026-04-04T09:00:00.000Z'
				};
			}

			const existingTask = serverTasks.find((task) => task.id === input.id);

			if (!existingTask) {
				throw new Error(`Missing server task ${input.id}`);
			}

			const savedTask: AppTask = {
				...existingTask,
				title: input.title,
				description: input.description,
				startDate: input.startDate,
				endDate: input.endDate,
				dueDate: input.dueDate,
				repeatAfter: input.repeatAfter,
				repeatMode: input.repeatMode,
				priority: input.priority,
				listId: input.listId,
				parentTaskId: input.parentTaskId,
				completed: input.completed ?? existingTask.completed,
				completedAt:
					input.completed === undefined
						? existingTask.completedAt
						: input.completed
							? '2026-04-04T09:00:00.000Z'
							: null
			};

			serverTasks = serverTasks.map((task) => (task.id === savedTask.id ? savedTask : task));
			return cloneTask(savedTask);
		});
	});

	it('uses the refreshed recurring parent and reopens subtasks after completion', async () => {
		const store = createTasksStore();

		await store.load(true);
		await store.setCompleted(1, true, { showUndoToast: false });
		await store.refresh();

		const state = get(store);
		const recurringSubtasks = state.items.filter((task) => task.parentTaskId === 1);

		expect(updateTaskMock).toHaveBeenCalledTimes(3);
		expect(updateTaskMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				id: 2,
				completed: false,
				dueDate: '2026-04-11T12:00:00.000Z'
			}),
			1
		);
		expect(updateTaskMock).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({
				id: 3,
				completed: false,
				dueDate: '2026-04-11T12:00:00.000Z'
			}),
			1
		);
		expect(recurringSubtasks).toHaveLength(2);
		expect(recurringSubtasks.every((task) => !task.completed)).toBe(true);
		expect(recurringSubtasks.every((task) => task.dueDate === '2026-04-11T12:00:00.000Z')).toBe(
			true
		);
		expect(state.items.find((task) => task.id === 1)?.dueDate).toBe('2026-04-11T12:00:00.000Z');
	});
});

function buildTask(overrides: Partial<AppTask> & Pick<AppTask, 'id' | 'title'>): AppTask {
	return {
		id: overrides.id,
		title: overrides.title,
		description: overrides.description ?? '',
		completed: overrides.completed ?? false,
		completedAt: overrides.completedAt ?? null,
		startDate: overrides.startDate ?? null,
		endDate: overrides.endDate ?? null,
		dueDate: overrides.dueDate ?? '2026-04-04T12:00:00.000Z',
		repeatAfter: overrides.repeatAfter ?? null,
		repeatMode: overrides.repeatMode ?? null,
		priority: overrides.priority ?? 0,
		listId: overrides.listId ?? 10,
		parentTaskId: overrides.parentTaskId ?? null,
		identifier: overrides.identifier ?? null,
		createdAt: overrides.createdAt ?? '2026-04-04T08:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-04-04T08:00:00.000Z'
	};
}

function cloneTask(task: AppTask): AppTask {
	return { ...task };
}

function cloneTasks(tasks: AppTask[]) {
	return tasks.map(cloneTask);
}
