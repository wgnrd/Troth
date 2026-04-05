<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { calendarEvents } from '$lib/stores/calendar-events';
	import { calendarFeed } from '$lib/stores/calendar-feed';
	import { calendarPreviewPreferences } from '$lib/stores/calendar-preview-preferences';
	import type { CalendarDayEventsState } from '$lib/stores/calendar-events';

	const timeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});

	let selectedDay = $state(getTodayKey());

	const emptyDayState: CalendarDayEventsState = {
		items: [],
		loading: false,
		loaded: false,
		error: null,
		timezoneOffsetMinutes: 0
	};

	const configured = $derived(Boolean($calendarFeed.settings));
	const visible = $derived($calendarPreviewPreferences.calendarVisible);
	const dayState = $derived($calendarEvents.days[selectedDay] ?? emptyDayState);

	$effect(() => {
		if (!configured || !visible) {
			return;
		}

		void calendarEvents.load(selectedDay);
	});

	function formatEventTime(start: string, end: string, allDay: boolean) {
		if (allDay) {
			return 'All day';
		}

		return `${timeFormatter.format(new Date(start))} - ${timeFormatter.format(new Date(end))}`;
	}

	function getTodayKey() {
		return toDayKey(new Date());
	}

	function toDayKey(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
</script>

{#if configured}
	<section class="px-2">
		{#if visible}
			{#if dayState.error}
				<div class="flex items-start justify-between gap-2">
					<p class="text-sm text-destructive">{dayState.error}</p>
					<Button
						variant="ghost"
						size="sm"
						class="h-auto self-start px-2 text-xs"
						onclick={() => {
							calendarPreviewPreferences.setCalendarVisible(false);
						}}
					>
						Hide
					</Button>
				</div>
			{:else if dayState.loading && !dayState.loaded}
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs text-muted-foreground">Loading calendar events…</p>
					<Button
						variant="ghost"
						size="sm"
						class="h-auto self-start px-2 text-xs"
						onclick={() => {
							calendarPreviewPreferences.setCalendarVisible(false);
						}}
					>
						Hide
					</Button>
				</div>
			{:else if dayState.items.length === 0}
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs text-muted-foreground">No events for this day.</p>
					<Button
						variant="ghost"
						size="sm"
						class="h-auto self-start px-2 text-xs"
						onclick={() => {
							calendarPreviewPreferences.setCalendarVisible(false);
						}}
					>
						Hide
					</Button>
				</div>
			{:else}
				<div class="space-y-1">
					{#each dayState.items as event (event.id)}
						<div
							class="flex items-baseline justify-between gap-2 text-[0.72rem] leading-5 text-muted-foreground"
						>
							<div class="flex min-w-0 items-baseline gap-2">
								<p class="w-[7.25rem] shrink-0 tabular-nums">
									{formatEventTime(event.start, event.end, event.allDay)}
								</p>
								<p class="min-w-0 truncate text-left text-foreground/82">{event.title}</p>
							</div>
							<div class="shrink-0">
								{#if event === dayState.items[0]}
									<Button
										variant="ghost"
										size="sm"
										class="h-auto px-2 text-[0.72rem]"
										onclick={() => {
											calendarPreviewPreferences.setCalendarVisible(false);
										}}
									>
										Hide
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="flex items-start justify-between gap-2">
				<p class="text-[0.72rem] text-muted-foreground">Calendar hidden.</p>
				<Button
					variant="ghost"
					size="sm"
					class="h-auto self-start px-2 text-[0.72rem]"
					onclick={() => {
						calendarPreviewPreferences.setCalendarVisible(true);
					}}
				>
					Show
				</Button>
			</div>
		{/if}
	</section>
{/if}
