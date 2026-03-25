<script lang="ts">
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import { cn } from '$lib/utils';
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

	function getDensity(taskCount: number) {
		if (taskCount >= 5) {
			return 3;
		}

		if (taskCount >= 3) {
			return 2;
		}

		return 1;
	}

</script>

<div class="space-y-4">
	{#each groups as group (group.key)}
		<section class="space-y-3">
			<p
				class="px-2 text-[0.9rem] font-semibold tracking-[0.18em] text-foreground/78 uppercase"
			>
				{group.title}
			</p>

			<div class="px-2">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-2 text-xs text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]"
					aria-label={`${group.tasks.length} tasks planned for ${group.title}`}
				>
					<span class="font-medium">
						{group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
					</span>
					<span class="flex items-center gap-1" aria-hidden="true">
						{#each Array.from({ length: 3 }) as _, dotIndex (dotIndex)}
							<span
								class={cn(
									'h-1.5 w-5 rounded-full bg-stone-200/90',
									dotIndex < getDensity(group.tasks.length) && 'bg-stone-400/80'
								)}
							></span>
						{/each}
					</span>
				</div>
			</div>

			<div class="space-y-1.5">
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
