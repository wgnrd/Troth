import type { VikunjaSession, VikunjaSessionSummary } from '$lib/server/session';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			vikunjaSession: VikunjaSession | null;
		}
		interface PageData {
			connection: VikunjaSessionSummary | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
