<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Inbox, RefreshCcw, Settings2, Sun } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import CalendarDayPreview from './CalendarDayPreview.svelte';
	import { calendarEvents } from '$lib/stores/calendar-events';
	import { calendarFeed } from '$lib/stores/calendar-feed';
	import { calendarPreviewPreferences } from '$lib/stores/calendar-preview-preferences';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { filterTopLevelTasks, getSubtaskSummary, tasks } from '$lib/stores/tasks';
	import { getEffectiveHiddenProjectIds } from '$lib/lists/tree';
	import DueDatePicker from './DueDatePicker.svelte';
	import {
		UPCOMING_DAY_WINDOW,
		filterTasksForView,
		findInboxList,
		fromDateInputValue,
		groupUpcomingTasksByDate,
		sortTodayTasks,
		sortTasks,
		type TaskViewKey
	} from '$lib/tasks/view';
	import TaskEditor from './TaskEditor.svelte';
	import TaskGroupedList from './TaskGroupedList.svelte';
	import TaskList from './TaskList.svelte';
	import TaskListSkeleton from './TaskListSkeleton.svelte';

	let {
		view,
		title,
		meta,
		emptyState
	}: {
		view: TaskViewKey;
		title: string;
		meta?: string;
		emptyState: string;
	} = $props();

	let selectedTaskId = $state<number | null>(null);
	let lastLoadKey = $state('');
	let exitingTaskIds = $state<number[]>([]);
	let bulkRescheduling = $state(false);
	let taskCollectionMode = $state<'backlog' | 'active'>('backlog');
	let loadMoreTrigger = $state<HTMLDivElement | null>(null);
	const exitTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {};

	const configured = $derived(Boolean($connection.settings));
	const currentView = $derived(view as TaskViewKey | string);
	const taskLoadView = $derived.by(() => {
		if (currentView === 'completed') {
			return 'completed';
		}

		if (currentView === 'active' || currentView === 'backlog') {
			return 'active';
		}

		return 'all';
	});
	const calendarConfigured = $derived(Boolean($calendarFeed.settings));
	const calendarVisible = $derived($calendarPreviewPreferences.calendarVisible);
	const showBacklogSwitch = $derived(currentView === 'backlog');
	const allActiveLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allActiveLists, $projectPreferences.hiddenProjectIds)
	);
	const activeLists = $derived(allActiveLists.filter((list) => !hiddenProjectIds.has(list.id)));
	const inboxList = $derived(findInboxList(activeLists));
	const rescheduleFallbackListId = $derived(inboxList?.id ?? activeLists[0]?.id ?? null);
	const visibleTasks = $derived.by(() => {
		const routeTasks =
			currentView === 'backlog' && taskCollectionMode === 'active'
				? filterTasksForView('active', $tasks.items, activeLists)
				: filterTasksForView(view as TaskViewKey, $tasks.items, activeLists);
		const exitingTasks = $tasks.items.filter(
			(task) => exitingTaskIds.includes(task.id) && !routeTasks.some((item) => item.id === task.id)
		);

		const nextTasks = [...routeTasks, ...exitingTasks];
		return currentView === 'today' ? sortTodayTasks(nextTasks) : sortTasks(nextTasks);
	});
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
	const emptyMessage = $derived(
		currentView === 'inbox' && !inboxList
			? 'No project named Inbox was found in Vikunja yet.'
			: taskCollectionMode === 'active' && currentView === 'backlog'
				? 'No active tasks.'
				: emptyState
	);
	const loadError = $derived($tasks.error ?? $lists.error);
	const hasVisibleTasks = $derived(visibleTasks.length > 0);
	const showInitialLoading = $derived(
		configured && $tasks.loading && !$tasks.loaded && !$lists.loaded
	);
	const showEmptyState = $derived(
		configured &&
			!showInitialLoading &&
			!loadError &&
			!hasVisibleTasks &&
			currentView !== 'upcoming'
	);
	const upcomingOverdueTasks = $derived.by(() => {
		if (currentView !== 'upcoming') {
			return [];
		}

		return filterTopLevelTasks($tasks.items).filter((task) => {
			if (task.completed) {
				return false;
			}

			if (task.listId !== null && !listsById.has(task.listId)) {
				return false;
			}

			return isTaskOverdue(task);
		});
	});
	const groupedVisibleTasks = $derived(
		currentView === 'upcoming' ? groupUpcomingTasksByDate(visibleTasks) : []
	);
	const groupedVisibleCalendarDays = $derived(
		currentView === 'upcoming' && calendarConfigured && calendarVisible
			? groupedVisibleTasks.map((group) => group.key).filter((key) => key !== 'no-date')
			: []
	);
	const headerMeta = $derived.by(() => {
		if (currentView !== 'upcoming') {
			if (currentView !== 'backlog') {
				return meta;
			}

			return taskCollectionMode === 'backlog'
				? `Tasks without a due date, or due outside the next ${UPCOMING_DAY_WINDOW} days.`
				: 'Every incomplete task across your visible projects.';
		}

		return `Here you can see the next ${UPCOMING_DAY_WINDOW} days, including today.`;
	});
	const showDueDateBadge = $derived(currentView !== 'today' && currentView !== 'upcoming');
	const overdueTasks = $derived.by(() => {
		if (currentView !== 'today') {
			return [];
		}

		const today = new Date();
		const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

		return visibleTasks.filter((task) => {
			if (task.completed || !task.dueDate) {
				return false;
			}

			const taskDate = new Date(task.dueDate);

			if (Number.isNaN(taskDate.getTime())) {
				return false;
			}

			const normalizedTaskDate = new Date(
				taskDate.getFullYear(),
				taskDate.getMonth(),
				taskDate.getDate()
			);

			return normalizedTaskDate.getTime() < todayDate.getTime();
		});
	});
	const todayTasks = $derived.by(() => {
		if (currentView !== 'today') {
			return visibleTasks;
		}

		const overdueTaskIds = new Set(overdueTasks.map((task) => task.id));
		return visibleTasks.filter((task) => !overdueTaskIds.has(task.id));
	});
	const emptyStateTitle = $derived.by(() => {
		switch (currentView) {
			case 'today':
				return 'Nothing due today';
			case 'inbox':
				return 'Inbox is clear';
			case 'upcoming':
				return 'Nothing upcoming';
			case 'active':
				return 'No active tasks';
			case 'backlog':
				return taskCollectionMode === 'backlog' ? 'No backlog tasks' : 'No active tasks';
			case 'completed':
				return 'No completed tasks';
		}
	});
	const usesInfiniteTaskPaging = $derived(
		currentView === 'active' || currentView === 'backlog' || currentView === 'completed'
	);

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			selectedTaskId = null;
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`;

		if (nextKey !== lastLoadKey) {
			lastLoadKey = nextKey;
			void Promise.all([lists.load(), tasks.load({ view: taskLoadView })]);
		}
	});

	$effect(() => {
		if (!browser || !$connection.settings) {
			return;
		}

		void tasks.load({ view: taskLoadView });
	});

	$effect(() => {
		if (!browser || !usesInfiniteTaskPaging || !loadMoreTrigger) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) {
					return;
				}

				void tasks.loadNextPage();
			},
			{
				rootMargin: '200px 0px'
			}
		);

		observer.observe(loadMoreTrigger);

		return () => {
			observer.disconnect();
		};
	});

	$effect(() => {
		if (selectedTaskId !== null && !selectedTask) {
			selectedTaskId = null;
		}
	});

	$effect(() => {
		if (
			!calendarConfigured ||
			!calendarVisible ||
			currentView !== 'upcoming' ||
			groupedVisibleCalendarDays.length === 0
		) {
			return;
		}

		void calendarEvents.loadMany(groupedVisibleCalendarDays);
	});

	async function handleRefresh() {
		await Promise.all([lists.refresh(), tasks.refresh(taskLoadView)]);
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
		if (completed && currentView !== 'completed') {
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

	async function handleUpcomingDrop(task: AppTask, dateKey: string) {
		if (task.listId === null || bulkRescheduling) {
			return;
		}

		const nextDueDate = fromDateInputValue(dateKey);

		if (!nextDueDate || task.dueDate?.slice(0, 10) === dateKey) {
			return;
		}

		await handleDueDateChange(task, nextDueDate);
	}

	async function handleListChange(task: AppTask, listId: number) {
		await tasks.updateTask(buildUpdateInput(task, { listId }));
	}

	async function handleDelete(task: AppTask) {
		const deleted = await tasks.deleteTask(task.id);

		if (deleted) {
			selectedTaskId = null;
		}
	}

	async function handleRescheduleOverdue(dueDate: string | null) {
		if (!dueDate || overdueTasks.length === 0 || bulkRescheduling) {
			return;
		}

		const tasksToReschedule = [...overdueTasks];

		await handleBulkReschedule(tasksToReschedule, dueDate);
	}

	async function handleRescheduleUpcomingOverdue(dueDate: string | null) {
		if (!dueDate || upcomingOverdueTasks.length === 0 || bulkRescheduling) {
			return;
		}

		const tasksToReschedule = [...upcomingOverdueTasks];

		await handleBulkReschedule(tasksToReschedule, dueDate);
	}

	async function handleBulkReschedule(tasksToReschedule: AppTask[], dueDate: string) {
		if (tasksToReschedule.length === 0) {
			return;
		}

		if (
			tasksToReschedule.some((task) => task.listId === null) &&
			rescheduleFallbackListId === null
		) {
			return;
		}

		bulkRescheduling = true;

		try {
			await Promise.all(
				tasksToReschedule.map((task) => {
					const listId = task.listId ?? rescheduleFallbackListId;

					if (listId === null) {
						return Promise.resolve(null);
					}

					return tasks.updateTask(
						buildUpdateInput(task, {
							dueDate,
							listId
						})
					);
				})
			);
		} finally {
			bulkRescheduling = false;
		}
	}

	function isTaskOverdue(task: AppTask) {
		const dueDate = task.dueDate?.trim();

		if (!dueDate || dueDate.startsWith('0001-01-01')) {
			return false;
		}

		const taskDate = new Date(dueDate);

		if (Number.isNaN(taskDate.getTime())) {
			return false;
		}

		const today = new Date();
		const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const normalizedTaskDate = new Date(
			taskDate.getFullYear(),
			taskDate.getMonth(),
			taskDate.getDate()
		);

		return normalizedTaskDate.getTime() < todayDate.getTime();
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
				{title}
			</h1>
			{#if headerMeta}
				<p class="text-sm text-muted-foreground">{headerMeta}</p>
			{/if}
			{#if showBacklogSwitch}
				<div class="pt-2">
					<div
						class="inline-flex rounded-2xl border border-border/70 bg-white/65 p-1 shadow-sm dark:bg-white/8 dark:shadow-none"
					>
						<Button
							variant={taskCollectionMode === 'backlog' ? 'secondary' : 'ghost'}
							size="sm"
							class="rounded-xl"
							onclick={() => {
								taskCollectionMode = 'backlog';
							}}
						>
							Backlog
						</Button>
						<Button
							variant={taskCollectionMode === 'active' ? 'secondary' : 'ghost'}
							size="sm"
							class="rounded-xl"
							onclick={() => {
								taskCollectionMode = 'active';
							}}
						>
							All Active
						</Button>
					</div>
				</div>
			{/if}
		</div>

		{#if configured}
			<Button
				variant="outline"
				size="sm"
				class="hidden self-end sm:inline-flex"
				aria-label={$tasks.loading || $lists.loading ? 'Refreshing tasks' : 'Refresh tasks'}
				onclick={handleRefresh}
				disabled={$tasks.loading || $lists.loading}
			>
				<RefreshCcw class="size-3.5" />
				{$tasks.loading || $lists.loading ? 'Refreshing…' : 'Refresh'}
			</Button>
		{/if}
	</div>

	{#if !configured}
		<div
			class="rounded-[1.6rem] border border-border/70 bg-white/70 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
		>
			<div class="flex items-start gap-3">
				<span class="rounded-xl bg-muted p-2 text-muted-foreground">
					<Settings2 class="size-4" />
				</span>

				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium text-foreground">Troth is not connected to Vikunja yet.</p>
					<p class="text-sm text-muted-foreground">
						Connect Troth to Vikunja in Settings before loading tasks.
					</p>
					<Button href={resolve('/settings')} size="sm">Open Settings</Button>
				</div>
			</div>
		</div>
	{:else}
		{#if currentView === 'today'}
			<CalendarDayPreview />
		{/if}

		{#if currentView === 'today' && overdueTasks.length > 0}
			<section
				class="rounded-[1.85rem] border px-4 py-4 shadow-none"
				style="border-color: color-mix(in oklch, #e64553 72%, white); background: transparent;"
			>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="space-y-2">
						<div
							class="inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase shadow-none"
							style="border: 1px solid color-mix(in oklch, #e64553 42%, white); background-color: color-mix(in oklch, #e64553 10%, transparent); color: #e64553;"
						>
							Overdue
						</div>
						<p class="text-sm font-medium" style="color: #e64553;">
							{overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} still show
							in Today
						</p>
						<p class="text-sm leading-6" style="color: color-mix(in oklch, #e64553 82%, black 6%);">
							Give them a fresh day with one quick move.
						</p>
					</div>

					<div class="w-full sm:w-52">
						<DueDatePicker
							value={null}
							disabled={bulkRescheduling}
							tintedField
							emptyLabel={bulkRescheduling ? 'Rescheduling…' : 'Reschedule to…'}
							ariaLabel="Reschedule overdue tasks"
							onChange={handleRescheduleOverdue}
						/>
					</div>
				</div>

				<div class="mt-4 space-y-2">
					<TaskList
						tasks={overdueTasks}
						lists={activeLists}
						{listsById}
						{showDueDateBadge}
						{subtaskSummaryByParentId}
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						class="space-y-2"
						rowClass="border border-[#e64553]/35 bg-transparent shadow-none hover:border-[#e64553]/50 hover:bg-transparent"
						onOpen={(task) => {
							selectedTaskId = task.id;
							tasks.clearMutationError();
						}}
						onToggleComplete={handleToggleComplete}
						onDueDateChange={handleDueDateChange}
						onListChange={handleListChange}
					/>
				</div>
			</section>
		{/if}

		{#if currentView === 'upcoming' && upcomingOverdueTasks.length > 0}
			<section
				class="rounded-[1.85rem] border px-4 py-4 shadow-none"
				style="border-color: color-mix(in oklch, #e64553 72%, white); background: transparent;"
			>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="space-y-2">
						<div
							class="inline-flex items-center rounded-full px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase shadow-none"
							style="border: 1px solid color-mix(in oklch, #e64553 42%, white); background-color: color-mix(in oklch, #e64553 10%, transparent); color: #e64553;"
						>
							Due Today
						</div>
						<p class="text-sm font-medium" style="color: #e64553;">
							{upcomingOverdueTasks.length} overdue task{upcomingOverdueTasks.length === 1
								? ''
								: 's'} need a new day
						</p>
						<p class="text-sm leading-6" style="color: color-mix(in oklch, #e64553 82%, black 6%);">
							Push them forward with one quick reschedule.
						</p>
					</div>

					<div class="w-full sm:w-52">
						<DueDatePicker
							value={null}
							disabled={bulkRescheduling}
							tintedField
							emptyLabel={bulkRescheduling ? 'Rescheduling…' : 'Reschedule to…'}
							ariaLabel="Reschedule overdue tasks in upcoming"
							onChange={handleRescheduleUpcomingOverdue}
						/>
					</div>
				</div>

				<div class="mt-4 space-y-2">
					<TaskList
						tasks={upcomingOverdueTasks}
						lists={activeLists}
						{listsById}
						{showDueDateBadge}
						{subtaskSummaryByParentId}
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						class="space-y-2"
						rowClass="border border-[#e64553]/35 bg-transparent shadow-none hover:border-[#e64553]/50 hover:bg-transparent"
						onOpen={(task) => {
							selectedTaskId = task.id;
							tasks.clearMutationError();
						}}
						onToggleComplete={handleToggleComplete}
						onDueDateChange={handleDueDateChange}
						onListChange={handleListChange}
					/>
				</div>
			</section>
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
			{#if currentView === 'inbox'}
				<div
					class="rounded-[1.9rem] border border-border/60 bg-white/62 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none"
				>
					<div class="mx-auto flex max-w-md flex-col items-center text-center">
						<div
							class="mb-4 rounded-[1.4rem] border border-border/60 bg-background/90 p-3 text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] dark:border-white/10 dark:bg-white/6 dark:text-stone-300 dark:shadow-none"
						>
							<Inbox class="size-5" />
						</div>
						<p class="text-base font-medium text-foreground">Inbox is clear</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">
							Nothing is waiting here right now. Add a thought, task, or reminder when something new
							comes up.
						</p>
					</div>
				</div>
			{:else if currentView === 'today'}
				<div
					class="rounded-[1.9rem] border border-border/60 bg-white/62 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none"
				>
					<div class="mx-auto flex max-w-md flex-col items-center text-center">
						<div
							class="mb-4 rounded-[1.4rem] border border-amber-200/70 bg-amber-50/75 p-3 text-amber-700 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] dark:border-amber-900/55 dark:bg-amber-950/35 dark:text-amber-200 dark:shadow-none"
						>
							<Sun class="size-5" />
						</div>
						<p class="text-base font-medium text-foreground">Nothing due today</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">
							Today is in a good place. Take the quiet win and enjoy a little breathing room.
						</p>
					</div>
				</div>
			{:else}
				<div
					class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none"
				>
					<div class="space-y-2 text-center sm:text-left">
						<p class="text-sm font-medium text-foreground">{emptyStateTitle}</p>
						<p class="text-sm text-muted-foreground">{emptyMessage}</p>
					</div>
				</div>
			{/if}
		{:else if hasVisibleTasks || currentView === 'upcoming'}
			{#if currentView === 'upcoming'}
				<TaskGroupedList
					groups={groupedVisibleTasks}
					lists={activeLists}
					{listsById}
					calendarEventsByDay={$calendarEvents.days}
					showCalendarEvents={calendarConfigured && calendarVisible}
					{showDueDateBadge}
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
					onRescheduleTask={handleUpcomingDrop}
				/>
			{:else if currentView === 'today'}
				{#if todayTasks.length > 0}
					<TaskList
						tasks={todayTasks}
						lists={activeLists}
						{listsById}
						{showDueDateBadge}
						{subtaskSummaryByParentId}
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						onOpen={(task) => {
							selectedTaskId = task.id;
							tasks.clearMutationError();
						}}
						onToggleComplete={handleToggleComplete}
						onDueDateChange={handleDueDateChange}
						onListChange={handleListChange}
					/>
				{/if}
			{:else}
				<div class="space-y-3">
					<TaskList
						tasks={visibleTasks}
						lists={activeLists}
						{listsById}
						{showDueDateBadge}
						{subtaskSummaryByParentId}
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						onOpen={(task) => {
							selectedTaskId = task.id;
							tasks.clearMutationError();
						}}
						onToggleComplete={handleToggleComplete}
						onDueDateChange={handleDueDateChange}
						onListChange={handleListChange}
					/>

					{#if usesInfiniteTaskPaging && ($tasks.hasMore || $tasks.loadingMore)}
						<div bind:this={loadMoreTrigger} class="h-6" aria-hidden="true"></div>
						{#if $tasks.loadingMore}
							<p class="px-2 text-xs text-muted-foreground">Loading more tasks…</p>
						{/if}
					{/if}
				</div>
			{/if}
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
