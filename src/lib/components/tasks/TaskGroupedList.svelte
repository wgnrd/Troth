<script lang="ts">
	import type { AppCalendarEvent } from '$lib/api/calendar';
	import type { AppList, AppTask } from '$lib/api/vikunja';
	import type { CalendarDayEventsState } from '$lib/stores/calendar-events';
	import type { SubtaskSummary } from '$lib/stores/tasks';
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
		calendarEventsByDay = {} as Record<string, CalendarDayEventsState>,
		showCalendarEvents = false,
		groupAriaLabelPrefix = 'Upcoming tasks for',
		showDueDateBadge = true,
		subtaskSummaryByParentId = {} as Record<number, SubtaskSummary>,
		exitingTaskIds = [],
		mutatingIds = [],
		enableDragAndDrop = false,
		onOpen,
		onToggleComplete,
		onDueDateChange,
		onListChange,
		onRescheduleTask
	}: {
		groups: TaskGroup[];
		lists: AppList[];
		listsById: Map<number, AppList>;
		calendarEventsByDay?: Record<string, CalendarDayEventsState>;
		showCalendarEvents?: boolean;
		groupAriaLabelPrefix?: string;
		showDueDateBadge?: boolean;
		subtaskSummaryByParentId?: Record<number, SubtaskSummary>;
		exitingTaskIds?: number[];
		mutatingIds?: number[];
		enableDragAndDrop?: boolean;
		onOpen?: (task: AppTask) => void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
		onRescheduleTask?: (task: AppTask, dueDate: string) => Promise<void> | void;
	} = $props();

	let draggedTaskId = $state<number | null>(null);
	let dropTargetKey = $state<string | null>(null);
	let pressedTaskId = $state<number | null>(null);
	let pressStartX = 0;
	let pressStartY = 0;
	let pointerX = $state(0);
	let pointerY = $state(0);
	let suppressOpenTaskId = $state<number | null>(null);
	const DRAG_THRESHOLD = 6;
	const DRAG_PREVIEW_OFFSET_X = 18;
	const DRAG_PREVIEW_OFFSET_Y = 14;

	const timeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});

	function findTask(taskId: number) {
		return groups.flatMap((group) => group.tasks).find((task) => task.id === taskId) ?? null;
	}

	function cleanupPointerSession() {
		pressedTaskId = null;
		draggedTaskId = null;
		dropTargetKey = null;

		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
			window.removeEventListener('pointercancel', handlePointerCancel);
		}
	}

	const draggedTask = $derived(draggedTaskId === null ? null : findTask(draggedTaskId));

	function updateDropTarget(clientX: number, clientY: number) {
		if (typeof document === 'undefined') {
			return;
		}

		const dropSections = Array.from(document.querySelectorAll<HTMLElement>('[data-drop-key]'));
		const activeSection = dropSections.find((section) => {
			const rect = section.getBoundingClientRect();
			return (
				clientX >= rect.left &&
				clientX <= rect.right &&
				clientY >= rect.top &&
				clientY <= rect.bottom
			);
		});
		const nextKey = activeSection?.dataset.dropKey ?? null;

		dropTargetKey = nextKey && nextKey !== 'no-date' ? nextKey : null;
	}

	function handleDropZoneEnter(groupKey: string) {
		if (draggedTaskId === null || groupKey === 'no-date') {
			return;
		}

		dropTargetKey = groupKey;
	}

	function handleDropZoneMove(groupKey: string) {
		if (draggedTaskId === null || groupKey === 'no-date') {
			return;
		}

		dropTargetKey = groupKey;
	}

	function handleDropZoneLeave(groupKey: string) {
		if (dropTargetKey === groupKey) {
			dropTargetKey = null;
		}
	}

	function handlePressStart(event: PointerEvent, task: AppTask) {
		if (
			!enableDragAndDrop ||
			task.listId === null ||
			!task.dueDate ||
			event.button !== 0 ||
			busyForTask(task.id)
		) {
			return;
		}

		pressedTaskId = task.id;
		pressStartX = event.clientX;
		pressStartY = event.clientY;
		pointerX = event.clientX;
		pointerY = event.clientY;

		if (typeof window !== 'undefined') {
			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
			window.addEventListener('pointercancel', handlePointerCancel);
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (pressedTaskId === null) {
			return;
		}

		const movedEnough =
			Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY) >= DRAG_THRESHOLD;

		if (!movedEnough && draggedTaskId === null) {
			return;
		}

		event.preventDefault();
		pointerX = event.clientX;
		pointerY = event.clientY;

		if (draggedTaskId === null) {
			draggedTaskId = pressedTaskId;
		}

		updateDropTarget(event.clientX, event.clientY);
	}

	async function handlePointerUp(event: PointerEvent) {
		updateDropTarget(event.clientX, event.clientY);

		const activeTaskId = draggedTaskId;
		const targetKey = dropTargetKey;
		const task = activeTaskId === null ? null : findTask(activeTaskId);

		if (activeTaskId !== null) {
			suppressOpenTaskId = activeTaskId;
			setTimeout(() => {
				if (suppressOpenTaskId === activeTaskId) {
					suppressOpenTaskId = null;
				}
			}, 0);
		}

		cleanupPointerSession();

		if (!task || !targetKey || task.dueDate?.slice(0, 10) === targetKey) {
			return;
		}

		await onRescheduleTask?.(task, targetKey);
	}

	function handlePointerCancel() {
		cleanupPointerSession();
	}

	function handleOpen(task: AppTask) {
		if (suppressOpenTaskId === task.id) {
			return;
		}

		onOpen?.(task);
	}

	function busyForTask(taskId: number) {
		return mutatingIds.includes(taskId);
	}

	function getDensity(taskCount: number) {
		if (taskCount >= 5) {
			return 3;
		}

		if (taskCount >= 3) {
			return 2;
		}

		return 1;
	}

	function getCalendarState(day: string) {
		return calendarEventsByDay[day] ?? null;
	}

	function getCalendarItems(day: string) {
		return getCalendarState(day)?.items ?? [];
	}

	function formatEventTime(event: AppCalendarEvent) {
		if (event.allDay) {
			return 'All day';
		}

		return `${timeFormatter.format(new Date(event.start))}-${timeFormatter.format(new Date(event.end))}`;
	}
