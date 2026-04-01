<script lang="ts">
	import './layout.css';
	import { connection } from '$lib/stores/connection';

	let { children, data } = $props();

	$effect(() => {
		connection.hydrate(data.connection);
	});
</script>

<svelte:head>
	<title>Troth</title>
	<meta name="description" content="Lightweight personal-todo frontend for Vikunja." />
	<link id="app-favicon" rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
</svelte:head>

{@render children()}
