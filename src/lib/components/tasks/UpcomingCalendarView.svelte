<script lang="ts">
	import type { AppCalendarEvent } from '$lib/api/calendar';
	import type { AppTask } from '$lib/api/vikunja';
	import type { CalendarDayEventsState } from '$lib/stores/calendar-events';
	import { formatTaskTime, hasExplicitDueTime } from '$lib/tasks/view';
	import { cn } from '$lib/utils';

	type TaskGroup = {
		key: string;
		title: string;
		tasks: AppTask[];
	};

	let {
		groups,
		calendarEventsByDay = {} as Record<string, CalendarDayEventsState>,
		showCalendarEvents = false,
		mutatingIds = [],
		onOpen
	}: {
		groups: TaskGroup[];
		calendarEventsByDay?: Record<string, CalendarDayEventsState>;
		showCalendarEvents?: boolean;
		mutatingIds?: number[];
		onOpen?: (task: AppTask) => void;
	} = $props();

	const hourLabelFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric'
	});

	const eventTimeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});

	const hours = Array.from({ length: 24 }, (_, hour) => hour);
	const todayKey = $derived(toDayKey(new Date()));

	function toDayKey(date: Date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getCalendarState(day: string) {
		return calendarEventsByDay[day] ?? null;
	}

	function getCalendarItems(day: string) {
		return showCalendarEvents ? (getCalendarState(day)?.items ?? []) : [];
	}

	function getAllDayTasks(tasks: AppTask[]) {
		return tasks.filter((task) => !hasExplicitDueTime(task.dueDate));
	}

	function getTimedTasks(tasks: AppTask[], hour: number) {
		return tasks
			.filter((task) => hasExplicitDueTime(task.dueDate))
			.filter((task) => {
				const date = task.dueDate ? new Date(task.dueDate) : null;
				return date ? date.getHours() === hour : false;
			})
			.sort((left, right) => (left.dueDate ?? '').localeCompare(right.dueDate ?? ''));
	}

	function getAllDayEvents(items: AppCalendarEvent[]) {
		return items.filter((event) => event.allDay);
	}

	function getTimedEvents(items: AppCalendarEvent[], hour: number) {
		return items
			.filter((event) => !event.allDay)
			.filter((event) => new Date(event.start).getHours() === hour)
			.sort((left, right) => left.start.localeCompare(right.start));
	}

	function formatHourLabel(hour: number) {
		return hourLabelFormatter.format(new Date(2026, 0, 1, hour, 0, 0, 0));
	}

	function formatEventTime(event: AppCalendarEvent) {
		return `${eventTimeFormatter.format(new Date(event.start))}-${eventTimeFormatter.format(new Date(event.end))}`;
	}

	function isBusy(taskId: number) {
		return mutatingIds.includes(taskId);
	}
</script>

<div class="overflow-x-auto pb-2">
	<div
		class="grid min-w-[72rem] gap-0 border-t border-l border-border/60 bg-background"
		style={`grid-template-columns: 4.75rem repeat(${groups.length}, minmax(9.5rem, 1fr));`}
	>
		<div
			class="sticky top-0 left-0 z-20 border-r border-b border-border/60 bg-background px-2 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
		>
			Time
		</div>

		{#each groups as group (group.key)}
			<div
				class={cn(
					'sticky top-0 z-10 border-r border-b border-border/60 bg-background px-3 py-3',
					group.key === todayKey && 'bg-amber-50/40 dark:bg-amber-950/16'
				)}
			>
				<p class="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
					{group.title}
				</p>
			</div>
		{/each}

		<div
			class="sticky left-0 z-10 flex h-20 items-start border-r border-b border-border/60 bg-background px-2 pt-3 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
		>
			All day
		</div>

		{#each groups as group (group.key)}
			{@const calendarState = getCalendarState(group.key)}
			{@const calendarItems = getCalendarItems(group.key)}
			{@const allDayTasks = getAllDayTasks(group.tasks)}
			{@const allDayEvents = getAllDayEvents(calendarItems)}

			<div class="h-20 overflow-hidden border-r border-b border-border/60 bg-background p-2">
				{#if calendarState?.error}
					<p class="px-1 py-1 text-xs text-destructive">{calendarState.error}</p>
				{:else if showCalendarEvents && calendarState?.loading && !calendarState.loaded}
					<p class="px-1 py-1 text-xs text-muted-foreground">Loading events...</p>
				{:else if allDayTasks.length === 0 && allDayEvents.length === 0}
					<p class="px-1 py-1 text-xs text-muted-foreground">No all-day items.</p>
				{:else}
					<div class="space-y-1 overflow-hidden">
						{#each allDayTasks as task (task.id)}
							<button
								type="button"
								class="flex w-full items-start border-l-2 border-stone-400 bg-stone-100 px-2 py-1 text-left transition hover:bg-stone-200 dark:bg-white/8 dark:hover:bg-white/12"
								disabled={isBusy(task.id)}
								onclick={() => onOpen?.(task)}
							>
								<span class="min-w-0 truncate text-[0.76rem] font-medium text-foreground"
									>{task.title}</span
								>
							</button>
						{/each}

						{#each allDayEvents as event (event.id)}
							<div class="border-l-2 border-sky-500 bg-sky-50 px-2 py-1 dark:bg-sky-950/22">
								<p class="truncate text-[0.76rem] font-medium text-sky-950 dark:text-sky-100">
									{event.title}
								</p>
								<p class="truncate text-[0.68rem] text-sky-800/75 dark:text-sky-200/80">
									{event.sourceLabel}
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		{#each hours as hour (hour)}
			<div
				class="sticky left-0 z-10 flex h-24 items-start border-r border-b border-border/60 bg-background px-2 pt-3 text-xs font-medium text-muted-foreground"
			>
				{formatHourLabel(hour)}
			</div>

			{#each groups as group (group.key)}
				{@const calendarItems = getCalendarItems(group.key)}
				{@const timedTasks = getTimedTasks(group.tasks, hour)}
				{@const timedEvents = getTimedEvents(calendarItems, hour)}

				<div class="h-24 overflow-hidden border-r border-b border-border/60 bg-background p-1.5">
					{#if timedTasks.length === 0 && timedEvents.length === 0}
						<div class="h-full"></div>
					{:else}
						<div class="space-y-1 overflow-hidden">
							{#each timedTasks as task (task.id)}
								<button
									type="button"
									class="flex w-full flex-col items-start border-l-2 border-stone-500 bg-stone-100 px-2 py-1 text-left transition hover:bg-stone-200 dark:bg-white/8 dark:hover:bg-white/12"
									disabled={isBusy(task.id)}
									onclick={() => onOpen?.(task)}
								>
									<p
										class="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
									>
										{formatTaskTime(task.dueDate)}
									</p>
									<p class="mt-0.5 line-clamp-2 text-[0.76rem] font-medium text-foreground">
										{task.title}
									</p>
								</button>
							{/each}

							{#each timedEvents as event (event.id)}
								<div class="border-l-2 border-sky-500 bg-sky-50 px-2 py-1 dark:bg-sky-950/22">
									<p
										class="text-[0.65rem] font-semibold tracking-[0.12em] text-sky-800/78 uppercase dark:text-sky-200/82"
									>
										{formatEventTime(event)}
									</p>
									<p
										class="mt-0.5 line-clamp-2 text-[0.76rem] font-medium text-sky-950 dark:text-sky-100"
									>
										{event.title}
									</p>
									<p class="text-[0.68rem] text-sky-800/75 dark:text-sky-200/80">
										{event.sourceLabel}
									</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>
