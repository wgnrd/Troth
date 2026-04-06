import { writable } from 'svelte/store';
import {
	CalendarFeedClientError,
	normalizeCalendarFeedLabel,
	normalizeCalendarFeedUrl,
	type CalendarFeedSummary
} from '$lib/api/calendar';
import { connectCalendarFeed, disconnectCalendarFeed, TrothApiError } from '$lib/api/troth/client';

export type CalendarFeedDetails = CalendarFeedSummary;

export type CalendarFeedState = {
	settings: CalendarFeedDetails | null;
	status: 'idle' | 'checking' | 'connected' | 'error';
	error: string | null;
};

function createCalendarFeedStore() {
	const initialState: CalendarFeedState = {
		settings: null,
		status: 'idle',
		error: null
	};

	const { subscribe, set, update } = writable<CalendarFeedState>(initialState);

	async function connect(input: { url: string; label?: string | null }) {
		try {
			normalizeCalendarFeedUrl(input.url);
			normalizeCalendarFeedLabel(input.label);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Could not validate the ICS feed details.';
			update((state) => ({ ...state, status: 'error', error: message }));
			return false;
		}

		update((state) => ({
			...state,
			status: 'checking',
			error: null
		}));

		try {
			const settings = await connectCalendarFeed(input);

			set({
				settings,
				status: 'connected',
				error: null
			});

			return true;
		} catch (error) {
			update((state) => ({
				...state,
				status: 'error',
				error: toMessage(error)
			}));
			return false;
		}
	}

	async function disconnect() {
		await disconnectCalendarFeed();

		set({
			settings: null,
			status: 'idle',
			error: null
		});
	}

	return {
		subscribe,
		connect,
		disconnect,
		hydrate(settings: CalendarFeedDetails | null) {
			set({
				settings,
				status: settings ? 'connected' : 'idle',
				error: null
			});
		}
	};
}

export const calendarFeed = createCalendarFeedStore();

function toMessage(error: unknown) {
	if (
		error instanceof CalendarFeedClientError ||
		error instanceof Error ||
		error instanceof TrothApiError
	) {
		return error.message;
	}

	return 'Something went wrong while saving the ICS feed.';
}
