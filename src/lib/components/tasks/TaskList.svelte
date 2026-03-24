<script lang="ts">
	import { cn } from '$lib/utils';
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import TaskRow from './TaskRow.svelte';

	let {
		tasks,
		lists,
		listsById,
		exitingTaskIds = [],
		mutatingIds = [],
		class: className = '',
		rowClass = '',
		onOpen,
		onToggleComplete,
		onDueDateChange,
		onListChange
	}: {
		tasks: AppTask[];
		lists: AppList[];
		listsById: Map<number, AppList>;
		exitingTaskIds?: number[];
		mutatingIds?: number[];
		class?: string;
		rowClass?: string;
		onOpen?: (task: AppTask) => void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
	} = $props();
</script>

<div class={cn('rounded-[1.75rem] border border-border/65 bg-white/56 p-2 shadow-sm', className)}>
	{#each tasks as task (task.id)}
		<TaskRow
			{task}
			list={task.listId !== null ? (listsById.get(task.listId) ?? null) : null}
			{lists}
			exiting={exitingTaskIds.includes(task.id)}
			busy={mutatingIds.includes(task.id)}
			class={rowClass}
			{onOpen}
			{onToggleComplete}
			{onDueDateChange}
			{onListChange}
		/>
	{/each}
</div>
