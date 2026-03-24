<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/upcoming');
</script>

<TaskPage
	view="upcoming"
	title={route?.label ?? 'Upcoming'}
	meta="Due after today"
	emptyState={route?.emptyState ?? 'Nothing upcoming yet.'}
/>
