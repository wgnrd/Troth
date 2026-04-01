<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { FolderTree, RefreshCcw, Settings2, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { filterTopLevelTasks, getSubtaskSummary, tasks } from '$lib/stores/tasks';
	import { fromDateInputValue, groupTasksByDate, sortTasks } from '$lib/tasks/view';
	import {
		findProjectById,
		getDescendantProjectIds,
		getEffectiveHiddenProjectIds
	} from '$lib/lists/tree';
	import TaskComposer from '$lib/components/tasks/TaskComposer.svelte';
	import TaskEditor from '$lib/components/tasks/TaskEditor.svelte';
	import TaskGroupedList from '$lib/components/tasks/TaskGroupedList.svelte';
	import TaskListSkeleton from '$lib/components/tasks/TaskListSkeleton.svelte';

	let { listId }: { listId: number } = $props();

	let selectedTaskId = $state<number | null>(null);
	let lastLoadKey = $state('');
	let exitingTaskIds = $state<number[]>([]);
	let showQuickAddComposer = $state(false);
	const exitTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {};

	const configured = $derived(Boolean($connection.settings));
	const allActiveLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allActiveLists, $projectPreferences.hiddenProjectIds)
	);
	const activeLists = $derived(allActiveLists.filter((list) => !hiddenProjectIds.has(list.id)));
	const currentProject = $derived(findProjectById(activeLists, listId));
	const visibleProjectIds = $derived(
		currentProject ? getDescendantProjectIds(activeLists, currentProject.id) : []
	);
	const visibleProjectIdSet = $derived(new Set(visibleProjectIds));
	const visibleTasks = $derived.by(() => {
		const filteredTasks = filterTopLevelTasks($tasks.items).filter((task) => {
			return !task.completed && task.listId !== null && visibleProjectIdSet.has(task.listId);
		});
		const exitingTasks = $tasks.items.filter(
			(task) =>
				exitingTaskIds.includes(task.id) && !filteredTasks.some((item) => item.id === task.id)
		);

		return sortTasks([...filteredTasks, ...exitingTasks]);
	});
	const groupedVisibleTasks = $derived(groupTasksByDate(visibleTasks));
	const selectedTask = $derived(
		selectedTaskId === null
			? null
			: ($tasks.items.find((task) => task.id === selectedTaskId) ?? null)
	);
	const isSavingSelectedTask = $derived(
		selectedTask ? $tasks.mutatingIds.includes(selectedTask.id) : false
	);
	const listsById = $derived(new Map(activeLists.map((list) => [list.id, list])));
	const subtaskSummaryByParentId = $derived.by(() => {
		const summaries: Record<number, { total: number; open: number; completed: number }> = {};

		for (const task of visibleTasks) {
			const summary = getSubtaskSummary(task.id, $tasks.items);

			if (summary.total > 0) {
				summaries[task.id] = summary;
			}
		}

		return summaries;
	});
	const loadError = $derived($tasks.error ?? $lists.error);
	const hasVisibleTasks = $derived(visibleTasks.length > 0);
	const showInitialLoading = $derived(
		configured && $tasks.loading && !$tasks.loaded && !$lists.loaded
	);
	const showEmptyState = $derived(
		configured && !showInitialLoading && !loadError && currentProject && !hasVisibleTasks
	);
	const nestedProjectCount = $derived(Math.max(visibleProjectIds.length - 1, 0));
	const projectMeta = $derived.by(() => {
		if (!currentProject) {
			return undefined;
		}

		if (nestedProjectCount > 0) {
			return `Includes ${nestedProjectCount} nested project${nestedProjectCount === 1 ? '' : 's'}`;
		}

		return currentProject.description || 'Grouped by due date';
	});

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			selectedTaskId = null;
			showQuickAddComposer = false;
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`;

		if (nextKey !== lastLoadKey) {
			lastLoadKey = nextKey;
			void Promise.all([lists.load(), tasks.load()]);
		}
	});

	$effect(() => {
		if (selectedTaskId !== null && !selectedTask) {
			selectedTaskId = null;
		}
	});

	$effect(() => {
		if (!browser || !configured || !currentProject) {
			return;
		}

		function handleQuickAddShortcut(event: KeyboardEvent) {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			if (event.key.toLowerCase() !== 'n') {
				return;
			}

			const activeElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;

			if (
				activeElement &&
				(activeElement.isContentEditable ||
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement ||
					activeElement instanceof HTMLSelectElement)
			) {
				return;
			}

			event.preventDefault();
			showQuickAddComposer = true;
		}

		document.addEventListener('keydown', handleQuickAddShortcut);

		return () => {
			document.removeEventListener('keydown', handleQuickAddShortcut);
		};
	});

	async function handleRefresh() {
		await Promise.all([lists.refresh(), tasks.refresh()]);
	}

	async function handleDeleteProject() {
		if (!currentProject) {
			return;
		}

		const confirmed = confirm(`Delete "${currentProject.title}" and its nested projects?`);

		if (!confirmed) {
			return;
		}

		const deletedProjectIds = await lists.deleteProject(currentProject.id);

		if (!deletedProjectIds) {
			return;
		}

		projectPreferences.removeProjectIds(deletedProjectIds);
		tasks.removeTasksByListIds(deletedProjectIds);
		selectedTaskId = null;
		await goto(resolve('/projects'));
	}

	async function handleQuickAdd(input: {
		title: string;
		listId: number;
		dueDate?: string | null;
		priority?: number;
		parentTaskId?: number | null;
	}) {
		const createdTask = await tasks.createTask(input);
		return Boolean(createdTask);
	}

	async function handleSave(input: UpdateTaskInput) {
		const savedTask = await tasks.updateTask(input);

		if (savedTask) {
			selectedTaskId = savedTask.id;
		}

		return Boolean(savedTask);
	}

	async function handleToggleComplete(task: AppTask, completed: boolean) {
		if (completed) {
			startTaskExit(task.id);
		} else {
			clearTaskExit(task.id);
		}

		await tasks.setCompleted(task.id, completed);
	}

	function startTaskExit(taskId: number) {
		clearTaskExit(taskId);
		exitingTaskIds = [...exitingTaskIds, taskId];

		const timer = setTimeout(() => {
			exitingTaskIds = exitingTaskIds.filter((id) => id !== taskId);
			delete exitTimers[taskId];
		}, 1000);

		exitTimers[taskId] = timer;
	}

	function clearTaskExit(taskId: number) {
		const timer = exitTimers[taskId];
		if (timer) {
			clearTimeout(timer);
			delete exitTimers[taskId];
		}

		exitingTaskIds = exitingTaskIds.filter((id) => id !== taskId);
	}

	async function handleDueDateChange(task: AppTask, dueDate: string | null) {
		if (task.listId === null) {
			return;
		}

		await tasks.updateTask(buildUpdateInput(task, { dueDate }));
	}

	async function handleRescheduleTask(task: AppTask, dateKey: string) {
		if (task.listId === null) {
			return;
		}

		const nextDueDate = fromDateInputValue(dateKey);

		if (!nextDueDate || task.dueDate?.slice(0, 10) === dateKey) {
			return;
		}

		await handleDueDateChange(task, nextDueDate);
	}

	async function handleListChange(task: AppTask, nextListId: number) {
		await tasks.updateTask(buildUpdateInput(task, { listId: nextListId }));
	}

	async function handleDelete(task: AppTask) {
		const deleted = await tasks.deleteTask(task.id);

		if (deleted) {
			selectedTaskId = null;
		}
	}

	function buildUpdateInput(
		task: AppTask,
		overrides: Partial<UpdateTaskInput> = {}
	): UpdateTaskInput {
		return {
			id: task.id,
			title: task.title,
			description: task.description,
			dueDate: task.dueDate,
			repeatAfter: task.repeatAfter,
			repeatMode: task.repeatMode,
			priority: task.priority,
			listId: task.listId ?? activeLists[0]?.id ?? 0,
			parentTaskId: task.parentTaskId,
			completed: task.completed,
			...overrides
		};
	}
</script>

<section class="mx-auto flex w-full max-w-[44rem] flex-col gap-4 sm:gap-5">
	<div class="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-0.5">
			<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
				{currentProject?.title ?? 'Project'}
			</h1>
			{#if projectMeta}
				<p class="text-sm text-muted-foreground">{projectMeta}</p>
			{/if}
		</div>

		{#if configured}
			<div class="flex items-center gap-2 self-end">
				{#if currentProject}
					<Button
						variant="ghost"
						size="sm"
						class="text-destructive/80 hover:bg-destructive/8 hover:text-destructive"
						aria-label={`Delete ${currentProject.title}`}
						disabled={$lists.mutatingIds.includes(currentProject.id)}
						onclick={() => {
							void handleDeleteProject();
						}}
					>
						<Trash2 class="size-3.5" />
						Delete Project
					</Button>
				{/if}

				<Button
					variant="outline"
					size="sm"
					class="hidden sm:inline-flex"
					aria-label={$tasks.loading || $lists.loading
						? 'Refreshing project tasks'
						: 'Refresh project tasks'}
					onclick={handleRefresh}
					disabled={$tasks.loading || $lists.loading}
				>
					<RefreshCcw class="size-3.5" />
					{$tasks.loading || $lists.loading ? 'Refreshing…' : 'Refresh'}
				</Button>
			</div>
		{/if}
	</div>

	{#if !configured}
		<div class="rounded-[1.6rem] border border-border/70 bg-white/70 p-4 shadow-sm dark:bg-white/7 dark:shadow-none">
			<div class="flex items-start gap-3">
				<span class="rounded-xl bg-muted p-2 text-muted-foreground">
					<Settings2 class="size-4" />
				</span>

				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium text-foreground">Troth is not connected to Vikunja yet.</p>
					<p class="text-sm text-muted-foreground">
						Connect Troth to Vikunja in Settings before loading project tasks.
					</p>
					<Button href={resolve('/settings')} size="sm">Open Settings</Button>
				</div>
			</div>
		</div>
	{:else if !currentProject && $lists.loaded}
		<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none">
			<div class="mx-auto flex max-w-md flex-col items-center text-center">
				<div
					class="mb-4 rounded-[1.4rem] border border-border/60 bg-background/90 p-3 text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] dark:border-white/10 dark:bg-white/6 dark:text-stone-300 dark:shadow-none"
				>
					<FolderTree class="size-5" />
				</div>
				<p class="text-base font-medium text-foreground">Project not found</p>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					This project is missing, archived, or no longer available from Vikunja.
				</p>
				<Button href={resolve('/projects')} size="sm" class="mt-4">Back to Projects</Button>
			</div>
		</div>
	{:else}
		{#if currentProject}
			{#if showQuickAddComposer}
				<div class="hidden md:block">
					<TaskComposer
						lists={activeLists}
						busy={$tasks.creating}
						error={$tasks.mutationError}
						fixedListId={currentProject.id}
						autoFocus
						placeholder={`Add to ${currentProject.title}`}
						disabledMessage="Add a project in Vikunja before creating tasks."
						onCollapse={() => {
							showQuickAddComposer = false;
						}}
						onSubmit={handleQuickAdd}
					/>
				</div>
			{:else}
				<div class="hidden justify-start md:flex">
					<Button
						variant="outline"
						size="sm"
						class="group h-10 gap-2 rounded-full pr-2 pl-3"
						aria-label={`Add to ${currentProject.title}`}
						onclick={() => {
							showQuickAddComposer = true;
						}}
					>
						<span class="text-base leading-none">+</span>
						<span>Add task</span>
						<span
							class="inline-flex items-center gap-1 opacity-65 transition group-hover:opacity-100"
							aria-hidden="true"
						>
							<kbd
								class="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/70 bg-background px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] dark:border-white/12 dark:bg-white/6 dark:shadow-none"
							>
								N
							</kbd>
						</span>
					</Button>
				</div>
			{/if}
		{/if}

		{#if loadError}
			<div
				class="rounded-[1.6rem] border border-destructive/30 bg-destructive/6 px-4 py-3 text-sm text-destructive"
			>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p>{loadError}</p>
					<Button variant="destructive" size="sm" onclick={handleRefresh}>Try again</Button>
				</div>
			</div>
		{/if}

		{#if showInitialLoading}
			<TaskListSkeleton rows={5} />
		{:else if showEmptyState}
			<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none">
				<div class="space-y-2 text-center sm:text-left">
					<p class="text-sm font-medium text-foreground">No active tasks</p>
					<p class="text-sm text-muted-foreground">
						Nothing is scheduled in this project yet. Add a task or pick a nested project from the
						sidebar.
					</p>
				</div>
			</div>
		{:else if hasVisibleTasks}
			<TaskGroupedList
				groups={groupedVisibleTasks}
				lists={activeLists}
				{listsById}
				groupAriaLabelPrefix="Project tasks for"
				showDueDateBadge={false}
				{subtaskSummaryByParentId}
				{exitingTaskIds}
				mutatingIds={$tasks.mutatingIds}
				enableDragAndDrop
				onOpen={(task) => {
					selectedTaskId = task.id;
					tasks.clearMutationError();
				}}
				onToggleComplete={handleToggleComplete}
				onDueDateChange={handleDueDateChange}
				onListChange={handleListChange}
				onRescheduleTask={handleRescheduleTask}
			/>
		{/if}
	{/if}
</section>

<TaskEditor
	task={selectedTask}
	allTasks={$tasks.items}
	lists={activeLists}
	open={selectedTask !== null}
	saving={isSavingSelectedTask}
	error={$tasks.mutationError}
	mutatingIds={$tasks.mutatingIds}
	onClose={() => {
		selectedTaskId = null;
		tasks.clearMutationError();
	}}
	onOpenTask={(task) => {
		selectedTaskId = task.id;
		tasks.clearMutationError();
	}}
	onCreateTask={handleQuickAdd}
	onToggleComplete={handleToggleComplete}
	onDueDateChange={handleDueDateChange}
	onListChange={handleListChange}
	onSave={handleSave}
	onDelete={handleDelete}
/>
