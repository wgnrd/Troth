import { get, writable } from 'svelte/store';
import { VikunjaClient } from '$lib/api/vikunja';
import type { AppList, CreateProjectInput, UpdateProjectInput } from '$lib/api/vikunja';
import { getDescendantProjectIds } from '$lib/lists/tree';
import { connection } from './connection';

export type ListsState = {
	items: AppList[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	mutationError: string | null;
	creating: boolean;
	mutatingIds: number[];
};

function createListsStore() {
	const initialState: ListsState = {
		items: [],
		loading: false,
		loaded: false,
		error: null,
		mutationError: null,
		creating: false,
		mutatingIds: []
	};

	const { subscribe, set, update } = writable<ListsState>(initialState);
	let lastConnectionKey = '';

	connection.subscribe(($connection) => {
		const nextKey = $connection.settings
			? `${$connection.settings.baseUrl}|${$connection.settings.token}`
			: '';

		if (nextKey !== lastConnectionKey) {
			lastConnectionKey = nextKey;
			set(initialState);
		}
	});

	async function load(force = false) {
		const current = get(connection);

		if (!current.settings) {
			set({
				...initialState,
				error: 'Add your Vikunja connection in Settings to load projects.'
			});
			return;
		}

		const state = get({ subscribe });
		if (state.loading || (state.loaded && !force)) {
			return;
		}

		update((value) => ({ ...value, loading: true, error: null, mutationError: null }));

		try {
			const client = new VikunjaClient(current.settings);
			const items = await client.fetchProjects();
			set({
				items,
				loading: false,
				loaded: true,
				error: null,
				mutationError: null,
				creating: false,
				mutatingIds: []
			});
		} catch (error) {
			update((value) => ({
				...value,
				loading: false,
				loaded: value.loaded,
				error: error instanceof Error ? error.message : 'Could not load projects.'
			}));
		}
	}

	async function createProject(input: CreateProjectInput) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before creating projects.'
			}));
			return null;
		}

		update((state) => ({
			...state,
			creating: true,
			mutationError: null
		}));

		try {
			const client = new VikunjaClient(current.settings);
			const createdProject = await client.createProject(input);

			update((state) => ({
				...state,
				creating: false,
				items: [...state.items, createdProject]
			}));

			return createdProject;
		} catch (error) {
			update((state) => ({
				...state,
				creating: false,
				mutationError: error instanceof Error ? error.message : 'Could not create the project.'
			}));
			return null;
		}
	}

	async function updateProject(input: UpdateProjectInput) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before updating projects.'
			}));
			return null;
		}

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, input.id]
		}));

		try {
			const client = new VikunjaClient(current.settings);
			const updatedProject = await client.updateProject(input);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((id) => id !== input.id),
				items: state.items.map((item) => (item.id === input.id ? updatedProject : item))
			}));

			return updatedProject;
		} catch (error) {
			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((id) => id !== input.id),
				mutationError: error instanceof Error ? error.message : 'Could not update the project.'
			}));
			return null;
		}
	}

	async function deleteProject(id: number) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before deleting projects.'
			}));
			return null;
		}

		const snapshot = get({ subscribe }).items;
		const projectIdsToRemove = getDescendantProjectIds(snapshot, id);

		if (projectIdsToRemove.length === 0) {
			return null;
		}

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, ...projectIdsToRemove],
			items: state.items.filter((item) => !projectIdsToRemove.includes(item.id))
		}));

		try {
			const client = new VikunjaClient(current.settings);
			await client.deleteProject(id);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter(
					(projectId) => !projectIdsToRemove.includes(projectId)
				)
			}));

			return projectIdsToRemove;
		} catch (error) {
			update((state) => ({
				...state,
				items: snapshot,
				mutatingIds: state.mutatingIds.filter(
					(projectId) => !projectIdsToRemove.includes(projectId)
				),
				mutationError: error instanceof Error ? error.message : 'Could not delete the project.'
			}));
			return null;
		}
	}

	function clearMutationError() {
		update((state) => ({ ...state, mutationError: null }));
	}

	return {
		subscribe,
		load,
		refresh: () => load(true),
		createProject,
		updateProject,
		deleteProject,
		clearMutationError
	};
}

export const lists = createListsStore();
