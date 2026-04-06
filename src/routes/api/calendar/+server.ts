import { json, type RequestHandler } from '@sveltejs/kit';
import type { CalendarFeedInput } from '$lib/api/calendar';
import { verifyCalendarFeed } from '$lib/server/calendar/ics';
import {
	clearCalendarFeedSession,
	toCalendarFeedSessionSummary,
	writeCalendarFeedSession
} from '$lib/server/session';
import { readJsonBody, toApiErrorResponse } from '$lib/server/vikunja';

export const GET: RequestHandler = ({ locals }) => {
	return json({
		calendarFeed: toCalendarFeedSessionSummary(locals.calendarFeedSession)
	});
};

export const PUT: RequestHandler = async (event) => {
	try {
		const input = await readJsonBody<CalendarFeedInput>(event);
		const session = writeCalendarFeedSession(event.cookies, input);

		await verifyCalendarFeed(session);

		return json({
			calendarFeed: toCalendarFeedSessionSummary(session)
		});
	} catch (cause) {
		clearCalendarFeedSession(event.cookies);
		return toApiErrorResponse(cause);
	}
};

export const DELETE: RequestHandler = ({ cookies }) => {
	clearCalendarFeedSession(cookies);
	return new Response(null, { status: 204 });
};
