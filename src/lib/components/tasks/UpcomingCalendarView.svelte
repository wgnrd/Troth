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

	type TimedEntry = {
		id: string;
		startMinute: number;
		endMinute: number;
		lane: number;
		laneCount: number;
		kind: 'task' | 'event';
		title: string;
		timeLabel: string;
		sourceLabel: string | null;
		task: AppTask | null;
		busy: boolean;
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

	let headerScroller = $state<HTMLDivElement | null>(null);
	let bodyScroller = $state<HTMLDivElement | null>(null);
	let currentTimeMarker = $state<HTMLDivElement | null>(null);
	let syncingScroll = false;
	let hasAutoScrolledToCurrentTime = $state(false);

	const HOUR_ROW_HEIGHT = 96;
	const TIMED_GRID_HEIGHT = HOUR_ROW_HEIGHT * 24;
	const MIN_ENTRY_HEIGHT = 28;

	const hourLabelFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric'
	});

	const eventTimeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});

	const hours = Array.from({ length: 24 }, (_, hour) => hour);
	const todayKey = $derived(toDayKey(new Date()));
	const currentMinute = $derived.by(() => {
		const now = new Date();
		return now.getHours() * 60 + now.getMinutes();
	});

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

	function getAllDayEvents(items: AppCalendarEvent[]) {
		return items.filter((event) => event.allDay);
	}

	function getTimedEntries(group: TaskGroup) {
		const taskEntries = group.tasks
			.filter((task) => hasExplicitTaskTime(task))
			.map((task) => {
				const start = getTaskStartDate(task);
				const end = getTaskEndDate(task, start);

				if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
					return null;
				}

				const startMinute = start.getHours() * 60 + start.getMinutes();
				const endMinute = Math.max(
					startMinute + 15,
					Math.min(24 * 60, end.getHours() * 60 + end.getMinutes())
				);

				return {
					id: `task-${task.id}`,
					startMinute,
					endMinute,
					lane: 0,
					laneCount: 1,
					kind: 'task' as const,
					title: task.title,
					timeLabel: formatTaskTime(task.dueDate) ?? '',
					sourceLabel: null,
					task,
					busy: mutatingIds.includes(task.id)
				};
			})
			.filter(isDefined);

		const eventEntries = getCalendarItems(group.key)
			.filter((event) => !event.allDay)
			.map((event) => {
				const start = new Date(event.start);
				const end = new Date(event.end);

				if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
					return null;
				}

				const startMinute = start.getHours() * 60 + start.getMinutes();
				const endMinute = Math.max(startMinute + 15, end.getHours() * 60 + end.getMinutes());

				return {
					id: `event-${event.id}`,
					startMinute,
					endMinute: Math.min(24 * 60, endMinute),
					lane: 0,
					laneCount: 1,
					kind: 'event' as const,
					title: event.title,
					timeLabel: formatEventTime(event),
					sourceLabel: event.sourceLabel,
					task: null,
					busy: false
				};
			})
			.filter(isDefined);

		return layoutTimedEntries([...taskEntries, ...eventEntries]);
	}

	function isDefined<T>(value: T | null): value is T {
		return value !== null;
	}

	function layoutTimedEntries(entries: TimedEntry[]) {
		const sorted = [...entries].sort(
			(left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute
		);

		let currentClusterIndices: number[] = [];
		let currentClusterEnd = -1;
		let laneEnds: number[] = [];

		const finalizeCluster = () => {
			const laneCount = Math.max(1, laneEnds.length);

			for (const index of currentClusterIndices) {
				sorted[index].laneCount = laneCount;
			}

			currentClusterIndices = [];
			currentClusterEnd = -1;
			laneEnds = [];
		};

		for (const [index, entry] of sorted.entries()) {
			if (currentClusterIndices.length > 0 && entry.startMinute >= currentClusterEnd) {
				finalizeCluster();
			}

			let lane = laneEnds.findIndex((laneEnd) => laneEnd <= entry.startMinute);

			if (lane === -1) {
				lane = laneEnds.length;
				laneEnds = [...laneEnds, entry.endMinute];
			} else {
				laneEnds = laneEnds.map((laneEnd, laneIndex) =>
					laneIndex === lane ? entry.endMinute : laneEnd
				);
			}

			sorted[index].lane = lane;
			currentClusterIndices = [...currentClusterIndices, index];
			currentClusterEnd = Math.max(currentClusterEnd, entry.endMinute);
		}

		if (currentClusterIndices.length > 0) {
			finalizeCluster();
		}

		return sorted;
	}

	function formatHourLabel(hour: number) {
		return hourLabelFormatter.format(new Date(2026, 0, 1, hour, 0, 0, 0));
	}

	function formatEventTime(event: AppCalendarEvent) {
		return `${eventTimeFormatter.format(new Date(event.start))}-${eventTimeFormatter.format(new Date(event.end))}`;
	}

	function getEntryStyle(entry: TimedEntry) {
		const top = (entry.startMinute / 60) * HOUR_ROW_HEIGHT;
		const height = Math.max(
			MIN_ENTRY_HEIGHT,
			((entry.endMinute - entry.startMinute) / 60) * HOUR_ROW_HEIGHT
		);
		const width = `calc(${100 / entry.laneCount}% - 4px)`;
		const left = `calc(${(100 / entry.laneCount) * entry.lane}% + 2px)`;

		return `top:${top}px;height:${height}px;left:${left};width:${width};`;
	}

	function hasExplicitTaskTime(task: AppTask) {
		return hasExplicitDueTime(task.startDate ?? task.dueDate);
	}

	function getTaskStartDate(task: AppTask) {
		const value = task.startDate ?? task.dueDate;

		if (!value) {
			return null;
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	function getTaskEndDate(task: AppTask, start: Date | null) {
		if (task.endDate) {
			const end = new Date(task.endDate);

			if (!Number.isNaN(end.getTime())) {
				return end;
			}
		}

		if (task.dueDate) {
			const dueDate = new Date(task.dueDate);

			if (!Number.isNaN(dueDate.getTime()) && (!start || dueDate.getTime() >= start.getTime())) {
				return dueDate;
			}
		}

		return start;
	}

	function isPastDay(dayKey: string) {
		return dayKey < todayKey;
	}

	function isPastAllDayItem(dayKey: string) {
		return isPastDay(dayKey);
	}

	function isPastTimedEntry(dayKey: string, entry: TimedEntry) {
		if (isPastDay(dayKey)) {
			return true;
		}

		if (dayKey !== todayKey) {
			return false;
		}

		return entry.endMinute <= currentMinute;
	}

	function getCurrentTimeMarkerTop(dayKey: string) {
		if (dayKey !== todayKey) {
			return null;
		}

		return (currentMinute / 60) * HOUR_ROW_HEIGHT;
	}

	function syncScrollLeft(source: 'header' | 'body') {
		if (syncingScroll) {
			return;
		}

		const sourceNode = source === 'header' ? headerScroller : bodyScroller;
		const targetNode = source === 'header' ? bodyScroller : headerScroller;

		if (!sourceNode || !targetNode) {
			return;
		}

		syncingScroll = true;
		targetNode.scrollLeft = sourceNode.scrollLeft;
		requestAnimationFrame(() => {
			syncingScroll = false;
		});
	}

	$effect(() => {
		if (hasAutoScrolledToCurrentTime || !currentTimeMarker) {
			return;
		}

		hasAutoScrolledToCurrentTime = true;
		const marker = currentTimeMarker;

		requestAnimationFrame(() => {
			const markerTop = marker.getBoundingClientRect().top + window.scrollY;
			const targetTop = Math.max(0, markerTop - 220);

			window.scrollTo({ top: targetTop, behavior: 'smooth' });
		});
	});
</script>

<div class="sticky top-0 z-40 bg-background pb-2">
	<div bind:this={headerScroller} class="overflow-x-auto" onscroll={() => syncScrollLeft('header')}>
		<div
			class="grid min-w-[72rem] gap-0 border-t border-l border-border/60 bg-background"
			style={`grid-template-columns: 4.75rem repeat(${groups.length}, minmax(9.5rem, 1fr));`}
		>
			<div
				class="border-r border-b border-border/60 bg-background px-2 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
			>
				Time
			</div>

			{#each groups as group (group.key)}
				<div
					class={cn(
						'border-r border-b border-border/60 bg-background px-3 py-3',
						group.key === todayKey && 'bg-amber-50/40 dark:bg-amber-950/16'
					)}
				>
					<p class="text-[0.72rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
						{group.title}
					</p>
				</div>
			{/each}

			<div
				class="flex h-20 items-start border-r border-b border-border/60 bg-background px-2 pt-3 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
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
									class={cn(
										'flex w-full items-start border-l-2 border-stone-400 bg-stone-100 px-2 py-1 text-left transition hover:bg-stone-200 dark:bg-white/8 dark:hover:bg-white/12',
										isPastAllDayItem(group.key) && 'opacity-55'
									)}
									disabled={mutatingIds.includes(task.id)}
									onclick={() => onOpen?.(task)}
								>
									<span class="min-w-0 truncate text-[0.76rem] font-medium text-foreground"
										>{task.title}</span
									>
								</button>
							{/each}

							{#each allDayEvents as event (event.id)}
								<div
									class={cn(
										'border-l-2 border-sky-500 bg-sky-50 px-2 py-1 dark:bg-sky-950/22',
										isPastAllDayItem(group.key) && 'opacity-55'
									)}
								>
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
		</div>
	</div>
</div>

<div bind:this={bodyScroller} class="overflow-x-auto pb-2" onscroll={() => syncScrollLeft('body')}>
	<div
		class="grid min-w-[72rem] gap-0 border-l border-border/60 bg-background"
		style={`grid-template-columns: 4.75rem repeat(${groups.length}, minmax(9.5rem, 1fr));`}
	>
		<div class="sticky left-0 z-10 border-r border-b border-border/60 bg-background">
			<div class="relative" style={`height:${TIMED_GRID_HEIGHT}px`}>
				{#each hours as hour (hour)}
					<div
						class="absolute inset-x-0 border-b border-border/60 px-2 pt-3 text-xs font-medium text-muted-foreground"
						style={`top:${hour * HOUR_ROW_HEIGHT}px;height:${HOUR_ROW_HEIGHT}px`}
					>
						{formatHourLabel(hour)}
					</div>
				{/each}
			</div>
		</div>

		{#each groups as group (group.key)}
			{@const timedEntries = getTimedEntries(group)}
			{@const currentTimeMarkerTop = getCurrentTimeMarkerTop(group.key)}

			<div
				class={cn(
					'relative border-r border-b border-border/60 bg-background',
					group.key === todayKey && 'bg-amber-50/20 dark:bg-amber-950/10'
				)}
				style={`height:${TIMED_GRID_HEIGHT}px`}
			>
				{#each hours as hour (hour)}
					<div
						class="absolute inset-x-0 border-b border-border/60"
						style={`top:${hour * HOUR_ROW_HEIGHT}px;height:${HOUR_ROW_HEIGHT}px`}
					></div>
				{/each}

				{#if currentTimeMarkerTop !== null}
					<div
						bind:this={currentTimeMarker}
						class="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
						style={`top:${currentTimeMarkerTop}px`}
					></div>
					<div
						class="pointer-events-none absolute z-20 size-3 rounded-full bg-red-500"
						style={`top:${Math.max(0, currentTimeMarkerTop - 5)}px;left:-7px`}
					></div>
				{/if}

				{#each timedEntries as entry (entry.id)}
					{#if entry.kind === 'task' && entry.task}
						<button
							type="button"
							class={cn(
								'absolute overflow-hidden border-l-2 border-stone-500 bg-stone-100 px-2 py-1 text-left transition hover:bg-stone-200 dark:bg-white/8 dark:hover:bg-white/12',
								isPastTimedEntry(group.key, entry) && 'opacity-55'
							)}
							style={getEntryStyle(entry)}
							disabled={entry.busy}
							onclick={() => onOpen?.(entry.task!)}
						>
							<p class="line-clamp-3 text-[0.76rem] font-medium text-foreground">{entry.title}</p>
							<p class="mt-0.5 text-[0.62rem] text-muted-foreground/85">{entry.timeLabel}</p>
						</button>
					{:else}
						<div
							class={cn(
								'absolute overflow-hidden border-l-2 border-sky-500 bg-sky-50 px-2 py-1 dark:bg-sky-950/22',
								isPastTimedEntry(group.key, entry) && 'opacity-55'
							)}
							style={getEntryStyle(entry)}
						>
							<p class="line-clamp-3 text-[0.76rem] font-medium text-sky-950 dark:text-sky-100">
								{entry.title}
							</p>
							<p class="mt-0.5 text-[0.62rem] text-sky-800/70 dark:text-sky-200/72">
								{entry.timeLabel}
							</p>
							{#if entry.sourceLabel}
								<p class="text-[0.66rem] text-sky-800/75 dark:text-sky-200/80">
									{entry.sourceLabel}
								</p>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
</div>
