<script lang="ts">
	import { Check, Hash } from '@lucide/svelte';
	import type { AppList } from '$lib/api/vikunja';
	import * as Popover from '$lib/components/ui/popover';
	import { buildProjectTree, flattenProjectTree } from '$lib/lists/tree';
	import { cn } from '$lib/utils';

	let {
		lists,
		value = null,
		open = $bindable(false),
		disabled = false,
		align = 'start',
		mode = 'field',
		ariaLabel = 'Choose project',
		onChange
	}: {
		lists: AppList[];
		value?: number | null;
		open?: boolean;
		disabled?: boolean;
		align?: 'start' | 'center' | 'end';
		mode?: 'field' | 'chip';
		ariaLabel?: string;
		onChange?: (value: number) => Promise<void> | void;
	} = $props();

	const selectedList = $derived(lists.find((list) => list.id === value) ?? null);
	const treeEntries = $derived(flattenProjectTree(buildProjectTree(lists)));
	const chipStyle = $derived(
		mode === 'chip' && selectedList?.color
			? `--project-chip-color: ${selectedList.color}; color: ${selectedList.color}; background-color: color-mix(in oklch, ${selectedList.color} 8%, white); border-color: color-mix(in oklch, ${selectedList.color} 20%, white);`
			: undefined
	);
	const triggerClass = $derived(
		mode === 'chip'
			? cn(
					'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition',
					selectedList?.color
						? 'border-transparent hover:brightness-[0.98] dark:hover:brightness-[1.08]'
						: 'border-transparent bg-muted text-foreground/75 hover:bg-stone-200 dark:bg-white/8 dark:text-stone-200 dark:hover:bg-white/12'
				)
			: 'flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-sm outline-none transition focus-within:border-primary/30 focus-within:ring-3 focus-within:ring-primary/10'
	);

	async function handleSelect(listId: number) {
		await onChange?.(listId);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		class={triggerClass}
		style={chipStyle}
		{disabled}
		aria-label={ariaLabel}
		data-task-composer-ignore-collapse="true"
	>
		<span class="inline-flex min-w-0 items-center gap-1.5">
			<Hash
				class="size-3.5 shrink-0"
				style={selectedList?.color ? `color: ${selectedList.color};` : undefined}
			/>
			<span class={cn(mode === 'field' && 'truncate', !selectedList && 'text-muted-foreground')}>
				{selectedList?.title ?? 'No project'}
			</span>
		</span>
	</Popover.Trigger>

	<Popover.Content
		{align}
		class="w-60 rounded-2xl border-border/70 p-1.5"
		data-task-composer-ignore-collapse="true"
	>
		<div class="max-h-72 overflow-y-auto">
			{#each treeEntries as entry (entry.list.id)}
				<button
					type="button"
					class={cn(
						'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
						entry.list.id === value
							? 'bg-muted text-foreground'
							: 'text-foreground/80 hover:bg-stone-50 dark:hover:bg-white/8'
					)}
					onclick={() => {
						void handleSelect(entry.list.id);
					}}
				>
					<span
						class="flex min-w-0 items-center gap-2"
						style={`padding-left: ${entry.depth * 0.9}rem;`}
					>
						<Hash
							class="size-3.5 shrink-0"
							style={entry.list.color ? `color: ${entry.list.color};` : undefined}
						/>
						<span class="truncate">{entry.list.title}</span>
					</span>
					{#if entry.list.id === value}
						<Check class="size-4 shrink-0 text-muted-foreground" />
					{/if}
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	:global(.dark [style*='--project-chip-color']) {
		background-color: color-mix(
			in oklch,
			var(--project-chip-color) 16%,
			transparent
		) !important;
		border-color: color-mix(in oklch, var(--project-chip-color) 38%, transparent) !important;
	}
</style>
