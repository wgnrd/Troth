import { getBuildInfo } from '$lib/server/build';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.calendarFeedSession) {
		throw redirect(307, '/settings/integrations');
	}

	return {
		build: getBuildInfo()
	};
};
