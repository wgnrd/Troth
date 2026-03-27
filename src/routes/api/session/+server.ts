import { json } from '@sveltejs/kit';
import { VikunjaClient } from '$lib/api/vikunja';
import { toApiErrorResponse, readJsonBody } from '$lib/server/vikunja';
import { clearVikunjaSession, toSessionSummary, writeVikunjaSession } from '$lib/server/session';

export const GET = ({ locals }) => {
	return json({
		connection: toSessionSummary(locals.vikunjaSession)
	});
};

export const PUT = async (event) => {
	try {
		const input = await readJsonBody<{ baseUrl: string; token: string }>(event);
		const session = writeVikunjaSession(event.cookies, input);
		const client = new VikunjaClient({
			baseUrl: session.baseUrl,
			token: session.token
		});

		await client.checkConnection();

		return json({
			connection: toSessionSummary(session)
		});
	} catch (cause) {
		clearVikunjaSession(event.cookies);
		return toApiErrorResponse(cause);
	}
};

export const DELETE = ({ cookies }) => {
	clearVikunjaSession(cookies);
	return new Response(null, { status: 204 });
};
