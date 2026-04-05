import { get, writable } from 'svelte/store';
import type { AppCalendarEvent } from '$lib/api/calendar';
import { getMockCalendarEvents } from '$lib/calendar/mock';
import { fetchCalendarEvents } from '$lib/api/troth/client';
import { calendarFeed } from './calendar-feed';
import { calendarPreviewPreferences } from './calendar-preview-preferences';

export type CalendarEventsState = {
	items: AppCalendarEvent[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	day: string | null;
	timezoneOffsetMinutes: number;
};

function createCalendarEventsStore() {
	const initialState: CalendarEventsState = {
		items: [],
		loading: false,
		loaded: false,
		error: null,
		day: null,
		timezoneOffsetMinutes: 0
	};

	const { subscribe, set, update } = writable<CalendarEventsState>(initialState);
	let lastCalendarFeedKey = '';
	let lastMockCalendarEnabled = false;

	calendarFeed.subscribe(($calendarFeed) => {
		const nextKey = $calendarFeed.settings?.sessionKey ?? '';

		if (nextKey !== lastCalendarFeedKey) {
			lastCalendarFeedKey = nextKey;
			set(initialState);
		}
	});

	calendarPreviewPreferences.subscribe(($preferences) => {
		if ($preferences.mockCalendarEnabled !== lastMockCalendarEnabled) {
			lastMockCalendarEnabled = $preferences.mockCalendarEnabled;
			set(initialState);
		}
	});

	async function load(day: string, force = false) {
		const currentFeed = get(calendarFeed);
		const preferences = get(calendarPreviewPreferences);

		if (!currentFeed.settings && preferences.mockCalendarEnabled) {
			set({
				items: getMockCalendarEvents(day),
				loading: false,
				loaded: true,
				error: null,
				day,
				timezoneOffsetMinutes: new Date().getTimezoneOffset()
			});
			return;
		}

		if (!currentFeed.settings) {
			set({
				...initialState,
				error: null,
				day
			});
			return;
		}

		const timezoneOffsetMinutes = new Date().getTimezoneOffset();
		const state = get({ subscribe });

		if (
			state.loading ||
			(!force &&
				state.loaded &&
				state.day === day &&
				state.timezoneOffsetMinutes === timezoneOffsetMinutes)
		) {
			return;
		}

		update((value) => ({
			...value,
			loading: true,
			error: null,
			day,
			timezoneOffsetMinutes
		}));

		try {
			const items = await fetchCalendarEvents(day, timezoneOffsetMinutes);

			set({
				items,
				loading: false,
				loaded: true,
				error: null,
				day,
				timezoneOffsetMinutes
			});
		} catch (error) {
			update((value) => ({
				...value,
				items: value.day === day ? value.items : [],
				loading: false,
				loaded: value.loaded,
				error: error instanceof Error ? error.message : 'Could not load calendar events.',
				day,
				timezoneOffsetMinutes
			}));
		}
	}

	async function refresh() {
		const state = get({ subscribe });

		if (!state.day) {
			return;
		}

		await load(state.day, true);
	}

	return {
		subscribe,
		load,
		refresh
	};
}

export const calendarEvents = createCalendarEventsStore();
