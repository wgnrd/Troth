<script lang="ts">
	import { getLocalTimeZone, parseDate, today, type DateValue } from '@internationalized/date';
	import { CalendarDays, Sun, Sunrise, X } from '@lucide/svelte';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import {
		getDueDateBadgeTone,
		getDueDateFieldTone,
		formatTaskDate,
		fromDateInputValue,
		getDueDateTone,
		toDateInputValue
	} from '$lib/tasks/view';
	import { cn } from '$lib/utils';

	let {
		value = null,
		open = $bindable(false),
		disabled = false,
		align = 'start',
		mode = 'field',
		tintedField = false,
		emptyLabel = 'No due date',
		ariaLabel = 'Choose due date',
		onChange
	}: {
		value?: string | null;
		open?: boolean;
		disabled?: boolean;
		align?: 'start' | 'center' | 'end';
		mode?: 'field' | 'chip';
		tintedField?: boolean;
		emptyLabel?: string;
		ariaLabel?: string;
		onChange?: (value: string | null) => Promise<void> | void;
	} = $props();

	let calendarValue = $state<DateValue | undefined>(undefined);
	let lastSyncedValue = $state<string | null>(null);
	const compactWeekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
	const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		month: 'short'
	});

	function getNextMondayOffset() {
		const jsDate = today(getLocalTimeZone()).toDate(getLocalTimeZone());
		const day = jsDate.getDay();
		return day === 0 ? 1 : 8 - day;
	}

	function formatQuickPickDetail(isoDate: string | null) {
		if (!isoDate) {
			return '';
		}

		const date = new Date(isoDate);

		if (Number.isNaN(date.getTime())) {
			return '';
		}

		const now = new Date();
		const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const diffInDays = Math.round((targetDate.getTime() - todayDate.getTime()) / 86_400_000);

		if (diffInDays >= 0 && diffInDays <= 6) {
			return compactWeekdayFormatter.format(date);
		}

		return compactDateFormatter.format(date);
	}

	const label = $derived(value ? formatTaskDate(value) : emptyLabel);
	const isToday = $derived(label === 'today');
	const isTomorrow = $derived(label === 'tomorrow');
	const todayValue = $derived(fromDateInputValue(today(getLocalTimeZone()).toString()));
	const tomorrowValue = $derived(
		fromDateInputValue(today(getLocalTimeZone()).add({ days: 1 }).toString())
	);
	const nextWeekValue = $derived(
		fromDateInputValue(today(getLocalTimeZone()).add({ days: getNextMondayOffset() }).toString())
	);
	const showNextWeekQuickPick = $derived(getNextMondayOffset() > 1);
	const todayDetail = $derived(formatQuickPickDetail(todayValue));
	const tomorrowDetail = $derived(formatQuickPickDetail(tomorrowValue));
	const nextWeekDetail = $derived(formatQuickPickDetail(nextWeekValue));
	const isNextWeek = $derived(value === nextWeekValue);
	const toneClass = $derived(getDueDateTone(value));
	const chipToneClass = $derived(getDueDateBadgeTone(value));
	const fieldToneClass = $derived(
		tintedField && value
			? cn(getDueDateFieldTone(value), 'hover:brightness-[0.99] aria-expanded:brightness-[0.99]')
			: 'border-border/70 bg-background'
	);
	const triggerClass = $derived(
		mode === 'chip'
			? cn(
					'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition',
					chipToneClass
				)
			: cn(
					buttonVariants({ variant: 'outline', size: 'default' }),
					'h-11 w-full justify-between rounded-xl px-3 text-left font-normal',
					fieldToneClass
				)
	);

	$effect(() => {
		if (value === lastSyncedValue) {
			return;
		}

		lastSyncedValue = value;
		const nextInputValue = toDateInputValue(value);
		calendarValue = nextInputValue ? parseDate(nextInputValue) : undefined;
	});

	async function applyDate(nextValue: DateValue | undefined) {
		calendarValue = nextValue;
		const isoValue = nextValue ? fromDateInputValue(nextValue.toString()) : null;
		lastSyncedValue = isoValue;
		await onChange?.(isoValue);
		open = false;
	}

	async function clearDate() {
		await applyDate(undefined);
	}

	async function setToday() {
		await applyDate(today(getLocalTimeZone()));
	}

	async function setTomorrow() {
		await applyDate(today(getLocalTimeZone()).add({ days: 1 }));
	}

	async function setNextWeek() {
		const current = today(getLocalTimeZone());
		await applyDate(current.add({ days: getNextMondayOffset() }));
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={triggerClass}
		{disabled}
		aria-label={ariaLabel}
		data-task-composer-ignore-collapse="true"
	>
		<span class="inline-flex min-w-0 items-center gap-1.5">
			{#if isToday}
				<Sun
					class={cn(
						'size-3.5 shrink-0',
						mode === 'chip'
							? toneClass
							: tintedField && value
								? toneClass
								: !value
									? 'text-muted-foreground'
									: 'text-foreground'
					)}
				/>
			{:else if isTomorrow}
				<Sunrise
					class={cn(
						'size-3.5 shrink-0',
						mode === 'chip'
							? toneClass
							: tintedField && value
								? toneClass
								: !value
									? 'text-muted-foreground'
									: 'text-foreground'
					)}
				/>
			{:else}
				<CalendarDays
					class={cn(
						'size-3.5 shrink-0',
						mode === 'chip'
							? toneClass
							: tintedField && value
								? toneClass
								: !value
									? 'text-muted-foreground'
									: 'text-foreground'
					)}
				/>
			{/if}
			<span
				class={cn(
					mode === 'field' && 'truncate',
					mode === 'chip'
						? toneClass
						: tintedField && value
							? toneClass
							: !value && 'text-muted-foreground'
				)}
			>
				{label}
			</span>
		</span>
	</Popover.Trigger>

	<Popover.Content
		{align}
		class="w-[22rem] overflow-hidden rounded-[1.75rem] border-border/70 bg-[rgba(255,252,247,0.98)] p-0 shadow-[0_24px_80px_-36px_rgba(28,22,14,0.35)] backdrop-blur-sm dark:border-white/14 dark:bg-[color-mix(in_oklch,var(--color-popover)_82%,white_18%)] dark:shadow-[0_24px_80px_-42px_rgba(0,0,0,0.46)]"
		data-task-composer-ignore-collapse="true"
	>
		<div
			class="border-b border-border/70 bg-muted/[0.22] px-3 py-3 dark:border-white/12 dark:bg-white/10"
		>
			<div class="space-y-1">
				<Button
					variant="ghost"
					class={cn(
						'h-11 w-full items-center justify-start gap-3 rounded-2xl border border-transparent px-3 py-0 text-amber-700 shadow-none hover:border-amber-200 hover:bg-amber-50/90 hover:text-amber-900 dark:text-amber-100 dark:hover:border-amber-700/70 dark:hover:bg-amber-950/24 dark:hover:text-amber-50',
						isToday &&
							'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/80 dark:bg-amber-900/28 dark:text-amber-50'
					)}
					onclick={setToday}
				>
					<Sun class="size-4.5 shrink-0" />
					<span class="flex min-w-0 flex-1 items-center justify-between gap-3">
						<span class="text-[0.75rem] font-medium text-current/80">today</span>
						<span class="truncate text-[0.72rem] text-current/60">{todayDetail}</span>
					</span>
				</Button>
				<Button
					variant="ghost"
					class={cn(
						'h-11 w-full items-center justify-start gap-3 rounded-2xl border border-transparent px-3 py-0 text-orange-700 shadow-none hover:border-orange-200 hover:bg-orange-50/90 hover:text-orange-900 dark:text-orange-100 dark:hover:border-orange-700/70 dark:hover:bg-orange-950/22 dark:hover:text-orange-50',
						isTomorrow &&
							'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700/80 dark:bg-orange-900/26 dark:text-orange-50'
					)}
					onclick={setTomorrow}
				>
					<Sunrise class="size-4.5 shrink-0" />
					<span class="flex min-w-0 flex-1 items-center justify-between gap-3">
						<span class="text-[0.75rem] font-medium text-current/80">tomorrow</span>
						<span class="truncate text-[0.72rem] text-current/60">{tomorrowDetail}</span>
					</span>
				</Button>
				{#if showNextWeekQuickPick}
					<Button
						variant="ghost"
						class={cn(
							'h-11 w-full items-center justify-start gap-3 rounded-2xl border border-transparent px-3 py-0 text-sky-700 shadow-none hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-900 dark:text-sky-100 dark:hover:border-sky-700/70 dark:hover:bg-sky-950/22 dark:hover:text-sky-50',
							isNextWeek &&
								'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/80 dark:bg-sky-900/24 dark:text-sky-50'
						)}
						onclick={setNextWeek}
					>
						<CalendarDays class="size-4.5 shrink-0" />
						<span class="flex min-w-0 flex-1 items-center justify-between gap-3">
							<span class="text-[0.75rem] font-medium text-current/80">next week</span>
							<span class="truncate text-[0.72rem] text-current/60">{nextWeekDetail}</span>
						</span>
					</Button>
				{/if}
				<Button
					variant="ghost"
					class={cn(
						'h-11 w-full items-center justify-start gap-3 rounded-2xl border border-transparent px-3 py-0 text-muted-foreground shadow-none hover:border-border/70 hover:bg-background/80 hover:text-foreground dark:hover:border-white/12 dark:hover:bg-white/8',
						value && 'text-foreground',
						!value && 'opacity-60'
					)}
					onclick={clearDate}
					disabled={!value}
				>
					<X class="size-4.5 shrink-0" />
					<span class="text-[0.75rem] font-medium text-current/80">clear</span>
				</Button>
			</div>
		</div>

		<div class="p-2">
			<Calendar
				class="rounded-[1.3rem] border border-border/60 bg-background/90 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/12 dark:bg-white/12 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
				type="single"
				value={calendarValue}
				onValueChange={(nextValue: DateValue | undefined) => {
					void applyDate(nextValue);
				}}
			/>
		</div>
	</Popover.Content>
</Popover.Root>
