<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import './layout.css';
	import type { CalendarFeedSummary } from '$lib/api/calendar';
	import type { ConnectionSummary } from '$lib/api/troth/client';
	import { calendarFeed } from '$lib/stores/calendar-feed';
	import { connection } from '$lib/stores/connection';

	let {
		children,
		data
	}: {
		children: Snippet;
		data: App.PageData & {
			connection: ConnectionSummary | null;
			calendarFeed: CalendarFeedSummary | null;
		};
	} = $props();

	$effect(() => {
		connection.hydrate(data.connection);
	});

	$effect(() => {
		calendarFeed.hydrate(data.calendarFeed);
	});

	$effect(() => {
		if (!browser || !('serviceWorker' in navigator)) {
			return;
		}

		void navigator.serviceWorker.register('/service-worker.js');
	});
</script>

<svelte:head>
	<title>Troth</title>
	<meta name="description" content="Lightweight personal-todo frontend for Vikunja." />
	<meta name="application-name" content="Troth" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Troth" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="theme-color" content="#f4f1ea" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<link id="app-favicon" rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
</svelte:head>

{@render children()}
