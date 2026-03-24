<script lang="ts">
	import type { AppList, CreateTaskInput } from '$lib/api/vikunja';
	import TaskComposer from './TaskComposer.svelte';

	let {
		lists,
		busy = false,
		error = null,
		fixedListId = null,
		placeholder = 'Add a task',
		disabledMessage = 'Add a project in Vikunja before creating tasks.',
		onSubmit
	}: {
		lists: AppList[];
		busy?: boolean;
		error?: string | null;
		fixedListId?: number | null;
		placeholder?: string;
		disabledMessage?: string;
		onSubmit?: (input: CreateTaskInput) => Promise<boolean | void> | boolean | void;
	} = $props();
</script>

<TaskComposer {lists} {busy} {error} {fixedListId} {placeholder} {disabledMessage} {onSubmit} />
