<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/inbox');
</script>

<TaskPage
	view="inbox"
	title={route?.label ?? 'Inbox'}
	emptyState={route?.emptyState ?? 'Nothing in Inbox yet.'}
/>
