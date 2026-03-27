import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { VikunjaClientError, normalizeVikunjaBaseUrl } from '$lib/api/vikunja';

const SESSION_COOKIE = 'troth_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export type VikunjaSession = {
	baseUrl: string;
	token: string;
	sessionKey: string;
};

export type VikunjaSessionSummary = Pick<VikunjaSession, 'baseUrl' | 'sessionKey'>;

export function readVikunjaSession(cookies: Cookies): VikunjaSession | null {
	const raw = cookies.get(SESSION_COOKIE);

	if (!raw) {
		return null;
	}

	try {
		const decrypted = decryptPayload(raw);
		const parsed = JSON.parse(decrypted) as Partial<VikunjaSession>;

		if (!parsed.baseUrl || !parsed.token || !parsed.sessionKey) {
			return null;
		}

		return {
			baseUrl: normalizeVikunjaBaseUrl(parsed.baseUrl),
			token: normalizeSessionToken(parsed.token),
			sessionKey: parsed.sessionKey
		};
	} catch {
		return null;
	}
}

export function writeVikunjaSession(
	cookies: Cookies,
	input: { baseUrl: string; token: string }
): VikunjaSession {
	const session: VikunjaSession = {
		baseUrl: normalizeVikunjaBaseUrl(input.baseUrl),
		token: normalizeSessionToken(input.token),
		sessionKey: randomBytes(16).toString('hex')
	};

	const payload = encryptPayload(JSON.stringify(session));
	cookies.set(SESSION_COOKIE, payload, getCookieOptions());

	return session;
}

export function clearVikunjaSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, {
		path: '/'
	});
}

export function toSessionSummary(session: VikunjaSession | null): VikunjaSessionSummary | null {
	if (!session) {
		return null;
	}

	return {
		baseUrl: session.baseUrl,
		sessionKey: session.sessionKey
	};
}

function normalizeSessionToken(rawToken: string) {
	const token = rawToken.trim();

	if (!token) {
		throw new VikunjaClientError('Enter your Vikunja API token.', 400);
	}

	return token;
}

function getCookieOptions() {
	return {
		httpOnly: true,
		path: '/',
		sameSite: 'lax' as const,
		secure: !dev,
		maxAge: SESSION_MAX_AGE
	};
}

function getSecretKey() {
	const configuredSecret = env.TROTH_SESSION_SECRET?.trim();

	if (!configuredSecret) {
		if (!dev) {
			throw new Error('Set TROTH_SESSION_SECRET in the environment before starting Troth.');
		}

		return createHash('sha256').update('troth-dev-session-secret').digest();
	}

	return createHash('sha256').update(configuredSecret).digest();
}

function encryptPayload(payload: string) {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getSecretKey(), iv);
	const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptPayload(payload: string) {
	const [ivPart, authTagPart, encryptedPart] = payload.split('.');

	if (!ivPart || !authTagPart || !encryptedPart) {
		throw new Error('Invalid session payload.');
	}

	const decipher = createDecipheriv(ALGORITHM, getSecretKey(), Buffer.from(ivPart, 'base64url'));
	decipher.setAuthTag(Buffer.from(authTagPart, 'base64url'));

	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(encryptedPart, 'base64url')),
		decipher.final()
	]);

	return decrypted.toString('utf8');
}
