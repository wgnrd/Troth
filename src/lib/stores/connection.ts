import { writable } from 'svelte/store';
import { VikunjaClientError, normalizeVikunjaBaseUrl } from '$lib/api/vikunja';
import { connectSession, disconnectSession, type ConnectionSummary } from '$lib/api/troth/client';

export type ConnectionDetails = ConnectionSummary;

export type ConnectionState = {
	settings: ConnectionDetails | null;
	status: 'idle' | 'checking' | 'connected' | 'error';
	error: string | null;
};

function createConnectionStore() {
	const initialState: ConnectionState = {
		settings: null,
		status: 'idle',
		error: null
	};

	const { subscribe, set, update } = writable<ConnectionState>(initialState);

	async function connect(input: { baseUrl: string; token: string }) {
		let normalizedBaseUrl: string;

		try {
			normalizedBaseUrl = normalizeVikunjaBaseUrl(input.baseUrl);
			normalizeToken(input.token);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Could not validate the connection details.';
			update((state) => ({ ...state, status: 'error', error: message }));
			return false;
		}

		update((state) => ({
			...state,
			status: 'checking',
			error: null
		}));

		try {
			const settings = await connectSession({
				baseUrl: normalizedBaseUrl,
				token: input.token
			});

			set({
				settings,
				status: 'connected',
				error: null
			});

			return true;
		} catch (error) {
			const message = toMessage(error);
			update((state) => ({
				...state,
				status: 'error',
				error: message
			}));
			return false;
		}
	}

	async function disconnect() {
		await disconnectSession();

		set({
			settings: null,
			status: 'idle',
			error: null
		});
	}

	return {
		subscribe,
		connect,
		disconnect,
		hydrate(settings: ConnectionDetails | null) {
			set({
				settings,
				status: settings ? 'connected' : 'idle',
				error: null
			});
		}
	};
}

export const connection = createConnectionStore();

export function normalizeToken(rawToken: string): string {
	const token = rawToken.trim();

	if (!token) {
		throw new VikunjaClientError('Enter your Vikunja API token.', 400);
	}

	return token;
}

function toMessage(error: unknown) {
	if (error instanceof VikunjaClientError || error instanceof Error) {
		return error.message;
	}

	return 'Something went wrong while connecting to Vikunja.';
}
