import { afterEach, describe, expect, it, vi } from 'vitest';
import { VikunjaClient } from './client';

describe('VikunjaClient network failures', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns a user-facing unavailable error when the Vikunja server is unreachable', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('fetch failed');
			})
		);

		const client = new VikunjaClient({
			baseUrl: 'https://vikunja.example.com',
			token: 'token'
		});

		await expect(client.checkConnection()).rejects.toMatchObject({
			status: 503,
			message: expect.stringContaining('could not be reached')
		});
	});
});
