<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { connection } from '$lib/stores/connection';

	let { children, data } = $props();

	$effect(() => {
		connection.hydrate(data.connection);
	});
</script>

<svelte:head>
	<title>Troth</title>
	<meta name="description" content="Lightweight personal-todo frontend for Vikunja." />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
