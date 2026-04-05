export type CalendarFeedInput = {
	url: string;
	label?: string | null;
};

export type CalendarFeedSummary = {
	urlHost: string;
	label: string | null;
	sessionKey: string;
};

export type AppCalendarEvent = {
	id: string;
	title: string;
	start: string;
	end: string;
	allDay: boolean;
	sourceLabel: string;
};

export class CalendarFeedClientError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = 'CalendarFeedClientError';
		this.status = status;
	}
}

export function normalizeCalendarFeedUrl(rawUrl: string) {
	const value = rawUrl.trim();

	if (!value) {
		throw new CalendarFeedClientError('Enter an ICS feed URL.', 400);
	}

	const normalizedValue = value.replace(/^webcals?:\/\//i, 'https://');
	let url: URL;

	try {
		url = new URL(normalizedValue);
	} catch {
		throw new CalendarFeedClientError('Enter a valid ICS feed URL.', 400);
	}

	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		throw new CalendarFeedClientError('Use an http, https, or webcal ICS feed URL.', 400);
	}

	url.hash = '';
	return url.toString();
}

export function normalizeCalendarFeedLabel(rawLabel: string | null | undefined) {
	const label = rawLabel?.trim();
	return label ? label : null;
}

export function getCalendarFeedHost(url: string) {
	return new URL(url).host;
}
