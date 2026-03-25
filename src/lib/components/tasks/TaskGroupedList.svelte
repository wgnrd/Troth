<script lang="ts">
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import TaskRow from './TaskRow.svelte';

	type TaskGroup = {
		key: string;
		title: string;
		tasks: AppTask[];
	};

	let {
		groups,
		lists,
		listsById,
		showDueDateBadge = true,
		exitingTaskIds = [],
		mutatingIds = [],
		onOpen,
		onToggleComplete,
		onDueDateChange,
		onListChange
	}: {
		groups: TaskGroup[];
		lists: AppList[];
		listsById: Map<number, AppList>;
		showDueDateBadge?: boolean;
		exitingTaskIds?: number[];
		mutatingIds?: number[];
		onOpen?: (task: AppTask) => void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
	} = $props();
</script>

<div class="space-y-4">
	{#each groups as group (group.key)}
		<section class="space-y-2">
			<p class="px-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
				{group.title}
			</p>

			<div class="rounded-[1.75rem] border border-border/65 bg-white/56 p-2 shadow-sm">
				{#each group.tasks as task (task.id)}
					<TaskRow
						{task}
						list={task.listId !== null ? (listsById.get(task.listId) ?? null) : null}
						{lists}
						{showDueDateBadge}
						exiting={exitingTaskIds.includes(task.id)}
						busy={mutatingIds.includes(task.id)}
						{onOpen}
						{onToggleComplete}
						{onDueDateChange}
						{onListChange}
					/>
				{/each}
			</div>
		</section>
	{/each}
</div>
