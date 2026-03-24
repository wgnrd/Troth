<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/active');
</script>

<TaskPage
	view="active"
	title={route?.label ?? 'All Active'}
	emptyState={route?.emptyState ?? 'No active tasks.'}
/>
