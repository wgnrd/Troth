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

	const label = $derived(value ? formatTaskDate(value) : emptyLabel);
	const isToday = $derived(label === 'today');
	const isTomorrow = $derived(label === 'tomorrow');
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
		const jsDate = current.toDate(getLocalTimeZone());
		const day = jsDate.getDay();
		const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
		await applyDate(current.add({ days: daysUntilNextMonday }));
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
		class="w-auto rounded-2xl border-border/70 p-0"
		data-task-composer-ignore-collapse="true"
	>
		<div class="flex flex-col gap-2 border-b border-border/70 px-3 py-3">
			<Button
				variant="ghost"
				size="sm"
				class="h-9 justify-start rounded-xl px-2.5 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
				onclick={setToday}
			>
				<Sun class="size-4" />
				Today
			</Button>
			<Button
				variant="ghost"
				size="sm"
				class="h-9 justify-start rounded-xl px-2.5 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
				onclick={setTomorrow}
			>
				<Sunrise class="size-4" />
				Tomorrow
			</Button>
			<Button
				variant="ghost"
				size="sm"
				class="h-9 justify-start rounded-xl px-2.5 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
				onclick={setNextWeek}
			>
				<CalendarDays class="size-4" />
				Next week
			</Button>
		</div>

		<div class="p-2">
			<Calendar
				type="single"
				value={calendarValue}
				onValueChange={(nextValue: DateValue | undefined) => {
					void applyDate(nextValue);
				}}
			/>
		</div>

		<div class="flex items-center justify-between border-t border-border/70 px-3 py-2">
			<div class="text-xs text-muted-foreground">Choose a date or use a shortcut.</div>
			<Button variant="ghost" size="sm" onclick={clearDate} disabled={!value}>
				<X class="size-3.5" />
				Clear
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
