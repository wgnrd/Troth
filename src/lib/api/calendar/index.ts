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

	if (url.username || url.password) {
		throw new CalendarFeedClientError('Use a calendar feed URL without embedded credentials.', 400);
	}

	if (isUnsafeCalendarFeedHost(url.hostname)) {
		throw new CalendarFeedClientError('Use a public calendar feed URL.', 400);
	}

	if (url.hostname === 'calendar.google.com' && !url.pathname.includes('/ical/')) {
		throw new CalendarFeedClientError(
			'Use the Google Calendar secret ICS address, not the browser page URL.',
			400
		);
	}

	url.hash = '';
	return url.toString();
}

export function isUnsafeCalendarFeedHost(hostname: string) {
	const normalizedHost = hostname.trim().toLowerCase();

	if (!normalizedHost || normalizedHost === 'localhost' || normalizedHost.endsWith('.localhost')) {
		return true;
	}

	const ipv4 = parseIpv4(normalizedHost);

	if (ipv4 !== null) {
		return isPrivateIpv4(ipv4);
	}

	const ipv6 = normalizeIpv6(normalizedHost);

	if (ipv6) {
		return isPrivateIpv6(ipv6);
	}

	return false;
}

export function normalizeCalendarFeedLabel(rawLabel: string | null | undefined) {
	const label = rawLabel?.trim();
	return label ? label : null;
}

export function getCalendarFeedHost(url: string) {
	return new URL(url).host;
}

function parseIpv4(hostname: string) {
	const parts = hostname.split('.');

	if (parts.length !== 4) {
		return null;
	}

	const bytes = parts.map((part) => Number.parseInt(part, 10));

	if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
		return null;
	}

	return bytes as [number, number, number, number];
}

function isPrivateIpv4([first, second]: [number, number, number, number]) {
	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}

function normalizeIpv6(hostname: string) {
	const normalizedHost = hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase();

	if (!normalizedHost.includes(':')) {
		return null;
	}

	if (normalizedHost === '::1' || normalizedHost === '::') {
		return normalizedHost;
	}

	const halves = normalizedHost.split('::');

	if (halves.length > 2) {
		return null;
	}

	const left = halves[0] ? halves[0].split(':').filter(Boolean) : [];
	const right = halves[1] ? halves[1].split(':').filter(Boolean) : [];
	const missingCount = 8 - (left.length + right.length);

	if ((halves.length === 1 && left.length !== 8) || missingCount < 0) {
		return null;
	}

	const groups = [
		...left,
		...Array.from({ length: halves.length === 2 ? missingCount : 0 }, () => '0'),
		...right
	];

	if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) {
		return null;
	}

	return groups.map((group) => group.padStart(4, '0')).join(':');
}

function isPrivateIpv6(hostname: string) {
	return (
		hostname === '0000:0000:0000:0000:0000:0000:0000:0000' ||
		hostname === '0000:0000:0000:0000:0000:0000:0000:0001' ||
		hostname.startsWith('fc') ||
		hostname.startsWith('fd') ||
		hostname.startsWith('fe80:')
	);
}
