import { get, writable } from 'svelte/store';
import type {
	AppSavedFilter,
	CreateSavedFilterInput,
	UpdateSavedFilterInput
} from '$lib/api/vikunja';
import {
	createSavedFilter as createTrothSavedFilter,
	deleteSavedFilter as deleteTrothSavedFilter,
	fetchSavedFilters,
	updateSavedFilter as updateTrothSavedFilter
} from '$lib/api/troth/client';
import { connection } from './connection';

export type SavedFiltersState = {
	items: AppSavedFilter[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	mutationError: string | null;
	creating: boolean;
	mutatingIds: number[];
};

function createSavedFiltersStore() {
	const initialState: SavedFiltersState = {
		items: [],
		loading: false,
		loaded: false,
		error: null,
		mutationError: null,
		creating: false,
		mutatingIds: []
	};

	const { subscribe, set, update } = writable<SavedFiltersState>(initialState);
	let lastConnectionKey = '';

	connection.subscribe(($connection) => {
		const nextKey = $connection.settings
			? `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`
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
				error: 'Add your Vikunja connection in Settings to load saved filters.'
			});
			return;
		}

		const state = get({ subscribe });
		if (state.loading || (state.loaded && !force)) {
			return;
		}

		update((value) => ({ ...value, loading: true, error: null, mutationError: null }));

		try {
			const items = await fetchSavedFilters();

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
				error: error instanceof Error ? error.message : 'Could not load saved filters.'
			}));
		}
	}

	async function createSavedFilter(input: CreateSavedFilterInput) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before creating saved filters.'
			}));
			return null;
		}

		update((state) => ({
			...state,
			creating: true,
			mutationError: null
		}));

		try {
			const createdFilter = await createTrothSavedFilter(input);

			update((state) => ({
				...state,
				creating: false,
				items: sortSavedFilters([...state.items, createdFilter])
			}));

			return createdFilter;
		} catch (error) {
			update((state) => ({
				...state,
				creating: false,
				mutationError: error instanceof Error ? error.message : 'Could not create the saved filter.'
			}));
			return null;
		}
	}

	async function updateSavedFilter(input: UpdateSavedFilterInput) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before updating saved filters.'
			}));
			return null;
		}

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, input.id]
		}));

		try {
			const updatedFilter = await updateTrothSavedFilter(input);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((id) => id !== input.id),
				items: sortSavedFilters(
					state.items.map((item) => (item.id === input.id ? updatedFilter : item))
				)
			}));

			return updatedFilter;
		} catch (error) {
			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((id) => id !== input.id),
				mutationError: error instanceof Error ? error.message : 'Could not update the saved filter.'
			}));
			return null;
		}
	}

	async function deleteSavedFilter(id: number) {
		const current = get(connection);

		if (!current.settings) {
			update((state) => ({
				...state,
				mutationError: 'Add your Vikunja connection in Settings before deleting saved filters.'
			}));
			return false;
		}

		const snapshot = get({ subscribe }).items;

		update((state) => ({
			...state,
			mutationError: null,
			mutatingIds: [...state.mutatingIds, id],
			items: state.items.filter((item) => item.id !== id)
		}));

		try {
			await deleteTrothSavedFilter(id);

			update((state) => ({
				...state,
				mutatingIds: state.mutatingIds.filter((value) => value !== id)
			}));

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				items: snapshot,
				mutatingIds: state.mutatingIds.filter((value) => value !== id),
				mutationError: error instanceof Error ? error.message : 'Could not delete the saved filter.'
			}));
			return false;
		}
	}

	function clearMutationError() {
		update((state) => ({ ...state, mutationError: null }));
	}

	return {
		subscribe,
		load,
		refresh: () => load(true),
		createSavedFilter,
		updateSavedFilter,
		deleteSavedFilter,
		clearMutationError
	};
}

export const savedFilters = createSavedFiltersStore();

export function sortSavedFilters(items: AppSavedFilter[]) {
	return [...items].sort((left, right) => {
		if (left.isFavorite !== right.isFavorite) {
			return left.isFavorite ? -1 : 1;
		}

		return left.title.localeCompare(right.title);
	});
}
