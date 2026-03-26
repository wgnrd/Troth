<script lang="ts">
	import { Check, Circle, GripVertical, LoaderCircle, RefreshCcw } from '@lucide/svelte';
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import type { SubtaskSummary } from '$lib/stores/tasks';
	import { cn, notesToPlainText } from '$lib/utils';
	import { formatTaskRepeat, getPriorityCheckboxTone } from '$lib/tasks/view';
	import DueDatePicker from './DueDatePicker.svelte';
	import ProjectPicker from './ProjectPicker.svelte';

	let {
		task,
		list = null,
		lists = [],
		showDueDateBadge = true,
		subtaskSummary = null,
		exiting = false,
		busy = false,
		draggable = false,
		dragging = false,
		class: className = '',
		onOpen,
		onToggleComplete,
		onDueDateChange,
		onListChange,
		onPressStart
	}: {
		task: AppTask;
		list?: AppList | null;
		lists?: AppList[];
		showDueDateBadge?: boolean;
		subtaskSummary?: SubtaskSummary | null;
		exiting?: boolean;
		busy?: boolean;
		draggable?: boolean;
		dragging?: boolean;
		class?: string;
		onOpen?: (task: AppTask) => void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
		onPressStart?: (event: PointerEvent, task: AppTask) => void;
	} = $props();

	let celebrating = $state(false);
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
	let completionPending = $state(false);

	const descriptionPreview = $derived(notesToPlainText(task.description));
	const priorityTone = $derived(getPriorityCheckboxTone(task.priority));
	const repeatLabel = $derived(formatTaskRepeat(task));
	const subtaskSummaryLabel = $derived(formatSubtaskSummary(subtaskSummary));

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

	function handleToggleClick(event: MouseEvent) {
		event.stopPropagation();
		handleToggle();
	}

	function stopPointerStart(event: PointerEvent) {
		event.stopPropagation();
	}

	function stopPropagation(event: Event) {
		event.stopPropagation();
	}

	function handleRowKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		onOpen?.(task);
	}

	function handleRowPointerDown(event: PointerEvent) {
		if (draggable && !busy) {
			event.preventDefault();
		}

		onPressStart?.(event, task);
	}

	function formatSubtaskSummary(summary: SubtaskSummary | null) {
		if (!summary || summary.total === 0) {
			return null;
		}

		if (summary.completed === 0) {
			return `${summary.total} ${summary.total === 1 ? 'subtask' : 'subtasks'}`;
		}

		return `${summary.completed} of ${summary.total} done`;
	}

	$effect(() => {
		if (!busy) {
			completionPending = false;
		}
	});
</script>

<div
	class={cn(
		'group relative flex gap-3 rounded-[1.35rem] px-3 py-3 transition-all duration-700',
		descriptionPreview ? 'items-start' : 'items-center',
		task.completed ? 'bg-stone-50/75' : 'hover:bg-white/70',
		draggable && 'md:pl-9',
		draggable && 'touch-none select-none',
		exiting && 'translate-x-1 opacity-45',
		draggable && !busy && 'cursor-grab active:cursor-grabbing',
		dragging && 'scale-[0.985] opacity-55 shadow-none',
		className
	)}
	role="button"
	tabindex="0"
	aria-pressed={dragging}
	onclick={() => onOpen?.(task)}
	onkeydown={handleRowKeyDown}
	onpointerdown={handleRowPointerDown}
>
	{#if draggable}
		<div
			class={cn(
				'pointer-events-none absolute top-1/2 left-2 z-10 hidden -translate-x-1 -translate-y-1/2 p-1.5 text-stone-400 opacity-0 transition-all duration-200 md:flex',
				'group-hover:translate-x-0 group-hover:opacity-100 md:group-hover:opacity-100',
				dragging && 'opacity-0'
			)}
			aria-hidden="true"
		>
			<GripVertical class="size-3.5" />
		</div>
	{/if}

	<button
		type="button"
		class={cn(
			'relative inline-flex size-6 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed',
			!task.completed && priorityTone.idle,
			descriptionPreview && 'mt-0.5'
		)}
		aria-label={task.completed ? 'Reopen task' : 'Complete task'}
		disabled={busy}
		onclick={handleToggleClick}
		onpointerdown={stopPointerStart}
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

	<div class="min-w-0 flex-1 text-left">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="min-w-0 space-y-1">
				<div class="flex min-w-0 items-center gap-1.5">
					{#if repeatLabel}
						<span
							class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground/75"
							aria-label={`Repeating task: ${repeatLabel}`}
							title={`Repeating task: ${repeatLabel}`}
						>
							<RefreshCcw class="size-3.25" />
						</span>
					{/if}

					<p
						class={cn(
							'text-sm font-medium break-words whitespace-normal text-foreground transition-all duration-700',
							task.completed && 'text-muted-foreground line-through line-through decoration-2',
							exiting && 'translate-x-1'
						)}
					>
						{task.title}
					</p>
				</div>

				{#if descriptionPreview}
					<p class="line-clamp-2 text-sm text-muted-foreground">{descriptionPreview}</p>
				{:else if subtaskSummaryLabel}
					<p class="text-xs font-medium text-muted-foreground">{subtaskSummaryLabel}</p>
				{/if}
			</div>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 self-center text-xs text-muted-foreground">
		{#if list}
			<div role="presentation" onclick={stopPropagation} onpointerdown={stopPointerStart}>
				<ProjectPicker
					mode="chip"
					{lists}
					value={list.id}
					disabled={busy}
					align="end"
					ariaLabel="Change project"
					onChange={(listId) => onListChange?.(task, listId)}
				/>
			</div>
		{/if}

		{#if showDueDateBadge}
			<div role="presentation" onclick={stopPropagation} onpointerdown={stopPointerStart}>
				<DueDatePicker
					mode="chip"
					value={task.dueDate}
					disabled={busy}
					align="end"
					ariaLabel="Edit due date"
					onChange={(dueDate) => onDueDateChange?.(task, dueDate)}
				/>
			</div>
		{/if}
	</div>
</div>
