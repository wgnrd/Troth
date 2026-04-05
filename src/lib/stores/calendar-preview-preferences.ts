import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'troth.calendar.preview.preferences';

export type CalendarPreviewPreferencesState = {
	calendarVisible: boolean;
};

function createCalendarPreviewPreferencesStore() {
	const initialState: CalendarPreviewPreferencesState = browser
		? readStoredPreferences()
		: {
				calendarVisible: true
			};

	const { subscribe, update } = writable<CalendarPreviewPreferencesState>(initialState);

	function setCalendarVisible(visible: boolean) {
		update((state) => {
			const nextState = {
				...state,
				calendarVisible: visible
			};

			writeStoredPreferences(nextState);
			return nextState;
		});
	}

	return {
		subscribe,
		setCalendarVisible
	};
}

export const calendarPreviewPreferences = createCalendarPreviewPreferencesStore();

function readStoredPreferences(): CalendarPreviewPreferencesState {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {
			calendarVisible: true
		};
	}

	try {
		const parsed = JSON.parse(raw) as Partial<CalendarPreviewPreferencesState>;

		return {
			calendarVisible: typeof parsed.calendarVisible === 'boolean' ? parsed.calendarVisible : true
		};
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {
			calendarVisible: true
		};
	}
}

function writeStoredPreferences(state: CalendarPreviewPreferencesState) {
	if (!browser) {
		return;
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
