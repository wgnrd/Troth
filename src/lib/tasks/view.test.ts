import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppList, AppTask } from '$lib/api/vikunja';
import { filterTasksForView, UPCOMING_DAY_WINDOW } from './view';

describe('filterTasksForView backlog', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-11T09:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps tasks with no due date or outside the next seven days', () => {
		const lists = [buildList({ id: 10, title: 'Inbox' })];
		const tasks = [
			buildTask({ id: 1, title: 'No due date', dueDate: null }),
			buildTask({ id: 2, title: 'Overdue', dueDate: '2026-04-10T12:00:00.000Z' }),
			buildTask({ id: 3, title: 'Today', dueDate: '2026-04-11T12:00:00.000Z' }),
			buildTask({ id: 4, title: 'Inside window', dueDate: '2026-04-16T12:00:00.000Z' }),
			buildTask({
				id: 5,
				title: 'Outside window',
				dueDate: `2026-04-${String(11 + UPCOMING_DAY_WINDOW).padStart(2, '0')}T12:00:00.000Z`
			}),
			buildTask({ id: 6, title: 'Completed backlog', dueDate: null, completed: true })
		];

		expect(filterTasksForView('backlog', tasks, lists).map((task) => task.id)).toEqual([1, 2, 5]);
	});
});

function buildList(overrides: Partial<AppList> & Pick<AppList, 'id' | 'title'>): AppList {
	return {
		id: overrides.id,
		title: overrides.title,
		description: overrides.description ?? '',
		isArchived: overrides.isArchived ?? false,
		color: overrides.color ?? null,
		identifier: overrides.identifier ?? null,
		parentId: overrides.parentId ?? null
	};
}

function buildTask(overrides: Partial<AppTask> & Pick<AppTask, 'id' | 'title'>): AppTask {
	return {
		id: overrides.id,
		title: overrides.title,
		description: overrides.description ?? '',
		completed: overrides.completed ?? false,
		completedAt: overrides.completedAt ?? null,
		dueDate: overrides.dueDate ?? null,
		repeatAfter: overrides.repeatAfter ?? null,
		repeatMode: overrides.repeatMode ?? null,
		priority: overrides.priority ?? 0,
		listId: overrides.listId ?? 10,
		parentTaskId: overrides.parentTaskId ?? null,
		identifier: overrides.identifier ?? null,
		createdAt: overrides.createdAt ?? '2026-04-11T08:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-04-11T08:00:00.000Z'
	};
}
