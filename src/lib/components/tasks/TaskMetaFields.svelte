<script lang="ts">
	import { RefreshCcw } from '@lucide/svelte';
	import type { AppList } from '$lib/api/vikunja';
	import { cn } from '$lib/utils';
	import DueDatePicker from './DueDatePicker.svelte';
	import PriorityPicker from './PriorityPicker.svelte';
	import ProjectPicker from './ProjectPicker.svelte';
	import RepeatPicker from './RepeatPicker.svelte';

	let {
		lists,
		listId = $bindable(null),
		dueDate = $bindable(null),
		repeatAfter = $bindable(null),
		repeatMode = $bindable(null),
		priority = $bindable(0),
		disabled = false,
		lockProject = false,
		showLabels = true,
		showRepeatField = false,
		layout = 'grid',
		tintedDueDateField = false,
		projectLabel = 'Project',
		dueDateLabel = 'Due date',
		priorityLabel = 'Priority',
		repeatLabel = null,
		onDueDateChange,
		onListChange,
		onPriorityChange,
		onRepeatChange
	}: {
		lists: AppList[];
		listId?: number | null;
		dueDate?: string | null;
		repeatAfter?: number | null;
		repeatMode?: number | null;
		priority?: number;
		disabled?: boolean;
		lockProject?: boolean;
		showLabels?: boolean;
		showRepeatField?: boolean;
		layout?: 'grid' | 'surface';
		tintedDueDateField?: boolean;
		projectLabel?: string;
		dueDateLabel?: string;
		priorityLabel?: string;
		repeatLabel?: string | null;
		onDueDateChange?: (value: string | null) => Promise<void> | void;
		onListChange?: (value: number) => Promise<void> | void;
		onPriorityChange?: (value: number) => Promise<void> | void;
		onRepeatChange?: (value: {
			repeatAfter: number | null;
			repeatMode: number | null;
		}) => Promise<void> | void;
	} = $props();
</script>

<div class={cn(layout === 'surface' ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-3')}>
	<div
		class={cn(
			'min-w-0',
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
			'min-w-0',
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
			'min-w-0',
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

	{#if showRepeatField}
		<div
			class={cn(
				'min-w-0',
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
					Repeats
				</p>
			{/if}
			<div class={cn(layout === 'surface' && 'rounded-[1rem] bg-stone-50/65 p-0')}>
				<RepeatPicker
					{repeatAfter}
					{repeatMode}
					{disabled}
					ariaLabel="Edit repeat settings"
					onChange={async (nextValue) => {
						repeatAfter = nextValue.repeatAfter;
						repeatMode = nextValue.repeatMode;
						await onRepeatChange?.(nextValue);
					}}
				/>
			</div>
			{#if repeatLabel}
				<div
					class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
					aria-label={`Current repeat summary: ${repeatLabel}`}
				>
					<RefreshCcw class="size-3" />
					<span class="min-w-0 break-words">{repeatLabel}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
