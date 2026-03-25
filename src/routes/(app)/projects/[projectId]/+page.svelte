<script lang="ts">
	import { page } from '$app/state';
	import ProjectTaskPage from '$lib/components/projects/ProjectTaskPage.svelte';

	const projectId = $derived(Number(page.params.projectId));
</script>

<ProjectTaskPage listId={projectId} />
