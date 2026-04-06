import { error, isHttpError, json, type RequestEvent } from '@sveltejs/kit';
import { CalendarFeedClientError } from '$lib/api/calendar';
import {
	VikunjaClient,
	VikunjaClientError,
	VikunjaTaskMutationError,
	type ConnectionSettings
} from '$lib/api/vikunja';
import type { AppTask } from '$lib/api/vikunja';

export function getServerVikunjaClient(event: RequestEvent) {
	const session = event.locals.vikunjaSession;

	if (!session) {
		throw error(401, 'Connect Troth to Vikunja in Settings before loading data.');
	}

	const settings: ConnectionSettings = {
		baseUrl: session.baseUrl,
		token: session.token
	};

	return new VikunjaClient(settings);
}

export function toApiErrorResponse(cause: unknown) {
	if (isHttpError(cause)) {
		return json(
			{
				message: cause.body.message
			},
			{ status: cause.status }
		);
	}

	if (cause instanceof VikunjaTaskMutationError) {
		return json(
			{
				message: cause.message,
				task: cause.task
			},
			{ status: cause.status }
		);
	}

	if (cause instanceof VikunjaClientError) {
		return json(
			{
				message: cause.message
			},
			{ status: cause.status }
		);
	}

	if (cause instanceof CalendarFeedClientError) {
		return json(
			{
				message: cause.message
			},
			{ status: cause.status }
		);
	}

	return json(
		{
			message: cause instanceof Error ? cause.message : 'Something went wrong.'
		},
		{ status: 500 }
	);
}

export async function readJsonBody<T>(event: RequestEvent): Promise<T> {
	return (await event.request.json()) as T;
}

export type TaskMutationErrorResponse = {
	message: string;
	task?: AppTask | null;
};
