import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchCalendarEventsForDay } from '$lib/server/calendar/ics';
import { assertCalendarFeedSession } from '$lib/server/session';
import { toApiErrorResponse } from '$lib/server/vikunja';

export const GET: RequestHandler = async (event) => {
	try {
		const session = assertCalendarFeedSession(event.locals.calendarFeedSession);
		const day = event.url.searchParams.get('day') ?? '';
		const timezoneOffsetMinutes = Number.parseInt(
			event.url.searchParams.get('timezoneOffsetMinutes') ?? '0',
			10
		);

		return json({
			events: await fetchCalendarEventsForDay(
				session,
				day,
				Number.isNaN(timezoneOffsetMinutes) ? 0 : timezoneOffsetMinutes
			)
		});
	} catch (cause) {
		return toApiErrorResponse(cause);
	}
};
