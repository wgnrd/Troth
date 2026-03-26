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

	function getNextMondayOffset() {
		const jsDate = today(getLocalTimeZone()).toDate(getLocalTimeZone());
		const day = jsDate.getDay();
		return day === 0 ? 1 : 8 - day;
	}

	const label = $derived(value ? formatTaskDate(value) : emptyLabel);
	const isToday = $derived(label === 'today');
	const isTomorrow = $derived(label === 'tomorrow');
	const isNextWeek = $derived(
		value ===
			fromDateInputValue(today(getLocalTimeZone()).add({ days: getNextMondayOffset() }).toString())
	);
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
	const footerLabel = $derived(value ? `Selected: ${label}` : 'Pick a date or use a shortcut');

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
		class="w-[22rem] overflow-hidden rounded-[1.75rem] border-border/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(255,255,255,1))] p-0 shadow-[0_24px_80px_-36px_rgba(28,22,14,0.35)] backdrop-blur-sm"
		data-task-composer-ignore-collapse="true"
	>
		<div class="border-b border-border/70 bg-muted/[0.22] px-3 py-3">
			<div
				class="mb-2 px-1 text-[0.68rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
			>
				Quick picks
			</div>
			<div class="grid grid-cols-3 gap-2">
				<Button
					variant="ghost"
					class={cn(
						'h-auto min-h-20 flex-col items-start justify-between rounded-2xl border border-transparent px-3 py-3 text-left text-amber-800 shadow-none hover:border-amber-200 hover:bg-amber-50/90 hover:text-amber-900',
						isToday && 'border-amber-300 bg-amber-50 text-amber-900'
					)}
					onclick={setToday}
				>
					<Sun class="size-4.5" />
					<span class="space-y-0.5">
						<span class="block text-sm font-semibold">Today</span>
						<span class="block text-[0.72rem] font-normal text-current/70">Stay on track</span>
					</span>
				</Button>
				<Button
					variant="ghost"
					class={cn(
						'h-auto min-h-20 flex-col items-start justify-between rounded-2xl border border-transparent px-3 py-3 text-left text-orange-800 shadow-none hover:border-orange-200 hover:bg-orange-50/90 hover:text-orange-900',
						isTomorrow && 'border-orange-300 bg-orange-50 text-orange-900'
					)}
					onclick={setTomorrow}
				>
					<Sunrise class="size-4.5" />
					<span class="space-y-0.5">
						<span class="block text-sm font-semibold">Tomorrow</span>
						<span class="block text-[0.72rem] font-normal text-current/70">One-day push</span>
					</span>
				</Button>
				<Button
					variant="ghost"
					class={cn(
						'h-auto min-h-20 flex-col items-start justify-between rounded-2xl border border-transparent px-3 py-3 text-left text-sky-800 shadow-none hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-900',
						isNextWeek && 'border-sky-300 bg-sky-50 text-sky-900'
					)}
					onclick={setNextWeek}
				>
					<CalendarDays class="size-4.5" />
					<span class="space-y-0.5">
						<span class="block text-sm font-semibold">Next week</span>
						<span class="block text-[0.72rem] font-normal text-current/70">Monday reset</span>
					</span>
				</Button>
			</div>
		</div>

		<div class="p-3">
			<Calendar
				class="rounded-[1.4rem] border border-border/60 bg-background/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
				type="single"
				value={calendarValue}
				onValueChange={(nextValue: DateValue | undefined) => {
					void applyDate(nextValue);
				}}
			/>
		</div>

		<div
			class="flex items-center justify-between border-t border-border/70 bg-muted/[0.18] px-3 py-2.5"
		>
			<div class="text-xs font-medium text-muted-foreground">{footerLabel}</div>
			<Button
				variant="ghost"
				size="sm"
				class="rounded-full px-2.5"
				onclick={clearDate}
				disabled={!value}
			>
				<X class="size-3.5" />
				Clear
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
