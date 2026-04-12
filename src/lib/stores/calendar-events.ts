import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { AppCalendarEvent } from '$lib/api/calendar';
import { fetchCalendarEvents } from '$lib/api/troth/client';
import { calendarFeed } from './calendar-feed';

const STORAGE_KEY = 'troth.calendar.events.cache';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export type CalendarDayEventsState = {
	items: AppCalendarEvent[];
	loading: boolean;
	loaded: boolean;
	error: string | null;
	timezoneOffsetMinutes: number;
	lastFetchedAt: number | null;
};

export type CalendarEventsState = {
	days: Record<string, CalendarDayEventsState>;
};

type StoredCalendarEventsState = {
	days?: Record<
		string,
		{
			items?: AppCalendarEvent[];
			timezoneOffsetMinutes?: number;
			lastFetchedAt?: number;
		}
	>;
};

type StoredCalendarEventsCache = Record<string, StoredCalendarEventsState>;

const INITIAL_DAY_STATE: CalendarDayEventsState = {
	items: [],
	loading: false,
	loaded: false,
	error: null,
	timezoneOffsetMinutes: 0,
	lastFetchedAt: null
};

export function createCalendarEventsStore() {
	const initialState: CalendarEventsState = {
		days: {}
	};

	const { subscribe, set, update } = writable<CalendarEventsState>(initialState);
	let lastCalendarFeedKey = '';

	calendarFeed.subscribe(($calendarFeed) => {
		const nextKey = $calendarFeed.settings?.sessionKey ?? '';

		if (nextKey !== lastCalendarFeedKey) {
			lastCalendarFeedKey = nextKey;
			set(nextKey ? readStoredCalendarEvents(nextKey) : initialState);
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
		const hasFreshCache =
			state.loaded &&
			state.timezoneOffsetMinutes === timezoneOffsetMinutes &&
			state.lastFetchedAt !== null &&
			Date.now() - state.lastFetchedAt < CACHE_MAX_AGE_MS;

		if (state.loading || (!force && hasFreshCache)) {
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
			const nextState: CalendarDayEventsState = {
				items,
				loading: false,
				loaded: true,
				error: null,
				timezoneOffsetMinutes,
				lastFetchedAt: Date.now()
			};

			update((value) => ({
				...value,
				days: {
					...value.days,
					[day]: nextState
				}
			}));
			writeStoredCalendarEvents(lastCalendarFeedKey, get({ subscribe }));
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
						timezoneOffsetMinutes,
						lastFetchedAt: value.days[day]?.lastFetchedAt ?? null
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

function readStoredCalendarEvents(feedKey: string): CalendarEventsState {
	if (!browser) {
		return {
			days: {}
		};
	}

	const cache = readStoredCache();
	const storedState = cache[feedKey];

	if (!storedState?.days) {
		return {
			days: {}
		};
	}

	return {
		days: Object.fromEntries(
			Object.entries(storedState.days).map(([day, state]) => [
				day,
				{
					items: Array.isArray(state.items) ? state.items : [],
					loading: false,
					loaded: Array.isArray(state.items),
					error: null,
					timezoneOffsetMinutes:
						typeof state.timezoneOffsetMinutes === 'number' ? state.timezoneOffsetMinutes : 0,
					lastFetchedAt: typeof state.lastFetchedAt === 'number' ? state.lastFetchedAt : null
				} satisfies CalendarDayEventsState
			])
		)
	};
}

function writeStoredCalendarEvents(feedKey: string, state: CalendarEventsState) {
	if (!browser || !feedKey) {
		return;
	}

	const cache = readStoredCache();
	cache[feedKey] = {
		days: Object.fromEntries(
			Object.entries(state.days)
				.filter(([, dayState]) => dayState.loaded)
				.map(([day, dayState]) => [
					day,
					{
						items: dayState.items,
						timezoneOffsetMinutes: dayState.timezoneOffsetMinutes,
						lastFetchedAt: dayState.lastFetchedAt ?? Date.now()
					}
				])
		)
	};

	localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function readStoredCache(): StoredCalendarEventsCache {
	if (!browser) {
		return {};
	}

	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {};
	}

	try {
		const parsed = JSON.parse(raw) as StoredCalendarEventsCache;
		return parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {};
	}
}
