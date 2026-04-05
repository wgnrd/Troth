import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCalendarEventsForDay } from './ics';

const lookupMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({
	lookup: lookupMock
}));

describe('fetchCalendarEventsForDay', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lookupMock.mockResolvedValue([{ address: '93.184.216.34' }]);
	});

	it('returns only the requested recurring occurrence for long-running series', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(buildRecurringFeed(), {
						status: 200,
						headers: {
							'Content-Type': 'text/calendar'
						}
					})
			)
		);

		const events = await fetchCalendarEventsForDay(
			{
				url: 'https://calendar.example.com/feed.ics',
				label: 'Team calendar',
				sessionKey: 'session-key'
			},
			'2026-04-05',
			0
		);

		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			title: 'Daily standup',
			start: '2026-04-05T09:00:00.000Z',
			end: '2026-04-05T09:15:00.000Z',
			allDay: false,
			sourceLabel: 'Team calendar'
		});
	});
});

function buildRecurringFeed() {
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Troth//Calendar Test//EN',
		'BEGIN:VEVENT',
		'UID:daily-standup',
		'DTSTAMP:20240101T080000Z',
		'DTSTART:20240101T090000Z',
		'DTEND:20240101T091500Z',
		'RRULE:FREQ=DAILY',
		'SUMMARY:Daily standup',
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n');
}
