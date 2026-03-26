<script lang="ts">
	import { Check, Circle, Plus, X } from '@lucide/svelte';
	import type { AppList, AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import { Button } from '$lib/components/ui/button';
	import { getSubtasks, getSubtaskSummary } from '$lib/stores/tasks';
	import { formatTaskRepeat, getPriorityCheckboxTone, sortTasks } from '$lib/tasks/view';
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

	const priorityTone = $derived(getPriorityCheckboxTone(priority));
	const repeatLabel = $derived(task ? formatTaskRepeat(task) : null);
	const subtasks = $derived.by(() => {
		if (!task) {
			return [];
		}

		return sortTasks(getSubtasks(task.id, allTasks));
	});
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
		class="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[52rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-4 shadow-2xl"
		aria-label="Task editor"
	>
		<div class="space-y-4">
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
										'min-h-12 w-full resize-none border-0 bg-transparent px-0 pt-2 pb-1 text-[1.5rem] leading-tight font-semibold tracking-tight break-words whitespace-pre-wrap text-foreground transition outline-none placeholder:text-muted-foreground/60 focus:ring-0',
										completed && 'text-muted-foreground line-through decoration-2'
									)}
									rows="1"
									placeholder="Untitled task"
									disabled={saving}
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
							class="min-h-40 w-full rounded-[1.2rem] border border-border/60 bg-stone-50/40 px-4 py-3 text-sm leading-6 text-foreground transition outline-none placeholder:text-muted-foreground/65 focus:border-primary/30 focus:bg-background focus:ring-3 focus:ring-primary/10"
							disabled={saving}
							placeholder="Add notes"
							onblur={handleFieldBlur}
						></textarea>
					</div>

					<section class="space-y-3 rounded-[1.35rem] border border-border/60 bg-stone-50/45 p-3">
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
							<div class="space-y-0.5">
								{#each subtasks as subtask (subtask.id)}
									<TaskRow
										task={subtask}
										list={null}
										{lists}
										busy={mutatingIds.includes(subtask.id)}
										class="px-2 py-2"
										onOpen={onOpenTask}
										{onToggleComplete}
										{onDueDateChange}
										{onListChange}
									/>
								{/each}
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
						<div class="flex items-center justify-end">
							<Button
								variant="ghost"
								size="sm"
								class="text-muted-foreground hover:text-foreground"
								onclick={handleClose}
							>
								<X class="size-3.5" />
								Close
							</Button>
						</div>
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
