import type { LayoutServerLoad } from './$types';
import { toCalendarFeedSessionSummary, toSessionSummary } from '$lib/server/session';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		connection: toSessionSummary(locals.vikunjaSession),
		calendarFeed: toCalendarFeedSessionSummary(locals.calendarFeedSession)
	};
};
