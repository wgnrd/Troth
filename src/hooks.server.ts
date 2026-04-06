import type { Handle } from '@sveltejs/kit';
import { readCalendarFeedSession, readVikunjaSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.vikunjaSession = readVikunjaSession(event.cookies);
	event.locals.calendarFeedSession = readCalendarFeedSession(event.cookies);

	return resolve(event);
};
