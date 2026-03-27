import { get, writable } from 'svelte/store';
import { VikunjaClient } from '$lib/api/vikunja';
import type { AppSavedFilter } from '$lib/api/vikunja';
import { connection } from './connection';

export type SavedFiltersState = {
	items: AppSavedFilter[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
};

function createSavedFiltersStore() {
	const initialState: SavedFiltersState = {
		items: [],
		loading: false,
		loaded: false,
		error: null
	};

	const { subscribe, set, update } = writable<SavedFiltersState>(initialState);
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
				error: 'Add your Vikunja connection in Settings to load saved filters.'
			});
			return;
		}

		const state = get({ subscribe });
		if (state.loading || (state.loaded && !force)) {
			return;
		}

		update((value) => ({ ...value, loading: true, error: null }));

		try {
			const client = new VikunjaClient(current.settings);
			const items = await client.fetchSavedFilters();

			set({
				items,
				loading: false,
				loaded: true,
				error: null
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

	return {
		subscribe,
		load,
		refresh: () => load(true)
	};
}

export const savedFilters = createSavedFiltersStore();
