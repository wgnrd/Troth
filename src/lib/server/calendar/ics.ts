import { lookup } from 'node:dns/promises';
import ICAL from 'ical.js';
import {
	CalendarFeedClientError,
	getCalendarFeedHost,
	isUnsafeCalendarFeedHost,
	type AppCalendarEvent
} from '$lib/api/calendar';
import type { CalendarFeedSession } from '$lib/server/session';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RECURRING_OCCURRENCES = 500;

export async function fetchCalendarEventsForDay(
	session: CalendarFeedSession,
	day: string,
	timezoneOffsetMinutes: number
) {
	const feedText = await fetchCalendarFeedText(session.url);
	return parseCalendarEvents(
		feedText,
		day,
		timezoneOffsetMinutes,
		session.label ?? getCalendarFeedHost(session.url)
	);
}

export async function verifyCalendarFeed(session: CalendarFeedSession) {
	const feedText = await fetchCalendarFeedText(session.url);
	parseCalendar(feedText);
	return true;
}

async function fetchCalendarFeedText(url: string) {
	await assertSafeCalendarFeedUrl(url);

	let response: Response;

	try {
		response = await fetch(url, {
			headers: {
				Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1'
			},
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
	} catch {
		throw new CalendarFeedClientError('Could not reach the ICS feed URL.', 502);
	}

	if (!response.ok) {
		throw new CalendarFeedClientError('The ICS feed URL could not be loaded.', response.status);
	}

	return await response.text();
}

async function assertSafeCalendarFeedUrl(url: string) {
	const parsed = new URL(url);

	if (isUnsafeCalendarFeedHost(parsed.hostname)) {
		throw new CalendarFeedClientError('Use a public calendar feed URL.', 400);
	}

	let addresses: Array<{ address: string }>;

	try {
		addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
	} catch {
		throw new CalendarFeedClientError('Could not resolve the ICS feed host.', 502);
	}

	if (
		addresses.length === 0 ||
		addresses.some(({ address }) => isUnsafeCalendarFeedHost(address))
	) {
		throw new CalendarFeedClientError('Use a public calendar feed URL.', 400);
	}
}

function parseCalendarEvents(
	feedText: string,
	day: string,
	timezoneOffsetMinutes: number,
	sourceLabel: string
) {
	const calendar = parseCalendar(feedText);
	const dayStart = getDayStart(day, timezoneOffsetMinutes);
	const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
	const events: AppCalendarEvent[] = [];

	for (const component of calendar.getAllSubcomponents('vevent')) {
		const event = new ICAL.Event(component);

		if (event.isRecurring()) {
			collectRecurringEvents(events, event, dayStart, dayEnd, sourceLabel);
			continue;
		}

		const occurrence = toOccurrence(event.startDate, event.endDate);

		if (!occurrence || !overlapsDay(occurrence.start, occurrence.end, dayStart, dayEnd)) {
			continue;
		}

		events.push(toAppEvent(event, occurrence.start, occurrence.end, sourceLabel, 0));
	}

	return events.sort(compareCalendarEvents);
}

function collectRecurringEvents(
	events: AppCalendarEvent[],
	event: InstanceType<typeof ICAL.Event>,
	dayStart: Date,
	dayEnd: Date,
	sourceLabel: string
) {
	const iterator = event.iterator(getIterationStart(event, dayStart));
	let count = 0;

	while (count < MAX_RECURRING_OCCURRENCES) {
		const next = iterator.next();

		if (!next) {
			break;
		}

		const details = event.getOccurrenceDetails(next);
		const occurrence = toOccurrence(details.startDate, details.endDate);

		if (!occurrence) {
			count += 1;
			continue;
		}

		if (occurrence.start >= dayEnd) {
			break;
		}

		if (overlapsDay(occurrence.start, occurrence.end, dayStart, dayEnd)) {
			count += 1;
			events.push(toAppEvent(event, occurrence.start, occurrence.end, sourceLabel, count));
			continue;
		}

		count += 1;
	}
}

function getIterationStart(event: InstanceType<typeof ICAL.Event>, dayStart: Date) {
	const initialOccurrence = toOccurrence(event.startDate, event.endDate);

	if (!initialOccurrence) {
		return event.startDate;
	}

	const durationMs = Math.max(
		initialOccurrence.end.getTime() - initialOccurrence.start.getTime(),
		0
	);
	const iterationStart = new Date(dayStart.getTime() - durationMs);
	return ICAL.Time.fromJSDate(iterationStart, false);
}

function parseCalendar(feedText: string) {
	try {
		const jcal = ICAL.parse(feedText);
		return new ICAL.Component(jcal);
	} catch {
		throw new CalendarFeedClientError('The URL did not return a valid ICS calendar feed.', 400);
	}
}

function getDayStart(day: string, timezoneOffsetMinutes: number) {
	const match = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);

	if (!match) {
		throw new CalendarFeedClientError('Use a valid day in YYYY-MM-DD format.', 400);
	}

	const year = Number.parseInt(match[1] ?? '', 10);
	const month = Number.parseInt(match[2] ?? '', 10);
	const date = Number.parseInt(match[3] ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(date)) {
		throw new CalendarFeedClientError('Use a valid day in YYYY-MM-DD format.', 400);
	}

	return new Date(Date.UTC(year, month - 1, date) + timezoneOffsetMinutes * 60 * 1000);
}

function toOccurrence(startDate: ICAL.Time | null, endDate: ICAL.Time | null) {
	if (!startDate) {
		return null;
	}

	const start = startDate.toJSDate();
	const end = endDate?.toJSDate() ?? start;

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return null;
	}

	return {
		start,
		end: end.getTime() > start.getTime() ? end : start
	};
}

function overlapsDay(start: Date, end: Date, dayStart: Date, dayEnd: Date) {
	return start < dayEnd && end > dayStart;
}

function toAppEvent(
	event: InstanceType<typeof ICAL.Event>,
	start: Date,
	end: Date,
	sourceLabel: string,
	occurrenceIndex: number
): AppCalendarEvent {
	const uid = event.uid || `${event.summary || 'event'}-${start.toISOString()}`;

	return {
		id: occurrenceIndex === 0 ? uid : `${uid}:${start.toISOString()}:${occurrenceIndex}`,
		title: event.summary?.trim() || 'Untitled event',
		start: start.toISOString(),
		end: end.toISOString(),
		allDay: Boolean(event.startDate?.isDate),
		sourceLabel
	};
}

function compareCalendarEvents(left: AppCalendarEvent, right: AppCalendarEvent) {
	if (left.allDay !== right.allDay) {
		return left.allDay ? -1 : 1;
	}

	const startOrder = left.start.localeCompare(right.start);

	if (startOrder !== 0) {
		return startOrder;
	}

	return left.title.localeCompare(right.title);
}
