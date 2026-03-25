import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { AppList } from '$lib/api/vikunja';

const STORAGE_KEY = 'troth.projects.preferences';

export type ProjectPreferencesState = {
	hiddenProjectIds: number[];
	expandedProjectIds: number[];
};

function createProjectPreferencesStore() {
	const initialState: ProjectPreferencesState = browser
		? readStoredPreferences()
		: {
				hiddenProjectIds: [],
				expandedProjectIds: []
			};

	const { subscribe, update } = writable<ProjectPreferencesState>(initialState);

	function toggleHidden(lists: AppList[], projectId: number) {
		update((state) => {
			const hiddenProjectIds = state.hiddenProjectIds.includes(projectId)
				? state.hiddenProjectIds.filter((id) => id !== projectId)
				: [...state.hiddenProjectIds, projectId];

			const nextState = {
				...state,
				hiddenProjectIds: sanitizeIds(hiddenProjectIds, lists),
				expandedProjectIds: sanitizeIds(state.expandedProjectIds, lists)
			};

			writeStoredPreferences(nextState);
			return nextState;
		});
	}

	function toggleCollapsed(projectId: number) {
		update((state) => {
			const expandedProjectIds = state.expandedProjectIds.includes(projectId)
				? state.expandedProjectIds.filter((id) => id !== projectId)
				: [...state.expandedProjectIds, projectId];

			const nextState = {
				...state,
				expandedProjectIds
			};

			writeStoredPreferences(nextState);
			return nextState;
		});
	}

	return {
		subscribe,
		toggleHidden,
		toggleCollapsed
	};
}

export const projectPreferences = createProjectPreferencesStore();

function readStoredPreferences(): ProjectPreferencesState {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {
			hiddenProjectIds: [],
			expandedProjectIds: []
		};
	}

	try {
		const parsed = JSON.parse(raw) as Partial<ProjectPreferencesState>;

		return {
			hiddenProjectIds: Array.isArray(parsed.hiddenProjectIds)
				? parsed.hiddenProjectIds.filter((value): value is number => typeof value === 'number')
				: [],
			expandedProjectIds: Array.isArray(parsed.expandedProjectIds)
				? parsed.expandedProjectIds.filter((value): value is number => typeof value === 'number')
				: []
		};
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {
			hiddenProjectIds: [],
			expandedProjectIds: []
		};
	}
}

function writeStoredPreferences(state: ProjectPreferencesState) {
	if (!browser) {
		return;
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitizeIds(ids: number[], lists: AppList[]) {
	const validIds = new Set(lists.map((list) => list.id));
	return ids.filter((id) => validIds.has(id));
}
