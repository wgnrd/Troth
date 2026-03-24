<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';

	const route = getRouteMeta('/today');
	const todayLabel = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(new Date());
</script>

<TaskPage
	view="today"
	title={route?.label ?? 'Today'}
	meta={todayLabel}
	emptyState={route?.emptyState ?? 'No tasks for today.'}
/>
