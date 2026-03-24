<script lang="ts">
	import { Check, Circle, LoaderCircle } from '@lucide/svelte';
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import { cn, notesToPlainText } from '$lib/utils';
	import { getPriorityCheckboxTone } from '$lib/tasks/view';
	import DueDatePicker from './DueDatePicker.svelte';
	import ProjectPicker from './ProjectPicker.svelte';

	let {
		task,
		list = null,
		lists = [],
		exiting = false,
		busy = false,
		class: className = '',
		onOpen,
		onToggleComplete,
		onDueDateChange,
		onListChange
	}: {
		task: AppTask;
		list?: AppList | null;
		lists?: AppList[];
		exiting?: boolean;
		busy?: boolean;
		class?: string;
		onOpen?: (task: AppTask) => void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
	} = $props();

	let celebrating = $state(false);
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
	let completionPending = $state(false);

	const descriptionPreview = $derived(notesToPlainText(task.description));
	const priorityTone = $derived(getPriorityCheckboxTone(task.priority));

	function triggerCelebration() {
		if (celebrationTimer) {
			clearTimeout(celebrationTimer);
		}

		celebrating = false;

		requestAnimationFrame(() => {
			celebrating = true;
			celebrationTimer = setTimeout(() => {
				celebrating = false;
				celebrationTimer = null;
			}, 820);
		});
	}

	function handleToggle() {
		const nextCompleted = !task.completed;

		if (nextCompleted) {
			completionPending = true;
			triggerCelebration();
		}

		void onToggleComplete?.(task, nextCompleted);
	}

	$effect(() => {
		if (!busy) {
			completionPending = false;
		}
	});
</script>

<div
	class={cn(
		'group flex gap-3 rounded-[1.35rem] px-3 py-3 transition-all duration-700',
		descriptionPreview ? 'items-start' : 'items-center',
		task.completed ? 'bg-stone-50/75' : 'hover:bg-white/70',
		exiting && 'translate-x-1 opacity-45',
		className
	)}
>
	<button
		type="button"
		class={cn(
			'relative inline-flex size-6 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed',
			!task.completed && priorityTone.idle,
			descriptionPreview && 'mt-0.5'
		)}
		aria-label={task.completed ? 'Reopen task' : 'Complete task'}
		disabled={busy}
		onclick={handleToggle}
	>
		{#if celebrating}
			<span class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<span class="task-celebration-ring"></span>
				<span class="task-celebration-dot task-celebration-dot--top"></span>
				<span class="task-celebration-dot task-celebration-dot--right"></span>
				<span class="task-celebration-dot task-celebration-dot--bottom"></span>
				<span class="task-celebration-dot task-celebration-dot--left"></span>
				<span class="task-celebration-dot task-celebration-dot--top-right"></span>
				<span class="task-celebration-dot task-celebration-dot--bottom-left"></span>
			</span>
		{/if}

		{#if busy && !completionPending}
			<LoaderCircle class="size-4 animate-spin" />
		{:else if task.completed}
			<span
				class={cn(
					'flex size-5 items-center justify-center rounded-full',
					priorityTone.completed,
					celebrating && 'animate-[task-check-bounce_520ms_cubic-bezier(0.22,1,0.36,1)]'
				)}
			>
				<Check class="size-3.5" />
			</span>
		{:else}
			<Circle class="size-4.5" />
		{/if}
	</button>

	<button type="button" class="min-w-0 flex-1 text-left" onclick={() => onOpen?.(task)}>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 space-y-1">
				<p
					class={cn(
						'truncate text-sm font-medium text-foreground transition-all duration-700',
						task.completed && 'text-muted-foreground line-through line-through decoration-2',
						exiting && 'translate-x-1'
					)}
				>
					{task.title}
				</p>

				{#if descriptionPreview}
					<p class="line-clamp-2 text-sm text-muted-foreground">{descriptionPreview}</p>
				{/if}
			</div>
		</div>
	</button>

	<div class="flex flex-wrap items-center gap-2 self-center text-xs text-muted-foreground">
		{#if list}
			<ProjectPicker
				mode="chip"
				{lists}
				value={list.id}
				disabled={busy}
				align="end"
				ariaLabel="Change project"
				onChange={(listId) => onListChange?.(task, listId)}
			/>
		{/if}

		<DueDatePicker
			mode="chip"
			value={task.dueDate}
			disabled={busy}
			align="end"
			ariaLabel="Edit due date"
			onChange={(dueDate) => onDueDateChange?.(task, dueDate)}
		/>
	</div>
</div>
