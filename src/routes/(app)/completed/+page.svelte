<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/completed');
</script>

<TaskPage
	view="completed"
	title={route?.label ?? 'Completed'}
	emptyState={route?.emptyState ?? 'No completed tasks yet.'}
/>
