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
		showDueDateBadge?: boolean;
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

</script>

<div class="space-y-4">
	{#each groups as group (group.key)}
			<section
				class={cn(
					'space-y-3 rounded-[1.6rem] border border-transparent px-2 py-2 transition-all duration-200',
					enableDragAndDrop && draggedTaskId !== null && group.key !== 'no-date' && 'border-dashed',
					dropTargetKey === group.key && 'border-stone-300 bg-white/68 shadow-[0_10px_24px_rgba(28,25,23,0.08)]'
				)}
				role="group"
				aria-label={`Upcoming tasks for ${group.title}`}
				data-drop-key={group.key}
				onpointerenter={() => handleDropZoneEnter(group.key)}
				onpointermove={() => handleDropZoneMove(group.key)}
				onpointerleave={() => handleDropZoneLeave(group.key)}
			>
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

				{#if enableDragAndDrop && draggedTaskId !== null && group.key !== 'no-date'}
					<p
						class={cn(
							'mt-2 text-xs text-muted-foreground transition',
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
		class="pointer-events-none fixed top-0 left-0 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[1.25rem] border border-stone-200/80 bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(28,25,23,0.16)] backdrop-blur-sm"
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
				<p class="mt-1 text-xs text-muted-foreground">Move to {dropTargetKey ? 'this day' : 'another day'}</p>
			</div>
		</div>
	</div>
{/if}
