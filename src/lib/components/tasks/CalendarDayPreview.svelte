<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight, RefreshCcw } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { calendarEvents } from '$lib/stores/calendar-events';
	import { calendarFeed } from '$lib/stores/calendar-feed';
	import { calendarPreviewPreferences } from '$lib/stores/calendar-preview-preferences';

	const timeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	});

	const dayHeadingFormatter = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	});

	let selectedDay = $state(getTodayKey());

	const configured = $derived(
		Boolean($calendarFeed.settings) || $calendarPreviewPreferences.mockCalendarEnabled
	);
	const sourceLabel = $derived(
		$calendarFeed.settings?.label ??
			$calendarFeed.settings?.urlHost ??
			($calendarPreviewPreferences.mockCalendarEnabled ? 'Demo calendar' : 'Calendar')
	);
	const heading = $derived(dayHeadingFormatter.format(parseDayKey(selectedDay)));

	$effect(() => {
		if (!configured) {
			return;
		}

		void calendarEvents.load(selectedDay);
	});

	function shiftDay(days: number) {
		const nextDate = parseDayKey(selectedDay);
		nextDate.setDate(nextDate.getDate() + days);
		selectedDay = toDayKey(nextDate);
	}

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

	function parseDayKey(dayKey: string) {
		const [year, month, day] = dayKey.split('-').map((part) => Number.parseInt(part, 10));
		return new Date(year, (month || 1) - 1, day || 1);
	}
</script>

{#if configured}
	<section
		class="rounded-[1.7rem] border border-border/70 bg-white/70 px-4 py-4 shadow-sm dark:bg-white/7 dark:shadow-none"
	>
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="space-y-1">
				<div
					class="inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
				>
					<CalendarDays class="size-3.5" />
					Calendar preview
				</div>
				<p class="text-sm font-medium text-foreground">{heading}</p>
				<p class="text-sm text-muted-foreground">Read-only events from {sourceLabel}.</p>
			</div>

			<div class="flex items-center gap-2 self-start">
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Previous day"
					onclick={() => shiftDay(-1)}
				>
					<ChevronLeft class="size-4" />
				</Button>
				<Button variant="outline" size="icon-sm" aria-label="Next day" onclick={() => shiftDay(1)}>
					<ChevronRight class="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					class="gap-2"
					disabled={$calendarEvents.loading}
					onclick={() => {
						void calendarEvents.refresh();
					}}
				>
					<RefreshCcw class="size-3.5" />
					{$calendarEvents.loading ? 'Refreshing…' : 'Refresh'}
				</Button>
			</div>
		</div>

		{#if $calendarEvents.error}
			<div
				class="mt-4 rounded-2xl border border-destructive/20 bg-destructive/6 px-3 py-3 text-sm text-destructive"
			>
				{$calendarEvents.error}
			</div>
		{:else if $calendarEvents.loading && (!$calendarEvents.loaded || $calendarEvents.day !== selectedDay)}
			<div
				class="mt-4 rounded-2xl border border-border/60 bg-background/70 px-3 py-4 text-sm text-muted-foreground"
			>
				Loading calendar events…
			</div>
		{:else if $calendarEvents.items.length === 0}
			<div
				class="mt-4 rounded-2xl border border-border/60 bg-background/70 px-3 py-4 text-sm text-muted-foreground"
			>
				No events for this day.
			</div>
		{:else}
			<div class="mt-4 space-y-2">
				{#each $calendarEvents.items as event (event.id)}
					<div class="rounded-2xl border border-border/60 bg-background/78 px-3 py-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<p class="truncate text-sm font-medium text-foreground">{event.title}</p>
								<p class="text-sm text-muted-foreground">
									{formatEventTime(event.start, event.end, event.allDay)}
								</p>
							</div>
							<p class="shrink-0 text-xs text-muted-foreground">{event.sourceLabel}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}
