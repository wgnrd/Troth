import { getBuildInfo } from '$lib/server/build';

export const load = () => {
	return {
		build: getBuildInfo()
	};
};
