<script lang="ts">
	import type { AppList } from '$lib/api/vikunja';
	import { cn } from '$lib/utils';
	import DueDatePicker from './DueDatePicker.svelte';
	import PriorityPicker from './PriorityPicker.svelte';
	import ProjectPicker from './ProjectPicker.svelte';

	let {
		lists,
		listId = $bindable(null),
		dueDate = $bindable(null),
		priority = $bindable(0),
		disabled = false,
		lockProject = false,
		showLabels = true,
		layout = 'grid',
		tintedDueDateField = false,
		projectLabel = 'Project',
		dueDateLabel = 'Due date',
		priorityLabel = 'Priority',
		onDueDateChange,
		onListChange,
		onPriorityChange
	}: {
		lists: AppList[];
		listId?: number | null;
		dueDate?: string | null;
		priority?: number;
		disabled?: boolean;
		lockProject?: boolean;
		showLabels?: boolean;
		layout?: 'grid' | 'surface';
		tintedDueDateField?: boolean;
		projectLabel?: string;
		dueDateLabel?: string;
		priorityLabel?: string;
		onDueDateChange?: (value: string | null) => Promise<void> | void;
		onListChange?: (value: number) => Promise<void> | void;
		onPriorityChange?: (value: number) => Promise<void> | void;
	} = $props();
</script>

<div class={cn(layout === 'surface' ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-3')}>
	<div
		class={cn(
			layout === 'surface' && 'space-y-1.5',
			showLabels && layout !== 'surface' && 'space-y-2'
		)}
	>
		{#if showLabels}
			<p
				class={cn(
					'text-xs text-muted-foreground',
					layout === 'surface' ? 'font-medium' : 'font-medium tracking-[0.16em] uppercase'
				)}
			>
				{dueDateLabel}
			</p>
		{/if}
		<DueDatePicker
			value={dueDate}
			{disabled}
			tintedField={tintedDueDateField}
			ariaLabel={dueDateLabel}
			onChange={async (nextValue) => {
				dueDate = nextValue;
				await onDueDateChange?.(nextValue);
			}}
		/>
	</div>

	<div
		class={cn(
			layout === 'surface' && 'space-y-1.5',
			showLabels && layout !== 'surface' && 'space-y-2'
		)}
	>
		{#if showLabels}
			<p
				class={cn(
					'text-xs text-muted-foreground',
					layout === 'surface' ? 'font-medium' : 'font-medium tracking-[0.16em] uppercase'
				)}
			>
				{projectLabel}
			</p>
		{/if}
		<ProjectPicker
			{lists}
			value={listId}
			disabled={disabled || lockProject || lists.length === 0}
			ariaLabel={projectLabel}
			onChange={async (nextListId) => {
				listId = nextListId;
				await onListChange?.(nextListId);
			}}
		/>
	</div>

	<div
		class={cn(
			layout === 'surface' && 'space-y-1.5',
			showLabels && layout !== 'surface' && 'space-y-2'
		)}
	>
		{#if showLabels}
			<p
				class={cn(
					'text-xs text-muted-foreground',
					layout === 'surface' ? 'font-medium' : 'font-medium tracking-[0.16em] uppercase'
				)}
			>
				{priorityLabel}
			</p>
		{/if}
		<PriorityPicker
			value={priority}
			{disabled}
			ariaLabel={priorityLabel}
			onChange={async (nextValue) => {
				priority = nextValue;
				await onPriorityChange?.(nextValue);
			}}
		/>
	</div>
</div>
