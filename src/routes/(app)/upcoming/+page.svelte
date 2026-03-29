<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/upcoming');
</script>

<TaskPage
	view="upcoming"
	title={route?.label ?? 'Upcoming'}
	meta="Plan your next days."
	emptyState="No tasks in the next 7 days, including today."
/>
