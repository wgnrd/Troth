<script lang="ts">
	import { RefreshCcw, Trash2 } from '@lucide/svelte';
	import {
		composeRepeatInterval,
		getRepeatIntervalParts,
		normalizeTaskRepeatMode,
		type RepeatUnit
	} from '$lib/tasks/view';
	import { cn } from '$lib/utils';

	type RepeatDraft = {
		repeatAfter: number | null;
		repeatMode: number | null;
	};

	type RepeatEditorMode = 'none' | 'interval' | 'from_completion' | 'monthly';

	const unitOptions: Array<{ value: RepeatUnit; label: string }> = [
		{ value: 'minute', label: 'Minutes' },
		{ value: 'hour', label: 'Hours' },
		{ value: 'day', label: 'Days' },
		{ value: 'week', label: 'Weeks' },
		{ value: 'month', label: 'Months' },
		{ value: 'year', label: 'Years' }
	];

	let {
		repeatAfter = null,
		repeatMode = null,
		disabled = false,
		ariaLabel = 'Edit repeat settings',
		onChange
	}: {
		repeatAfter?: number | null;
		repeatMode?: number | null;
		disabled?: boolean;
		ariaLabel?: string;
		onChange?: (value: RepeatDraft) => Promise<void> | void;
	} = $props();

	let mode = $state<RepeatEditorMode>('none');
	let amount = $state(1);
	let unit = $state<RepeatUnit>('day');
	let syncedKey = $state('');

	$effect(() => {
		const normalizedMode = normalizeTaskRepeatMode(repeatMode);
		const nextKey = `${repeatAfter ?? ''}|${normalizedMode}`;

		if (nextKey === syncedKey) {
			return;
		}

		syncedKey = nextKey;

		if (normalizedMode === 1) {
			mode = 'monthly';
			amount = 1;
			unit = 'month';
			return;
		}

		if ((repeatAfter ?? 0) > 0) {
			const parts = getRepeatIntervalParts(repeatAfter);
			mode = normalizedMode === 2 ? 'from_completion' : 'interval';
			amount = parts.amount;
			unit = parts.unit;
			return;
		}

		mode = 'none';
		amount = 1;
		unit = 'day';
	});

	async function commit(nextMode: RepeatEditorMode, nextAmount = amount, nextUnit = unit) {
		if (nextMode === 'none') {
			await onChange?.({ repeatAfter: null, repeatMode: null });
			return;
		}

		if (nextMode === 'monthly') {
			await onChange?.({ repeatAfter: null, repeatMode: 1 });
			return;
		}

		const safeAmount = Math.max(1, Math.floor(nextAmount || 1));
		const safeMode = nextMode === 'from_completion' ? 2 : 0;

		await onChange?.({
			repeatAfter: composeRepeatInterval(safeAmount, nextUnit),
			repeatMode: safeMode
		});
	}

	async function handleModeChange(event: Event) {
		const nextMode = (event.currentTarget as HTMLSelectElement).value as RepeatEditorMode;
		mode = nextMode;

		if (nextMode === 'interval' || nextMode === 'from_completion') {
			if (amount <= 0) {
				amount = 1;
			}

			await commit(nextMode, amount, unit);
			return;
		}

		await commit(nextMode);
	}

	async function handleAmountChange(event: Event) {
		const nextValue = Number((event.currentTarget as HTMLInputElement).value);
		amount = Number.isFinite(nextValue) && nextValue > 0 ? Math.floor(nextValue) : 1;
		await commit(mode, amount, unit);
	}

	async function handleUnitChange(event: Event) {
		unit = (event.currentTarget as HTMLSelectElement).value as RepeatUnit;
		await commit(mode, amount, unit);
	}

	async function handleClear() {
		mode = 'none';
		amount = 1;
		unit = 'day';
		await commit('none');
	}
</script>

<div
	class="min-w-0 rounded-xl border border-border/70 bg-background px-3 py-3"
	data-task-composer-ignore-collapse="true"
>
	<div class="flex min-w-0 flex-wrap items-center gap-2">
		<RefreshCcw class="size-3.5 shrink-0 text-muted-foreground" />
		<select
			class="h-9 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
			{disabled}
			aria-label={ariaLabel}
			value={mode}
			onchange={handleModeChange}
		>
			<option value="none">Does not repeat</option>
			<option value="interval">After interval</option>
			<option value="from_completion">From completion</option>
			<option value="monthly">Monthly</option>
		</select>

		{#if mode !== 'none'}
			<button
				type="button"
				class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition hover:bg-stone-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
				{disabled}
				aria-label="Clear repeat settings"
				onclick={handleClear}
			>
				<Trash2 class="size-3.5" />
			</button>
		{/if}
	</div>

	{#if mode === 'interval' || mode === 'from_completion'}
		<div class="mt-3 grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-2">
			<input
				type="number"
				min="1"
				step="1"
				class={cn(
					'h-9 min-w-0 rounded-lg border border-border/70 bg-background px-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-3 focus:ring-primary/10'
				)}
				{disabled}
				aria-label="Repeat amount"
				value={amount}
				onchange={handleAmountChange}
			/>

			<select
				class="h-9 min-w-0 rounded-lg border border-border/70 bg-background px-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
				{disabled}
				aria-label="Repeat unit"
				value={unit}
				onchange={handleUnitChange}
			>
				{#each unitOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if mode === 'monthly'}
		<p class="mt-3 text-sm text-muted-foreground">
			Repeats all task dates every month.
		</p>
	{:else if mode === 'from_completion'}
		<p class="mt-3 text-sm text-muted-foreground">
			Uses the completion date as the base for the next repeat.
		</p>
	{:else if mode === 'interval'}
		<p class="mt-3 text-sm text-muted-foreground">
			Uses the current scheduled date as the base for the next repeat. Example: 2 days = every
			second day.
		</p>
	{/if}
</div>
