import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { AppTask } from '$lib/api/vikunja';
import { sortTasks } from '$lib/tasks/view';

const STORAGE_KEY = 'troth.subtasks.order';

type SubtaskOrderState = Record<string, number[]>;
function createSubtaskOrderStore() {
	const { subscribe, update } = writable<SubtaskOrderState>(browser ? readStoredOrder() : {});

	function reorder(parentTaskId: number, subtasks: AppTask[], taskId: number, targetIndex: number) {
		update((state) => {
			const key = String(parentTaskId);
			const orderedIds = getOrderedIds(subtasks, state[key] ?? []);
			const currentIndex = orderedIds.indexOf(taskId);

			if (currentIndex < 0) {
				return state;
			}

			const boundedTargetIndex = Math.max(0, Math.min(targetIndex, orderedIds.length - 1));

			if (boundedTargetIndex === currentIndex) {
				return state;
			}

			const nextIds = [...orderedIds];
			const [movedId] = nextIds.splice(currentIndex, 1);
			nextIds.splice(boundedTargetIndex, 0, movedId);

			const nextState = {
				...state,
				[key]: nextIds
			};

			writeStoredOrder(nextState);
			return nextState;
		});
	}

	return {
		subscribe,
		reorder
	};
}

export const subtaskOrder = createSubtaskOrderStore();

export function getOrderedSubtasks(
	parentTaskId: number,
	subtasks: AppTask[],
	orderState: SubtaskOrderState
) {
	const orderedIds = getOrderedIds(subtasks, orderState[String(parentTaskId)] ?? []);
	const taskById = new Map(subtasks.map((task) => [task.id, task]));

	return orderedIds
		.map((id) => taskById.get(id) ?? null)
		.filter((task): task is AppTask => task !== null);
}

function readStoredOrder() {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {};
	}

	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const entries = Object.entries(parsed).map(([key, value]) => [
			key,
			Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []
		]);

		return Object.fromEntries(entries);
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {};
	}
}

function writeStoredOrder(state: SubtaskOrderState) {
	if (!browser) {
		return;
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getOrderedIds(subtasks: AppTask[], storedIds: number[]) {
	const sortedSubtasks = sortTasks(subtasks);
	const sortedIds = sortedSubtasks.map((task) => task.id);
	const validIds = new Set(sortedIds);
	const prioritizedIds = storedIds.filter((id) => validIds.has(id));
	const remainingIds = sortedIds.filter((id) => !prioritizedIds.includes(id));

	return [...prioritizedIds, ...remainingIds];
}
