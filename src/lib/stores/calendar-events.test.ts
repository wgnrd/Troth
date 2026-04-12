import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppCalendarEvent } from '$lib/api/calendar';

const { fetchCalendarEventsMock, localStorageMock } = vi.hoisted(() => ({
	fetchCalendarEventsMock: vi.fn<() => Promise<AppCalendarEvent[]>>(),
	localStorageMock: createLocalStorageMock()
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

vi.mock('$lib/api/troth/client', () => ({
	fetchCalendarEvents: fetchCalendarEventsMock
}));

import { calendarFeed } from './calendar-feed';
import { createCalendarEventsStore } from './calendar-events';

describe('createCalendarEventsStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('localStorage', localStorageMock);
		localStorage.clear();
		calendarFeed.hydrate({
			label: 'Team calendar',
			sessionKey: 'calendar-session',
			urlHost: 'calendar.example.com'
		});
	});

	it('hydrates cached day entries immediately and refreshes stale entries in the background', async () => {
		localStorage.setItem(
			'troth.calendar.events.cache',
			JSON.stringify({
				'calendar-session': {
					days: {
						'2026-04-13': {
							items: [buildEvent('cached-event', 'Cached standup')],
							timezoneOffsetMinutes: 0,
							lastFetchedAt: Date.now() - 10 * 60 * 1000
						}
					}
				}
			})
		);

		const store = createCalendarEventsStore();
		calendarFeed.hydrate({
			label: 'Team calendar',
			sessionKey: 'calendar-session',
			urlHost: 'calendar.example.com'
		});

		expect(get(store).days['2026-04-13']?.items).toEqual([
			buildEvent('cached-event', 'Cached standup')
		]);

		let resolveFetch: (events: AppCalendarEvent[]) => void = () => {
			throw new Error('Expected calendar fetch to start.');
		};
		fetchCalendarEventsMock.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFetch = resolve;
				})
		);

		const loadPromise = store.load('2026-04-13');

		expect(get(store).days['2026-04-13']).toMatchObject({
			items: [buildEvent('cached-event', 'Cached standup')],
			loading: true,
			loaded: true
		});

		resolveFetch([buildEvent('fresh-event', 'Fresh standup')]);
		await loadPromise;

		expect(get(store).days['2026-04-13']).toMatchObject({
			items: [buildEvent('fresh-event', 'Fresh standup')],
			loading: false,
			loaded: true,
			error: null
		});
	});
});

function buildEvent(id: string, title: string): AppCalendarEvent {
	return {
		id,
		title,
		start: '2026-04-13T09:00:00.000Z',
		end: '2026-04-13T09:15:00.000Z',
		allDay: false,
		sourceLabel: 'Team calendar'
	};
}

function createLocalStorageMock() {
	const store = new Map<string, string>();

	return {
		getItem(key: string) {
			return store.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			store.set(key, value);
		},
		removeItem(key: string) {
			store.delete(key);
		},
		clear() {
			store.clear();
		}
	};
}
