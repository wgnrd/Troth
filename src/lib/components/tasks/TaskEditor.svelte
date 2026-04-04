<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import { Check, Circle, CornerUpLeft, Hash, Plus, X } from '@lucide/svelte';
	import type { AppList, AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import { Button } from '$lib/components/ui/button';
	import { getSubtasks, getSubtaskSummary } from '$lib/stores/tasks';
	import { getOrderedSubtasks, subtaskOrder } from '$lib/stores/subtask-order';
	import { formatTaskRepeat, getPriorityCheckboxTone } from '$lib/tasks/view';
	import { cn, notesToEditableMarkdown } from '$lib/utils';
	import TaskComposer from './TaskComposer.svelte';
	import TaskMetaFields from './TaskMetaFields.svelte';
	import TaskRow from './TaskRow.svelte';

	let {
		task,
		allTasks = [],
		lists,
		open = false,
		saving = false,
		error = null,
		mutatingIds = [],
		onClose,
		onSave,
		onDelete,
		onOpenTask,
		onCreateTask,
		onToggleComplete,
		onDueDateChange,
		onListChange
	}: {
		task: AppTask | null;
		allTasks?: AppTask[];
		lists: AppList[];
		open?: boolean;
		saving?: boolean;
		error?: string | null;
		mutatingIds?: number[];
		onClose?: () => void;
		onSave?: (input: UpdateTaskInput) => Promise<boolean | void> | boolean | void;
		onDelete?: (task: AppTask) => Promise<void> | void;
		onOpenTask?: (task: AppTask) => void;
		onCreateTask?: (input: {
			title: string;
			listId: number;
			dueDate?: string | null;
			priority?: number;
			parentTaskId?: number | null;
		}) => Promise<boolean | void> | boolean | void;
		onToggleComplete?: (task: AppTask, completed: boolean) => Promise<void> | void;
		onDueDateChange?: (task: AppTask, dueDate: string | null) => Promise<void> | void;
		onListChange?: (task: AppTask, listId: number) => Promise<void> | void;
	} = $props();

	let title = $state('');
	let description = $state('');
	let dueDate = $state<string | null>(null);
	let repeatAfter = $state<number | null>(null);
	let repeatMode = $state<number | null>(null);
	let priority = $state(0);
	let listId = $state<number | null>(null);
	let parentTaskId = $state<number | null>(null);
	let completed = $state(false);
	let localError = $state<string | null>(null);
	let syncedTaskId = $state<number | null>(null);
	let editorEl = $state<HTMLElement | null>(null);
	let titleInput = $state<HTMLTextAreaElement | null>(null);
	let previousFocus = $state<HTMLElement | null>(null);
	let focusedTaskId = $state<number | null>(null);
	let showSubtaskComposer = $state(false);
	let notesFocused = $state(false);
	let draggedSubtaskId = $state<number | null>(null);
	let subtaskDropIndex = $state<number | null>(null);
	let pressedSubtaskId = $state<number | null>(null);
	let pressStartX = 0;
	let pressStartY = 0;
	let pointerX = $state(0);
	let pointerY = $state(0);
	let suppressOpenTaskId = $state<number | null>(null);
	let mobileSheetPointerId = $state<number | null>(null);
	let mobileSheetStartX = 0;
	let mobileSheetStartY = 0;
	let mobileSheetOffsetY = $state(0);
	let mobileSheetDragging = $state(false);
	let isMobileSheetViewport = $state(false);

	const DRAG_THRESHOLD = 6;
	const DRAG_PREVIEW_OFFSET_X = 18;
	const DRAG_PREVIEW_OFFSET_Y = 14;
	const MOBILE_SHEET_CLOSE_THRESHOLD = 96;

	onMount(() => {
		const query = window.matchMedia('(max-width: 639px)');

		const update = () => {
			isMobileSheetViewport = query.matches;
		};

		update();
		query.addEventListener('change', update);

		return () => {
			query.removeEventListener('change', update);
		};
	});

	const priorityTone = $derived(getPriorityCheckboxTone(priority));
	const repeatLabel = $derived(task ? formatTaskRepeat(task) : null);
	const parentTask = $derived(
		parentTaskId === null
			? null
			: (allTasks.find((candidate) => candidate.id === parentTaskId) ?? null)
	);
	const currentList = $derived(
		listId === null ? null : (lists.find((list) => list.id === listId) ?? null)
	);
	const subtasks = $derived.by(() => {
		if (!task) {
			return [];
		}

		return getOrderedSubtasks(task.id, getSubtasks(task.id, allTasks), $subtaskOrder);
	});
	const draggedSubtask = $derived(
		draggedSubtaskId === null
			? null
			: (subtasks.find((item) => item.id === draggedSubtaskId) ?? null)
	);
	const subtaskSummary = $derived.by(() => {
		if (!task) {
			return { total: 0, open: 0, completed: 0 };
		}

		return getSubtaskSummary(task.id, allTasks);
	});
	const subtaskSummaryLabel = $derived(formatSubtaskSummary(subtaskSummary));
	const savePayload = $derived.by(() => {
		if (!task || listId === null || !title.trim()) {
			return null;
		}

		return {
			id: task.id,
			title: title.trim(),
			description: description.trim(),
			dueDate,
			repeatAfter,
			repeatMode,
			priority,
			listId,
			parentTaskId,
			completed
		} satisfies UpdateTaskInput;
	});
	const persistedPayloadKey = $derived.by(() => {
		if (!task) {
			return '';
		}

		return JSON.stringify({
			title: task.title,
			description: notesToEditableMarkdown(task.description).trim(),
			dueDate: task.dueDate,
			repeatAfter: task.repeatAfter,
			repeatMode: task.repeatMode,
			priority: task.priority,
			listId: task.listId,
			parentTaskId: task.parentTaskId,
			completed: task.completed
		});
	});
	const draftPayloadKey = $derived(
		savePayload
			? JSON.stringify({
					title: savePayload.title,
					description: savePayload.description,
					dueDate: savePayload.dueDate,
					repeatAfter: savePayload.repeatAfter,
					repeatMode: savePayload.repeatMode,
					priority: savePayload.priority,
					listId: savePayload.listId,
					parentTaskId: savePayload.parentTaskId,
					completed: savePayload.completed
				})
			: ''
	);
	const hasPendingChanges = $derived(
		Boolean(savePayload) && draftPayloadKey !== persistedPayloadKey
	);

	$effect(() => {
		if (!task || task.id === syncedTaskId) {
			return;
		}

		syncedTaskId = task.id;
		title = task.title;
		description = notesToEditableMarkdown(task.description);
		dueDate = task.dueDate;
		repeatAfter = task.repeatAfter;
		repeatMode = task.repeatMode;
		priority = task.priority;
		listId = task.listId;
		parentTaskId = task.parentTaskId;
		completed = task.completed;
		showSubtaskComposer = false;
		notesFocused = false;
		localError = null;
	});

	$effect(() => {
		if (localError && title.trim() && listId !== null) {
			localError = null;
		}
	});

	$effect(() => {
		if (!open || !task) {
			if (previousFocus && document.contains(previousFocus)) {
				previousFocus.focus();
			}
			previousFocus = null;
			focusedTaskId = null;
			return;
		}

		if (focusedTaskId === task.id) {
			return;
		}

		focusedTaskId = task.id;
		previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	});

	$effect(() => {
		if (!open || !task) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			const activeElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;
			const isInsideEditor = activeElement ? editorEl?.contains(activeElement) : false;

			if (!isInsideEditor) {
				return;
			}

			if (event.key === 'Escape' && !saving) {
				event.preventDefault();
				onClose?.();
				return;
			}

			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !saving) {
				const form = editorEl?.querySelector('form');
				if (!form) {
					return;
				}

				event.preventDefault();
				form.requestSubmit();
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (!open || !task) {
			return;
		}

		void tick().then(() => {
			syncTitleInputHeight(title);
		});
	});

	$effect(() => {
		if (!titleInput) {
			return;
		}

		syncTitleInputHeight(title);
	});

	async function persistDraft() {
		if (!task) {
			return true;
		}

		if (!title.trim()) {
			localError = 'Title is required.';
			return false;
		}

		if (listId === null) {
			localError = 'Choose a project.';
			return false;
		}

		localError = null;

		if (!savePayload || !hasPendingChanges) {
			return true;
		}

		const saved = await onSave?.(savePayload);
		return saved !== false;
	}

	async function handleDelete() {
		if (!task || saving) {
			return;
		}

		const confirmed = confirm(`Delete "${task.title}"?`);

		if (!confirmed) {
			return;
		}

		localError = null;
		await onDelete?.(task);
	}

	async function handleClose() {
		const saved = await persistDraft();

		if (!saved) {
			return;
		}

		showSubtaskComposer = false;
		onClose?.();
	}

	async function handleFieldBlur(event: FocusEvent) {
		const nextTarget = event.relatedTarget;

		if (nextTarget instanceof Node && editorEl?.contains(nextTarget)) {
			return;
		}

		await persistDraft();
	}

	async function handleCompletionToggle() {
		if (saving) {
			return;
		}

		completed = !completed;
		const saved = await persistDraft();

		if (!saved) {
			completed = task?.completed ?? false;
		}
	}

	function formatSubtaskSummary(summary: { total: number; completed: number }) {
		if (summary.total === 0) {
			return 'No subtasks yet';
		}

		if (summary.completed === 0) {
			return `${summary.total} ${summary.total === 1 ? 'subtask' : 'subtasks'}`;
		}

		return `${summary.completed} of ${summary.total} done`;
	}

	function syncTitleInputHeight(_titleValue = title) {
		if (!titleInput) {
			return;
		}

		void _titleValue;
		titleInput.style.height = '0px';
		titleInput.style.height = `${titleInput.scrollHeight}px`;
	}

	function getProjectLinkStyle(color: string | null) {
		if (!color) {
			return undefined;
		}

		return `color: color-mix(in srgb, ${color} 72%, rgb(68 64 60)); background-color: color-mix(in srgb, ${color} 14%, white); border-color: color-mix(in srgb, ${color} 24%, rgb(231 229 228));`;
	}

	function cleanupSubtaskPointerSession() {
		pressedSubtaskId = null;
		draggedSubtaskId = null;
		subtaskDropIndex = null;

		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', handleSubtaskPointerMove);
			window.removeEventListener('pointerup', handleSubtaskPointerUp);
			window.removeEventListener('pointercancel', handleSubtaskPointerCancel);
		}
	}

	function handleSubtaskPressStart(event: PointerEvent, subtask: AppTask) {
		if (saving || mutatingIds.includes(subtask.id) || event.button !== 0) {
			return;
		}

		pressedSubtaskId = subtask.id;
		pressStartX = event.clientX;
		pressStartY = event.clientY;
		pointerX = event.clientX;
		pointerY = event.clientY;

		if (typeof window !== 'undefined') {
			window.addEventListener('pointermove', handleSubtaskPointerMove);
			window.addEventListener('pointerup', handleSubtaskPointerUp);
			window.addEventListener('pointercancel', handleSubtaskPointerCancel);
		}
	}

	function handleSubtaskPointerMove(event: PointerEvent) {
		if (pressedSubtaskId === null) {
			return;
		}

		const movedEnough =
			Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY) >= DRAG_THRESHOLD;

		if (!movedEnough && draggedSubtaskId === null) {
			return;
		}

		event.preventDefault();
		pointerX = event.clientX;
		pointerY = event.clientY;

		if (draggedSubtaskId === null) {
			draggedSubtaskId = pressedSubtaskId;
		}

		updateSubtaskDropIndex(event.clientY);
	}

	function updateSubtaskDropIndex(clientY: number) {
		if (typeof document === 'undefined') {
			return;
		}

		const itemElements = Array.from(
			document.querySelectorAll<HTMLElement>('[data-subtask-index]')
		).sort(
			(left, right) =>
				Number(left.dataset.subtaskIndex ?? '-1') - Number(right.dataset.subtaskIndex ?? '-1')
		);

		if (itemElements.length === 0) {
			subtaskDropIndex = null;
			return;
		}

		for (const element of itemElements) {
			const index = Number(element.dataset.subtaskIndex ?? '-1');
			const rect = element.getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;

			if (clientY < midpoint) {
				subtaskDropIndex = index;
				return;
			}
		}

		subtaskDropIndex = itemElements.length;
	}

	async function handleSubtaskPointerUp(event: PointerEvent) {
		updateSubtaskDropIndex(event.clientY);

		const activeSubtaskId = draggedSubtaskId;
		const targetIndex = subtaskDropIndex;

		if (activeSubtaskId !== null) {
			suppressOpenTaskId = activeSubtaskId;
			setTimeout(() => {
				if (suppressOpenTaskId === activeSubtaskId) {
					suppressOpenTaskId = null;
				}
			}, 0);
		}

		cleanupSubtaskPointerSession();

		if (!task || activeSubtaskId === null || targetIndex === null) {
			return;
		}

		const currentIndex = subtasks.findIndex((item) => item.id === activeSubtaskId);

		if (currentIndex < 0) {
			return;
		}

		let nextIndex = targetIndex;

		if (targetIndex > currentIndex) {
			nextIndex -= 1;
		}

		subtaskOrder.reorder(task.id, subtasks, activeSubtaskId, nextIndex);
	}

	function handleSubtaskPointerCancel() {
		cleanupSubtaskPointerSession();
	}

	function handleSubtaskOpen(subtask: AppTask) {
		if (suppressOpenTaskId === subtask.id) {
			return;
		}

		onOpenTask?.(subtask);
	}

	function isMobileSheetGesture(event: PointerEvent) {
		return (
			event.pointerType !== 'mouse' && typeof window !== 'undefined' && window.innerWidth < 640
		);
	}

	function handleMobileSheetPointerDown(event: PointerEvent) {
		if (!isMobileSheetGesture(event) || saving || !editorEl || editorEl.scrollTop > 0) {
			return;
		}

		mobileSheetPointerId = event.pointerId;
		mobileSheetStartX = event.clientX;
		mobileSheetStartY = event.clientY;
		mobileSheetOffsetY = 0;
		mobileSheetDragging = true;
		editorEl.setPointerCapture(event.pointerId);
	}

	function handleMobileSheetPointerMove(event: PointerEvent) {
		if (!mobileSheetDragging || mobileSheetPointerId !== event.pointerId) {
			return;
		}

		const deltaX = event.clientX - mobileSheetStartX;
		const deltaY = event.clientY - mobileSheetStartY;

		if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
			mobileSheetOffsetY = 0;
			return;
		}

		mobileSheetOffsetY = deltaY;
	}

	async function handleMobileSheetPointerEnd(event: PointerEvent) {
		if (mobileSheetPointerId !== event.pointerId) {
			return;
		}

		const shouldClose = mobileSheetOffsetY >= MOBILE_SHEET_CLOSE_THRESHOLD;

		mobileSheetPointerId = null;
		mobileSheetDragging = false;
		mobileSheetOffsetY = 0;

		if (editorEl?.hasPointerCapture(event.pointerId)) {
			editorEl.releasePointerCapture(event.pointerId);
		}

		if (shouldClose) {
			await handleClose();
		}
	}
