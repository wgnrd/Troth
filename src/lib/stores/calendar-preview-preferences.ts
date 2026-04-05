import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'troth.calendar.preview.preferences';

export type CalendarPreviewPreferencesState = {
	mockCalendarEnabled: boolean;
};

function createCalendarPreviewPreferencesStore() {
	const initialState: CalendarPreviewPreferencesState = browser
		? readStoredPreferences()
		: {
				mockCalendarEnabled: false
			};

	const { subscribe, update } = writable<CalendarPreviewPreferencesState>(initialState);

	function setMockCalendarEnabled(enabled: boolean) {
		update((state) => {
			const nextState = {
				...state,
				mockCalendarEnabled: enabled
			};

			writeStoredPreferences(nextState);
			return nextState;
		});
	}

	return {
		subscribe,
		setMockCalendarEnabled
	};
}

export const calendarPreviewPreferences = createCalendarPreviewPreferencesStore();

function readStoredPreferences(): CalendarPreviewPreferencesState {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return {
			mockCalendarEnabled: false
		};
	}

	try {
		const parsed = JSON.parse(raw) as Partial<CalendarPreviewPreferencesState>;

		return {
			mockCalendarEnabled:
				typeof parsed.mockCalendarEnabled === 'boolean' ? parsed.mockCalendarEnabled : false
		};
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return {
			mockCalendarEnabled: false
		};
	}
}

function writeStoredPreferences(state: CalendarPreviewPreferencesState) {
	if (!browser) {
		return;
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