</script>

<div class="space-y-4">
	{#each groups as group (group.key)}
		<section
			class={cn(
				'space-y-3 rounded-[1.6rem] border border-transparent px-2 py-2 transition-all duration-200',
				enableDragAndDrop && draggedTaskId !== null && group.key !== 'no-date' && 'border-dashed',
				dropTargetKey === group.key &&
					'border-stone-300 bg-white/68 shadow-[0_10px_24px_rgba(28,25,23,0.08)] dark:border-white/12 dark:bg-white/7 dark:shadow-none'
			)}
			role="group"
			aria-label={`${groupAriaLabelPrefix} ${group.title}`}
			data-drop-key={group.key}
			onpointerenter={() => handleDropZoneEnter(group.key)}
			onpointermove={() => handleDropZoneMove(group.key)}
			onpointerleave={() => handleDropZoneLeave(group.key)}
		>
			<div class="px-2">
				<div class="flex items-baseline gap-2">
					<p class="text-[0.9rem] font-semibold tracking-[0.18em] text-foreground/78 uppercase">
						{group.title}
					</p>
					<p
						class="text-[0.68rem] font-medium tracking-[0.14em] text-muted-foreground uppercase"
						aria-label={`${group.tasks.length} tasks planned for ${group.title}`}
					>
						{group.tasks.length}
						{group.tasks.length === 1 ? 'task' : 'tasks'}
					</p>
				</div>

				{#if showCalendarEvents && group.key !== 'no-date'}
					{@const calendarState = getCalendarState(group.key)}
					{@const calendarItems = getCalendarItems(group.key)}

					{#if calendarState?.error}
						<p class="mt-1.5 text-xs text-destructive">{calendarState.error}</p>
					{:else if calendarState?.loading && !calendarState.loaded}
						<p class="mt-1.5 text-[0.72rem] text-muted-foreground">Loading events…</p>
					{:else if calendarItems.length > 0}
						<div class="mt-1.5 space-y-0.5">
							{#each calendarItems as event (event.id)}
								<div
									class="flex items-baseline gap-2 text-[0.72rem] leading-5 text-muted-foreground"
								>
									<span class="w-[7.25rem] shrink-0 tabular-nums">{formatEventTime(event)}</span>
									<span class="min-w-0 truncate text-foreground/82">{event.title}</span>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				{#if enableDragAndDrop && draggedTaskId !== null && group.key !== 'no-date'}
					<p
						class={cn(
							'mt-1.5 text-xs text-muted-foreground transition',
							dropTargetKey === group.key && 'text-foreground'
						)}
					>
						Drop here to move this task to {group.title}.
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				{#each group.tasks as task (task.id)}
					<TaskRow
						{task}
						list={task.listId !== null ? (listsById.get(task.listId) ?? null) : null}
						{lists}
						{showDueDateBadge}
						subtaskSummary={subtaskSummaryByParentId[task.id] ?? null}
						exiting={exitingTaskIds.includes(task.id)}
						busy={mutatingIds.includes(task.id)}
						draggable={enableDragAndDrop}
						dragging={draggedTaskId === task.id}
						onOpen={handleOpen}
						{onToggleComplete}
						{onDueDateChange}
						{onListChange}
						onPressStart={handlePressStart}
					/>
				{/each}
			</div>
		</section>
	{/each}
</div>

{#if draggedTask}
	<div
		class="pointer-events-none fixed top-0 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[1.25rem] border border-stone-200/80 bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(28,25,23,0.16)] backdrop-blur-sm dark:border-white/12 dark:bg-[color-mix(in_oklch,var(--color-card)_88%,transparent)] dark:shadow-none"
		style={`transform: translate(${pointerX + DRAG_PREVIEW_OFFSET_X}px, ${pointerY + DRAG_PREVIEW_OFFSET_Y}px);`}
		aria-hidden="true"
	>
		<div class="flex items-start gap-3">
			<span class="mt-0.5 text-stone-400">
				<svg viewBox="0 0 16 16" class="size-4 fill-current">
					<circle cx="5" cy="4" r="1.1"></circle>
					<circle cx="5" cy="8" r="1.1"></circle>
					<circle cx="5" cy="12" r="1.1"></circle>
					<circle cx="11" cy="4" r="1.1"></circle>
					<circle cx="11" cy="8" r="1.1"></circle>
					<circle cx="11" cy="12" r="1.1"></circle>
				</svg>
			</span>

			<div class="min-w-0">
				<p class="truncate text-sm font-medium text-foreground">{draggedTask.title}</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Move to {dropTargetKey ? 'this day' : 'another day'}
				</p>
			</div>
		</div>
	</div>
{/if}
