<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Inbox, RefreshCcw, Settings2, Sun } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AppTask, UpdateTaskInput } from '$lib/api/vikunja';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { tasks } from '$lib/stores/tasks';
	import DueDatePicker from './DueDatePicker.svelte';
	import {
		filterTasksForView,
		findInboxList,
		fromDateInputValue,
		groupTasksByDate,
		sortTodayTasks,
		sortTasks,
		type TaskViewKey
	} from '$lib/tasks/view';
	import TaskComposer from './TaskComposer.svelte';
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
	const exitTimers: Record<number, ReturnType<typeof setTimeout> | undefined> = {};

	const configured = $derived(Boolean($connection.settings));
	const activeLists = $derived($lists.items.filter((list) => !list.isArchived));
	const inboxList = $derived(findInboxList(activeLists));
	const visibleTasks = $derived.by(() => {
		const filteredTasks = filterTasksForView(view, $tasks.items, activeLists);
		const exitingTasks = $tasks.items.filter(
			(task) =>
				exitingTaskIds.includes(task.id) && !filteredTasks.some((item) => item.id === task.id)
		);

		const nextTasks = [...filteredTasks, ...exitingTasks];
		return view === 'today' ? sortTodayTasks(nextTasks) : sortTasks(nextTasks);
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
	const emptyMessage = $derived(
		view === 'inbox' && !inboxList ? 'No project named Inbox was found in Vikunja yet.' : emptyState
	);
	const quickAddDisabledMessage = $derived(
		view === 'inbox' && !inboxList
			? 'Create a project named Inbox in Vikunja to use this view.'
			: 'Add a project in Vikunja before creating tasks.'
	);
	const loadError = $derived($tasks.error ?? $lists.error);
	const hasVisibleTasks = $derived(visibleTasks.length > 0);
	const showInitialLoading = $derived(
		configured && $tasks.loading && !$tasks.loaded && !$lists.loaded
	);
	const showEmptyState = $derived(
		configured && !showInitialLoading && !loadError && !hasVisibleTasks
	);
	const upcomingOverdueTasks = $derived.by(() => {
		if (view !== 'upcoming') {
			return [];
		}

		return $tasks.items.filter((task) => {
			if (task.completed) {
				return false;
			}

			if (task.listId !== null && !listsById.has(task.listId)) {
				return false;
			}

			return isTaskOverdue(task);
		});
	});
	const groupedVisibleTasks = $derived(view === 'upcoming' ? groupTasksByDate(visibleTasks) : []);
	const showDueDateBadge = $derived(view !== 'today' && view !== 'upcoming');
	const overdueTasks = $derived.by(() => {
		if (view !== 'today') {
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
		if (view !== 'today') {
			return visibleTasks;
		}

		const overdueTaskIds = new Set(overdueTasks.map((task) => task.id));
		return visibleTasks.filter((task) => !overdueTaskIds.has(task.id));
	});
	const emptyStateTitle = $derived.by(() => {
		switch (view) {
			case 'today':
				return 'Nothing due today';
			case 'inbox':
				return 'Inbox is clear';
			case 'upcoming':
				return 'Nothing upcoming';
			case 'active':
				return 'No active tasks';
			case 'completed':
				return 'No completed tasks';
		}
	});

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			selectedTaskId = null;
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.token}`;

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

	async function handleRefresh() {
		await Promise.all([lists.refresh(), tasks.refresh()]);
	}

	async function handleQuickAdd(input: {
		title: string;
		listId: number;
		dueDate?: string | null;
		priority?: number;
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
		if (completed && view !== 'completed') {
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

		await tasks.updateTask({
			id: task.id,
			title: task.title,
			description: task.description,
			dueDate,
			priority: task.priority,
			listId: task.listId,
			completed: task.completed
		});
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
		await tasks.updateTask({
			id: task.id,
			title: task.title,
			description: task.description,
			dueDate: task.dueDate,
			priority: task.priority,
			listId,
			completed: task.completed
		});
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

		const tasksToReschedule = [...overdueTasks].filter((task) => task.listId !== null);

		await handleBulkReschedule(tasksToReschedule, dueDate);
	}

	async function handleRescheduleUpcomingOverdue(dueDate: string | null) {
		if (!dueDate || upcomingOverdueTasks.length === 0 || bulkRescheduling) {
			return;
		}

		const tasksToReschedule = [...upcomingOverdueTasks].filter((task) => task.listId !== null);

		await handleBulkReschedule(tasksToReschedule, dueDate);
	}

	async function handleBulkReschedule(tasksToReschedule: AppTask[], dueDate: string) {

		if (tasksToReschedule.length === 0) {
			return;
		}

		bulkRescheduling = true;

		try {
			await Promise.all(
				tasksToReschedule.map((task) => {
					return tasks.updateTask({
						id: task.id,
						title: task.title,
						description: task.description,
						dueDate,
						priority: task.priority,
						listId: task.listId as number,
						completed: task.completed
					});
				})
			);
		} finally {
			bulkRescheduling = false;
		}
	}

	function isTaskDueToday(task: AppTask) {
		if (task.completed || !task.dueDate) {
			return false;
		}

		const taskDate = new Date(task.dueDate);

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

		return normalizedTaskDate.getTime() === todayDate.getTime();
	}

	function isTaskOverdue(task: AppTask) {
		if (!task.dueDate) {
			return false;
		}

		const taskDate = new Date(task.dueDate);

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
</script>

<section class="mx-auto flex w-full max-w-[44rem] flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-[2rem] font-semibold tracking-tight text-foreground">{title}</h1>
			{#if meta}
				<p class="text-sm text-muted-foreground">{meta}</p>
			{/if}
		</div>

		{#if configured}
			<Button
				variant="outline"
				size="sm"
				class="self-start"
				onclick={handleRefresh}
				disabled={$tasks.loading || $lists.loading}
			>
				<RefreshCcw class="size-3.5" />
				{$tasks.loading || $lists.loading ? 'Refreshing…' : 'Refresh'}
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
						Add your base URL and API token in Settings before loading tasks.
					</p>
					<Button href={resolve('/settings')} size="sm">Open Settings</Button>
				</div>
			</div>
		</div>
	{:else}
		<TaskComposer
			lists={activeLists}
			busy={$tasks.creating}
			error={$tasks.mutationError}
			fixedListId={view === 'inbox' ? (inboxList?.id ?? null) : null}
			placeholder={view === 'inbox' ? 'Add to Inbox' : 'Add a task'}
			disabledMessage={quickAddDisabledMessage}
			onSubmit={handleQuickAdd}
		/>

		{#if view === 'today' && overdueTasks.length > 0}
			<section class="rounded-[1.85rem] border border-rose-200/80 bg-rose-50/80 px-4 py-4 shadow-[0_10px_28px_rgba(190,92,100,0.08)]">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="space-y-2">
						<div class="inline-flex items-center rounded-full bg-rose-100/90 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] text-rose-900 uppercase shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
							Overdue
						</div>
						<p class="text-sm font-medium text-rose-950">
							{overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} still
							show in Today
						</p>
						<p class="text-sm leading-6 text-rose-900/72">
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
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						class="space-y-2"
						rowClass="border border-rose-200/75 bg-rose-50/95 shadow-[0_1px_0_rgba(255,255,255,0.88)_inset] hover:border-rose-300/75 hover:bg-rose-100/85"
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

		{#if view === 'upcoming' && upcomingOverdueTasks.length > 0}
			<section class="rounded-[1.85rem] border border-rose-200/80 bg-rose-50/80 px-4 py-4 shadow-[0_10px_28px_rgba(190,92,100,0.08)]">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="space-y-2">
						<div class="inline-flex items-center rounded-full bg-rose-100/90 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] text-rose-900 uppercase shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
							Due Today
						</div>
						<p class="text-sm font-medium text-rose-950">
							{upcomingOverdueTasks.length} overdue task{upcomingOverdueTasks.length === 1 ? '' : 's'} need a new day
						</p>
						<p class="text-sm leading-6 text-rose-900/72">
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
						{exitingTaskIds}
						mutatingIds={$tasks.mutatingIds}
						class="space-y-2"
						rowClass="border border-rose-200/75 bg-rose-50/95 shadow-[0_1px_0_rgba(255,255,255,0.88)_inset] hover:border-rose-300/75 hover:bg-rose-100/85"
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
			{#if view === 'inbox'}
				<div class="rounded-[1.9rem] border border-border/60 bg-white/62 px-6 py-12 shadow-sm">
					<div class="mx-auto flex max-w-md flex-col items-center text-center">
						<div class="mb-4 rounded-[1.4rem] border border-border/60 bg-background/90 p-3 text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]">
							<Inbox class="size-5" />
						</div>
						<p class="text-base font-medium text-foreground">Inbox is clear</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">
							Nothing is waiting here right now. Add a thought, task, or reminder when
							something new comes up.
						</p>
					</div>
				</div>
			{:else if view === 'today'}
				<div class="rounded-[1.9rem] border border-border/60 bg-white/62 px-6 py-12 shadow-sm">
					<div class="mx-auto flex max-w-md flex-col items-center text-center">
						<div class="mb-4 rounded-[1.4rem] border border-amber-200/70 bg-amber-50/75 p-3 text-amber-700 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]">
							<Sun class="size-5" />
						</div>
						<p class="text-base font-medium text-foreground">Nothing due today</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">
							Today is in a good place. Take the quiet win and enjoy a little breathing room.
						</p>
					</div>
				</div>
			{:else}
				<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm">
					<div class="space-y-2 text-center sm:text-left">
						<p class="text-sm font-medium text-foreground">{emptyStateTitle}</p>
						<p class="text-sm text-muted-foreground">{emptyMessage}</p>
					</div>
				</div>
			{/if}
		{:else if hasVisibleTasks}
			{#if view === 'upcoming'}
				<TaskGroupedList
					groups={groupedVisibleTasks}
					lists={activeLists}
					{listsById}
					{showDueDateBadge}
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
			{:else if view === 'today'}
				{#if todayTasks.length > 0}
					<TaskList
						tasks={todayTasks}
						lists={activeLists}
						{listsById}
						{showDueDateBadge}
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
				<TaskList
					tasks={visibleTasks}
					lists={activeLists}
					{listsById}
					{showDueDateBadge}
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
		{/if}
	{/if}
</section>

<TaskEditor
	task={selectedTask}
	lists={activeLists}
	open={selectedTask !== null}
	saving={isSavingSelectedTask}
	error={$tasks.mutationError}
	onClose={() => {
		selectedTaskId = null;
		tasks.clearMutationError();
	}}
	onSave={handleSave}
	onDelete={handleDelete}
/>
