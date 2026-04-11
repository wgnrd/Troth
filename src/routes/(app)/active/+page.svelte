<script lang="ts">
	import TaskPage from '$lib/components/tasks/TaskPage.svelte';
	import { getRouteMeta } from '$lib/navigation';
	import type { TaskViewKey } from '$lib/tasks/view';

	const route = getRouteMeta('/active');
</script>

<TaskPage
	view={'backlog' as TaskViewKey}
	title={route?.label ?? 'Backlog'}
	emptyState={route?.emptyState ?? 'Nothing is sitting in backlog.'}
/>