</script>

{#if open && task}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-stone-950/20 backdrop-blur-[2px]"
		aria-label="Close task editor"
		onclick={handleClose}
	></button>

	<aside
		bind:this={editorEl}
		class="fixed inset-x-0 bottom-0 z-50 max-h-[66vh] w-full overflow-y-auto rounded-t-[1.8rem] border border-border/70 bg-background/96 p-4 shadow-2xl transition-transform sm:inset-x-3 sm:bottom-3 sm:max-h-[calc(100vh-1.5rem)] sm:w-auto sm:rounded-[1.8rem] lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[calc(100vw-1.5rem)] lg:max-w-[52rem] lg:-translate-x-1/2 lg:-translate-y-1/2"
		style:translate={isMobileSheetViewport ? `0 ${mobileSheetOffsetY}px` : null}
		aria-label="Task editor"
	>
		<div class="space-y-4">
			<div class="space-y-3">
				<div
					role="presentation"
					class="mx-auto h-1.5 w-12 rounded-full bg-stone-300/90 sm:hidden dark:bg-white/18"
					onpointerdown={handleMobileSheetPointerDown}
					onpointermove={handleMobileSheetPointerMove}
					onpointerup={handleMobileSheetPointerEnd}
					onpointercancel={handleMobileSheetPointerEnd}
				></div>

				<div class="flex items-center justify-between gap-3">
					<div class="min-w-0">
						{#if parentTask}
							<button
								type="button"
								class="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-stone-50/75 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background/90 dark:bg-white/7 dark:hover:bg-white/10"
								onclick={() => {
									onOpenTask?.(parentTask);
								}}
							>
								<CornerUpLeft class="size-3.5 shrink-0 text-muted-foreground" />
								<span class="truncate">{parentTask.title}</span>
							</button>
						{:else if currentList}
							<a
								href={resolve(`/projects/${currentList.id}`)}
								class="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:bg-background/90"
								style={getProjectLinkStyle(currentList.color)}
							>
								<Hash class="size-3.5 shrink-0" />
								<span class="truncate">{currentList.title}</span>
							</a>
						{/if}
					</div>

					<Button
						variant="ghost"
						size="sm"
						class="shrink-0 text-muted-foreground hover:text-foreground"
						onclick={handleClose}
					>
						<X class="size-3.5" />
						Close
					</Button>
				</div>
			</div>

			<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
				<div class="min-w-0 space-y-3">
					<div class="pb-1">
						<div class="flex items-start gap-3">
							<button
								type="button"
								class={cn(
									'mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition outline-none focus-visible:border-primary/30 focus-visible:ring-3 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50',
									completed
										? 'border-transparent bg-primary text-primary-foreground'
										: priorityTone.idle
								)}
								aria-label={completed ? 'Mark task as incomplete' : 'Mark task as complete'}
								aria-pressed={completed}
								disabled={saving}
								onclick={handleCompletionToggle}
							>
								{#if completed}
									<Check class="size-4" />
								{:else}
									<Circle class="size-4.5" />
								{/if}
							</button>

							<div class="min-w-0 flex-1">
								<label class="sr-only" for="task-title">Task title</label>
								<textarea
									id="task-title"
									bind:this={titleInput}
									bind:value={title}
									class={cn(
										'min-h-12 w-full resize-none overflow-hidden border-0 bg-transparent px-0 pt-2 pb-1 text-[1.5rem] leading-tight font-semibold tracking-tight break-words whitespace-pre-wrap text-foreground transition outline-none placeholder:text-muted-foreground/60 focus:ring-0',
										completed && 'text-muted-foreground line-through decoration-2'
									)}
									rows="1"
									placeholder="Untitled task"
									disabled={saving}
									oninput={() => {
										syncTitleInputHeight();
									}}
									onblur={handleFieldBlur}
								></textarea>
							</div>
						</div>
					</div>

					<div class="space-y-3">
						<label class="text-sm font-medium text-foreground/85" for="task-description"
							>Notes</label
						>
						<textarea
							id="task-description"
							bind:value={description}
							class={cn(
								'w-full rounded-[1.2rem] border border-border/60 bg-stone-50/40 px-4 py-3 text-sm leading-6 text-foreground transition outline-none placeholder:text-muted-foreground/65 focus:border-primary/30 focus:bg-background focus:ring-3 focus:ring-primary/10 dark:bg-white/6 dark:focus:bg-white/8',
								description.trim() || notesFocused ? 'min-h-40' : 'min-h-12 sm:min-h-40'
							)}
							disabled={saving}
							placeholder="Leave yourself a note"
							onfocus={() => {
								notesFocused = true;
							}}
							onblur={handleFieldBlur}
						></textarea>
					</div>

					<section
						class="space-y-3 rounded-[1.35rem] border border-border/60 bg-stone-50/45 p-3 dark:bg-white/6"
					>
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<p class="text-sm font-medium text-foreground">Subtasks</p>
								<p class="text-xs text-muted-foreground">{subtaskSummaryLabel}</p>
							</div>

							<Button
								variant="ghost"
								size="icon"
								class="size-8 rounded-full"
								aria-label="Add subtask"
								disabled={saving || listId === null}
								onclick={() => {
									showSubtaskComposer = true;
								}}
							>
								<Plus class="size-4" />
							</Button>
						</div>

						{#if showSubtaskComposer}
							<TaskComposer
								{lists}
								busy={saving}
								{error}
								defaultListId={task?.listId ?? null}
								defaultDueDate={task?.dueDate ?? null}
								defaultPriority={0}
								parentTaskId={task.id}
								showMetaFields={false}
								autoFocus
								placeholder="Add a subtask"
								disabledMessage="Choose a project for this task before adding subtasks."
								onCollapse={() => {
									showSubtaskComposer = false;
								}}
								onSubmit={onCreateTask}
							/>
						{/if}

						{#if subtasks.length > 0}
							<div
								class={cn(
									'space-y-0.5 rounded-[1.2rem] transition',
									draggedSubtaskId !== null && 'bg-white/55 dark:bg-white/6'
								)}
							>
								{#each subtasks as subtask, index (subtask.id)}
									<div
										class={cn(
											'relative',
											subtaskDropIndex === index &&
												'before:absolute before:top-0 before:right-2 before:left-2 before:h-0.5 before:-translate-y-1/2 before:rounded-full before:bg-stone-300'
										)}
										data-subtask-index={index}
									>
										<TaskRow
											task={subtask}
											list={null}
											{lists}
											busy={mutatingIds.includes(subtask.id)}
											dragging={draggedSubtaskId === subtask.id}
											class={cn(
												'min-w-0 px-2 py-2 select-none',
												draggedSubtaskId !== null &&
													draggedSubtaskId !== subtask.id &&
													'opacity-90 transition-opacity'
											)}
											onOpen={handleSubtaskOpen}
											{onToggleComplete}
											{onDueDateChange}
											{onListChange}
											onPressStart={handleSubtaskPressStart}
										/>
									</div>
								{/each}

								{#if subtaskDropIndex === subtasks.length}
									<div class="relative h-0.5">
										<div
											class="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-stone-300"
										></div>
									</div>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">
								Add smaller steps here when a task needs a little structure.
							</p>
						{/if}
					</section>
				</div>

				<div
					class="min-w-0 border-t border-border/60 pt-4 lg:border-t-0 lg:border-l lg:border-border/55 lg:pt-0 lg:pl-4"
				>
					<div class="space-y-3">
						<TaskMetaFields
							{lists}
							bind:listId
							bind:dueDate
							bind:repeatAfter
							bind:repeatMode
							bind:priority
							showRepeatField
							{repeatLabel}
							layout="surface"
							disabled={saving}
							tintedDueDateField
							onDueDateChange={async () => {
								await persistDraft();
							}}
							onListChange={async () => {
								await persistDraft();
							}}
							onPriorityChange={async () => {
								await persistDraft();
							}}
							onRepeatChange={async () => {
								await persistDraft();
							}}
						/>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
				<div>
					{#if localError || error}
						<p class="text-sm text-destructive">{localError ?? error}</p>
					{:else if saving}
						<p class="text-sm text-muted-foreground">Saving…</p>
					{/if}
				</div>

				<Button
					variant="ghost"
					size="sm"
					class="text-destructive/80 hover:bg-destructive/8 hover:text-destructive"
					onclick={handleDelete}
					disabled={saving}
				>
					Delete task
				</Button>
			</div>
		</div>
	</aside>
{/if}

{#if open && draggedSubtask}
	<div
		class="pointer-events-none fixed top-0 left-0 z-[60] w-[min(24rem,calc(100vw-2rem))] rounded-[1.25rem] border border-stone-200/80 bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(28,25,23,0.16)] backdrop-blur-sm dark:border-white/12 dark:bg-[color-mix(in_oklch,var(--color-card)_88%,transparent)] dark:shadow-none"
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
				<p class="truncate text-sm font-medium text-foreground">{draggedSubtask.title}</p>
				<p class="mt-1 text-xs text-muted-foreground">Move within this subtask list</p>
			</div>
		</div>
	</div>
{/if}
