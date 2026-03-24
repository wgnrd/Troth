<script lang="ts">
	import AppShell from '$lib/components/app/app-shell.svelte';

	let { children } = $props();
</script>

<AppShell>
	{@render children()}
</AppShell>
