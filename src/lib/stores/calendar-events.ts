import { get, writable } from 'svelte/store';
import type { AppCalendarEvent } from '$lib/api/calendar';
import { fetchCalendarEvents } from '$lib/api/troth/client';
import { calendarFeed } from './calendar-feed';

export type CalendarDayEventsState = {
	items: AppCalendarEvent[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	timezoneOffsetMinutes: number;
};

export type CalendarEventsState = {
	days: Record<string, CalendarDayEventsState>;
};

const INITIAL_DAY_STATE: CalendarDayEventsState = {
	items: [],
	loading: false,
	loaded: false,
	error: null,
	timezoneOffsetMinutes: 0
};

function createCalendarEventsStore() {
	const initialState: CalendarEventsState = {
		days: {}
	};

	const { subscribe, set, update } = writable<CalendarEventsState>(initialState);
	let lastCalendarFeedKey = '';

	calendarFeed.subscribe(($calendarFeed) => {
		const nextKey = $calendarFeed.settings?.sessionKey ?? '';

		if (nextKey !== lastCalendarFeedKey) {
			lastCalendarFeedKey = nextKey;
			set(initialState);
		}
	});

	async function load(day: string, force = false) {
		const currentFeed = get(calendarFeed);

		if (!currentFeed.settings) {
			set(initialState);
			return;
		}

		const timezoneOffsetMinutes = new Date().getTimezoneOffset();
		const state = get({ subscribe }).days[day] ?? INITIAL_DAY_STATE;

		if (
			state.loading ||
			(!force && state.loaded && state.timezoneOffsetMinutes === timezoneOffsetMinutes)
		) {
			return;
		}

		update((value) => ({
			...value,
			days: {
				...value.days,
				[day]: {
					...(value.days[day] ?? INITIAL_DAY_STATE),
					loading: true,
					error: null,
					timezoneOffsetMinutes
				}
			}
		}));

		try {
			const items = await fetchCalendarEvents(day, timezoneOffsetMinutes);

			update((value) => ({
				...value,
				days: {
					...value.days,
					[day]: {
						items,
						loading: false,
						loaded: true,
						error: null,
						timezoneOffsetMinutes
					}
				}
			}));
		} catch (error) {
			update((value) => ({
				...value,
				days: {
					...value.days,
					[day]: {
						...(value.days[day] ?? INITIAL_DAY_STATE),
						items: value.days[day]?.items ?? [],
						loading: false,
						loaded: value.days[day]?.loaded ?? false,
						error: error instanceof Error ? error.message : 'Could not load calendar events.',
						timezoneOffsetMinutes
					}
				}
			}));
		}
	}

	async function loadMany(days: string[], force = false) {
		const uniqueDays = [...new Set(days.filter((day) => day && day !== 'no-date'))];

		await Promise.all(uniqueDays.map((day) => load(day, force)));
	}

	async function refresh(day: string) {
		await load(day, true);
	}

	function getDay(day: string) {
		return get({ subscribe }).days[day] ?? INITIAL_DAY_STATE;
	}

	return {
		subscribe,
		getDay,
		load,
		loadMany,
		refresh
	};
}

export const calendarEvents = createCalendarEventsStore();
