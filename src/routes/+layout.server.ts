import { toSessionSummary } from '$lib/server/session';

export const load = ({ locals }) => {
	return {
		connection: toSessionSummary(locals.vikunjaSession)
	};
};
