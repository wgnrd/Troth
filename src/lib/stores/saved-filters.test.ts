import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	AppSavedFilter,
	CreateSavedFilterInput,
	UpdateSavedFilterInput
} from '$lib/api/vikunja';

const {
	createSavedFilterMock,
	deleteSavedFilterMock,
	fetchSavedFiltersMock,
	updateSavedFilterMock
} = vi.hoisted(() => ({
	createSavedFilterMock: vi.fn<(input: CreateSavedFilterInput) => Promise<AppSavedFilter>>(),
	deleteSavedFilterMock: vi.fn<(id: number) => Promise<void>>(),
	fetchSavedFiltersMock: vi.fn<() => Promise<AppSavedFilter[]>>(),
	updateSavedFilterMock: vi.fn<(input: UpdateSavedFilterInput) => Promise<AppSavedFilter>>()
}));

vi.mock('$lib/api/troth/client', () => ({
	connectSession: vi.fn(),
	createSavedFilter: createSavedFilterMock,
	deleteSavedFilter: deleteSavedFilterMock,
	disconnectSession: vi.fn(),
	fetchSavedFilters: fetchSavedFiltersMock,
	updateSavedFilter: updateSavedFilterMock
}));

import { connection } from './connection';
import { savedFilters } from './saved-filters';

describe('savedFilters store', () => {
	let serverFilters: AppSavedFilter[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		connection.hydrate({
			baseUrl: 'https://example.com/api/v1',
			sessionKey: 'session-key'
		});

		serverFilters = [
			buildFilter({
				id: 1,
				title: 'Today and urgent',
				query: {
					filter: 'done = false && priority >= 3',
					filterIncludeNulls: false,
					orderBy: ['asc'],
					search: '',
					sortBy: ['due_date']
				}
			})
		];

		fetchSavedFiltersMock.mockImplementation(async () => cloneFilters(serverFilters));
		createSavedFilterMock.mockImplementation(async (input) => {
			const created = buildFilter({
				id: 2,
				title: input.title,
				description: input.description ?? '',
				query: input.query,
				isFavorite: input.isFavorite ?? false
			});

			serverFilters = [...serverFilters, created];
			return created;
		});
		updateSavedFilterMock.mockImplementation(async (input) => {
			const updated = buildFilter({
				id: input.id,
				title: input.title,
				description: input.description ?? '',
				query: input.query,
				isFavorite: input.isFavorite ?? false
			});

			serverFilters = serverFilters.map((filter) => (filter.id === input.id ? updated : filter));
			return updated;
		});
		deleteSavedFilterMock.mockImplementation(async (id) => {
			serverFilters = serverFilters.filter((filter) => filter.id !== id);
		});
	});

	it('loads and mutates saved filters', async () => {
		await savedFilters.load(true);
		await savedFilters.createSavedFilter({
			title: 'Search release notes',
			description: '',
			query: {
				filter: '',
				filterIncludeNulls: false,
				orderBy: [],
				search: 'release notes',
				sortBy: []
			},
			isFavorite: true
		});
		await savedFilters.updateSavedFilter({
			id: 1,
			title: 'Today, urgent, and favorite',
			description: 'Pinned for triage',
			query: {
				filter: 'done = false && priority >= 3',
				filterIncludeNulls: true,
				orderBy: ['asc'],
				search: '',
				sortBy: ['due_date']
			},
			isFavorite: true
		});
		await savedFilters.deleteSavedFilter(2);

		const state = get(savedFilters);

		expect(fetchSavedFiltersMock).toHaveBeenCalledTimes(1);
		expect(createSavedFilterMock).toHaveBeenCalledTimes(1);
		expect(updateSavedFilterMock).toHaveBeenCalledTimes(1);
		expect(deleteSavedFilterMock).toHaveBeenCalledWith(2);
		expect(state.items).toEqual([
			expect.objectContaining({
				id: 1,
				title: 'Today, urgent, and favorite',
				isFavorite: true,
				query: expect.objectContaining({ filterIncludeNulls: true })
			})
		]);
		expect(state.mutationError).toBeNull();
	});

	it('resets when the connection changes', async () => {
		await savedFilters.load(true);
		connection.hydrate(null);

		const state = get(savedFilters);

		expect(state.items).toEqual([]);
		expect(state.loaded).toBe(false);
		expect(state.error).toBeNull();
	});
});

function buildFilter(
	overrides: Partial<AppSavedFilter> & Pick<AppSavedFilter, 'id' | 'title'>
): AppSavedFilter {
	return {
		id: overrides.id,
		title: overrides.title,
		description: overrides.description ?? '',
		query: overrides.query ?? {
			filter: '',
			filterIncludeNulls: false,
			orderBy: [],
			search: '',
			sortBy: []
		},
		isFavorite: overrides.isFavorite ?? false,
		queryAvailable: overrides.queryAvailable ?? true,
		writeSupported: overrides.writeSupported ?? true,
		createdAt: overrides.createdAt ?? '2026-04-11T10:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-04-11T10:00:00.000Z'
	};
}

function cloneFilters(filters: AppSavedFilter[]) {
	return filters.map((filter) => ({
		...filter,
		query: {
			...filter.query,
			orderBy: [...filter.query.orderBy],
			sortBy: [...filter.query.sortBy]
		}
	}));
}
