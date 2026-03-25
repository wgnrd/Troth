<script lang="ts">
	import { AlertCircle, Check, ChevronDown } from '@lucide/svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';

	type PriorityOption = {
		value: number;
		label: string;
		tone: string;
	};

	const options: PriorityOption[] = [
		{ value: 0, label: 'No priority', tone: 'text-muted-foreground' },
		{ value: 1, label: 'Low', tone: 'text-sky-700' },
		{ value: 3, label: 'Medium', tone: 'text-orange-700' },
		{ value: 5, label: 'High', tone: 'text-rose-700' }
	];

	let {
		value = 0,
		open = $bindable(false),
		disabled = false,
		align = 'start',
		ariaLabel = 'Choose priority',
		onChange
	}: {
		value?: number;
		open?: boolean;
		disabled?: boolean;
		align?: 'start' | 'center' | 'end';
		ariaLabel?: string;
		onChange?: (value: number) => Promise<void> | void;
	} = $props();

	const selectedOption = $derived(options.find((option) => option.value === value) ?? options[0]);

	async function handleSelect(nextValue: number) {
		await onChange?.(nextValue);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class="flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-sm transition outline-none focus-within:border-primary/30 focus-within:ring-3 focus-within:ring-primary/10"
		{disabled}
		aria-label={ariaLabel}
		data-task-composer-ignore-collapse="true"
	>
		<span class="inline-flex min-w-0 items-center gap-1.5">
			<AlertCircle class={cn('size-3.5 shrink-0', selectedOption.tone)} />
			<span class={cn('truncate', selectedOption.tone)}>{selectedOption.label}</span>
		</span>
		<ChevronDown class="size-4 shrink-0 text-muted-foreground" />
	</Popover.Trigger>

	<Popover.Content
		{align}
		class="w-48 rounded-2xl border-border/70 p-1.5"
		data-task-composer-ignore-collapse="true"
	>
		<div class="flex flex-col gap-1">
			{#each options as option (option.value)}
				<button
					type="button"
					class={cn(
						'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
						option.value === value
							? 'bg-muted text-foreground'
							: 'text-foreground/80 hover:bg-stone-50'
					)}
					onclick={() => {
						void handleSelect(option.value);
					}}
				>
					<span class="inline-flex items-center gap-2">
						<AlertCircle class={cn('size-3.5 shrink-0', option.tone)} />
						<span class={option.tone}>{option.label}</span>
					</span>
					{#if option.value === value}
						<Check class="size-4 shrink-0 text-muted-foreground" />
					{/if}
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
