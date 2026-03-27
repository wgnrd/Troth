import type { Handle } from '@sveltejs/kit';
import { readVikunjaSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.vikunjaSession = readVikunjaSession(event.cookies);

	return resolve(event);
};
