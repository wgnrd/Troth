import type { AppCalendarEvent } from '$lib/api/calendar';

const EVENT_LIBRARY = [
	{ title: 'Morning focus block', startHour: 8, startMinute: 30, durationMinutes: 60 },
	{ title: 'Walk and reset', startHour: 10, startMinute: 15, durationMinutes: 30 },
	{ title: 'Lunch with Sam', startHour: 12, startMinute: 30, durationMinutes: 75 },
	{ title: 'Design review', startHour: 14, startMinute: 0, durationMinutes: 45 },
	{ title: 'Deep work session', startHour: 15, startMinute: 30, durationMinutes: 90 },
	{ title: 'Gym', startHour: 18, startMinute: 0, durationMinutes: 75 },
	{ title: 'Dinner reservation', startHour: 19, startMinute: 30, durationMinutes: 90 },
	{ title: 'Movie night', startHour: 20, startMinute: 0, durationMinutes: 120 }
] as const;

const ALL_DAY_LIBRARY = [
	'Pay rent',
	'Birthday reminder',
	'Family visit',
	'Conference day',
	'Planning day'
] as const;

export function getMockCalendarEvents(day: string): AppCalendarEvent[] {
	const seed = getSeed(day);
	const date = parseDay(day);
	const events: AppCalendarEvent[] = [];

	if (seed % 5 === 0) {
		events.push({
			id: `mock-${day}-all-day`,
			title: ALL_DAY_LIBRARY[seed % ALL_DAY_LIBRARY.length] ?? 'All day event',
			start: startOfDay(date).toISOString(),
			end: endOfDay(date).toISOString(),
			allDay: true,
			sourceLabel: 'Demo calendar'
		});
	}

	const eventCount = (seed % 4) + 1;

	for (let index = 0; index < eventCount; index += 1) {
		const entry = EVENT_LIBRARY[(seed + index) % EVENT_LIBRARY.length];

		if (!entry) {
			continue;
		}

		const start = new Date(date);
		start.setHours(
			entry.startHour + (index === 2 && seed % 2 === 0 ? 1 : 0),
			entry.startMinute,
			0,
			0
		);

		const end = new Date(start.getTime() + entry.durationMinutes * 60_000);

		events.push({
			id: `mock-${day}-${index}`,
			title: entry.title,
			start: start.toISOString(),
			end: end.toISOString(),
			allDay: false,
			sourceLabel: 'Demo calendar'
		});
	}

	return events.sort((left, right) => left.start.localeCompare(right.start));
}

function getSeed(day: string) {
	return day.split('-').reduce((total, part) => total + Number.parseInt(part, 10), 0);
}

function parseDay(day: string) {
	const [year, month, date] = day.split('-').map((part) => Number.parseInt(part, 10));
	return new Date(year, (month || 1) - 1, date || 1);
}

function startOfDay(date: Date) {
	const value = new Date(date);
	value.setHours(0, 0, 0, 0);
	return value;
}

function endOfDay(date: Date) {
	const value = new Date(date);
	value.setHours(23, 59, 59, 999);
	return value;
}
