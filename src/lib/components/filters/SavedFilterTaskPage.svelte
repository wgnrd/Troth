<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Filter, RefreshCcw, Settings2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import { fetchSavedFilterTasks } from '$lib/api/troth/client';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { savedFilters } from '$lib/stores/saved-filters';
	import { filterTopLevelTasks, getSubtaskSummary, tasks } from '$lib/stores/tasks';
	import { getEffectiveHiddenProjectIds } from '$lib/lists/tree';
	import { fromDateInputValue, groupTasksByDate, sortTasks } from '$lib/tasks/view';
	import TaskEditor from '$lib/components/tasks/TaskEditor.svelte';
	import TaskGroupedList from '$lib/components/tasks/TaskGroupedList.svelte';
	import TaskListSkeleton from '$lib/components/tasks/TaskListSkeleton.svelte';

	let { filterId }: { filterId: number } = $props();

	let selectedTaskId = $state<number | null>(null);
	let lastLoadKey = $state('');
	let exitingTaskIds = $state<number[]>([]);
	let filterTaskSnapshot = $state<AppTask[]>([]);
	let filterTasksLoading = $state(false);
	let filterTasksLoaded = $state(false);
	let filterTasksError = $state<string | null>(null);
	const exitTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {};

	const configured = $derived(Boolean($connection.settings));
	const allActiveLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allActiveLists, $projectPreferences.hiddenProjectIds)
	);
	const activeLists = $derived(allActiveLists.filter((list) => !hiddenProjectIds.has(list.id)));
	const listsById = $derived(new Map(activeLists.map((list) => [list.id, list])));
	const currentFilter = $derived($savedFilters.items.find((item) => item.id === filterId) ?? null);
	const visibleTasks = $derived.by(() => {
		const filteredTasks = filterTopLevelTasks(filterTaskSnapshot)
			.map((task) => $tasks.items.find((item) => item.id === task.id) ?? task)
			.filter((task) => task.listId === null || listsById.has(task.listId));
		const exitingTasks = filterTopLevelTasks($tasks.items).filter(
			(task) =>
				exitingTaskIds.includes(task.id) && !filteredTasks.some((item) => item.id === task.id)
		);

		return sortTasks([...filteredTasks, ...exitingTasks]);
	});
	const groupedVisibleTasks = $derived(groupTasksByDate(visibleTasks));
	const selectedTask = $derived.by(() => {
		if (selectedTaskId === null) {
			return null;
		}

		return (
			$tasks.items.find((task) => task.id === selectedTaskId) ??
			filterTaskSnapshot.find((task) => task.id === selectedTaskId) ??
			null
		);
	});
	const isSavingSelectedTask = $derived(
		selectedTask ? $tasks.mutatingIds.includes(selectedTask.id) : false
	);
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
	const loadError = $derived(
		filterTasksError ?? $savedFilters.error ?? $tasks.error ?? $lists.error
	);
	const hasVisibleTasks = $derived(visibleTasks.length > 0);
	const showInitialLoading = $derived(
		configured &&
			(filterTasksLoading || $tasks.loading || $lists.loading || $savedFilters.loading) &&
			!filterTasksLoaded
	);
	const showEmptyState = $derived(
		configured && !showInitialLoading && !loadError && currentFilter && !hasVisibleTasks
	);
	const filterMeta = $derived(currentFilter?.description || 'Tasks matching this saved filter');

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			selectedTaskId = null;
			filterTaskSnapshot = [];
			filterTasksLoaded = false;
			filterTasksError = null;
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}|${filterId}`;

		if (nextKey !== lastLoadKey) {
			lastLoadKey = nextKey;
			void Promise.all([lists.load(), tasks.load(), savedFilters.load(), loadFilterTasks(true)]);
		}
	});

	$effect(() => {
		if (selectedTaskId !== null && !selectedTask) {
			selectedTaskId = null;
		}
	});

	let lastCompletionVersion = $state(0);

	$effect(() => {
		if (!configured || !filterTasksLoaded) {
			lastCompletionVersion = $tasks.completionVersion;
			return;
		}

		if ($tasks.completionVersion === lastCompletionVersion) {
			return;
		}

		lastCompletionVersion = $tasks.completionVersion;
		void loadFilterTasks(true);
	});

	async function loadFilterTasks(force = false) {
		const current = $connection.settings;

		if (!current) {
			filterTasksError = 'Add your Vikunja connection in Settings to load saved filters.';
			filterTasksLoaded = false;
			filterTaskSnapshot = [];
			return;
		}

		if (filterTasksLoading && !force) {
			return;
		}

		filterTasksLoading = true;
		filterTasksError = null;

		try {
			filterTaskSnapshot = await fetchSavedFilterTasks(filterId);
			filterTasksLoaded = true;
		} catch (error) {
			filterTasksError =
				error instanceof Error ? error.message : 'Could not load tasks for this saved filter.';
		} finally {
			filterTasksLoading = false;
		}
	}

	async function handleRefresh() {
		await Promise.all([
			lists.refresh(),
			tasks.refresh(),
			savedFilters.refresh(),
			loadFilterTasks(true)
		]);
	}

	async function handleSave(input: UpdateTaskInput) {
		const savedTask = await tasks.updateTask(input);

		await loadFilterTasks(true);

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
		await loadFilterTasks(true);
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
		await loadFilterTasks(true);
	}

	async function handleDelete(task: AppTask) {
		const deleted = await tasks.deleteTask(task.id);

		await loadFilterTasks(true);

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

<section class="mx-auto flex w-full max-w-[44rem] flex-col gap-5 sm:gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
				{currentFilter?.title ?? 'Saved Filter'}
			</h1>
			<p class="text-sm text-muted-foreground">{filterMeta}</p>
		</div>

		{#if configured}
			<Button
				variant="outline"
				size="sm"
				class="hidden self-end sm:inline-flex"
				aria-label={filterTasksLoading || $tasks.loading || $lists.loading || $savedFilters.loading
					? 'Refreshing saved filter'
					: 'Refresh saved filter'}
				onclick={handleRefresh}
				disabled={filterTasksLoading || $tasks.loading || $lists.loading || $savedFilters.loading}
			>
				<RefreshCcw class="size-3.5" />
				{filterTasksLoading || $tasks.loading || $lists.loading || $savedFilters.loading
					? 'Refreshing…'
					: 'Refresh'}
			</Button>
		{/if}
	</div>

	{#if !configured}
		<div class="rounded-[1.6rem] border border-border/70 bg-white/70 p-4 shadow-sm">
			<div class="flex items-start gap-3">
				<span class="rounded-xl bg-muted p-2 text-muted-foreground">
					<Settings2 class="size-4" />
				</span>

				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium text-foreground">Troth is not connected to Vikunja yet.</p>
					<p class="text-sm text-muted-foreground">
						Connect Troth to Vikunja in Settings before loading saved filters.
					</p>
					<Button href={resolve('/settings')} size="sm">Open Settings</Button>
				</div>
			</div>
		</div>
	{:else if !currentFilter && $savedFilters.loaded}
		<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm">
			<div class="mx-auto flex max-w-md flex-col items-center text-center">
				<div
					class="mb-4 rounded-[1.4rem] border border-border/60 bg-background/90 p-3 text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]"
				>
					<Filter class="size-5" />
				</div>
				<p class="text-base font-medium text-foreground">Saved filter not found</p>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					This saved filter is missing or no longer available from Vikunja.
				</p>
			</div>
		</div>
	{:else}
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
			<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm">
				<div class="space-y-2 text-center sm:text-left">
					<p class="text-sm font-medium text-foreground">No matching tasks</p>
					<p class="text-sm text-muted-foreground">
						There are no active tasks in this saved filter right now.
					</p>
				</div>
			</div>
		{:else if hasVisibleTasks}
			<TaskGroupedList
				groups={groupedVisibleTasks}
				lists={activeLists}
				{listsById}
				groupAriaLabelPrefix="Saved filter tasks for"
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
	onToggleComplete={handleToggleComplete}
	onDueDateChange={handleDueDateChange}
	onListChange={handleListChange}
	onSave={handleSave}
	onDelete={handleDelete}
/>
