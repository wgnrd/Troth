import type { Component } from 'svelte';

export type AppHref =
	| '/today'
	| '/inbox'
	| '/upcoming'
	| '/projects'
	| '/active'
	| '/completed'
	| '/settings';

export type AppRouteMeta = {
	href: AppHref;
	label: string;
	emptyState: string;
	icon: Component<{ class?: string }>;
};
