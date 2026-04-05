import type { BuildInfo } from '$lib/server/build';
import type {
	CalendarFeedSession,
	CalendarFeedSessionSummary,
	VikunjaSession,
	VikunjaSessionSummary
} from '$lib/server/session';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			vikunjaSession: VikunjaSession | null;
			calendarFeedSession: CalendarFeedSession | null;
		}
		interface PageData {
			connection: VikunjaSessionSummary | null;
			calendarFeed: CalendarFeedSessionSummary | null;
			build?: BuildInfo;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
