import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
	VikunjaClient,
	VikunjaClientError,
	normalizeVikunjaBaseUrl,
	type ConnectionSettings
} from '$lib/api/vikunja';

const STORAGE_KEY = 'troth.vikunja.connection';

export type ConnectionState = {
	settings: ConnectionSettings | null;
	status: 'idle' | 'checking' | 'connected' | 'error';
	error: string | null;
};

function createConnectionStore() {
	const initialSettings = browser ? readStoredConnection() : null;
	const initialState: ConnectionState = {
		settings: initialSettings,
		status: initialSettings ? 'connected' : 'idle',
		error: null
	};

	const { subscribe, set, update } = writable<ConnectionState>(initialState);

	async function connect(input: { baseUrl: string; token: string }) {
		let normalized: ConnectionSettings;

		try {
			normalized = {
				baseUrl: normalizeVikunjaBaseUrl(input.baseUrl),
				token: normalizeToken(input.token)
			};
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
			const client = new VikunjaClient(normalized);
			await client.checkConnection();

			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
			}

			set({
				settings: normalized,
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

	function disconnect() {
		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
		}

		set({
			settings: null,
			status: 'idle',
			error: null
		});
	}

	return {
		subscribe,
		connect,
		disconnect
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

function readStoredConnection(): ConnectionSettings | null {
	const raw = localStorage.getItem(STORAGE_KEY);

	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;

		if (!parsed.baseUrl || !parsed.token) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}

		return {
			baseUrl: normalizeVikunjaBaseUrl(parsed.baseUrl),
			token: normalizeToken(parsed.token)
		};
	} catch {
		localStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

function toMessage(error: unknown) {
	if (error instanceof VikunjaClientError || error instanceof Error) {
		return error.message;
	}

	return 'Something went wrong while connecting to Vikunja.';
}
