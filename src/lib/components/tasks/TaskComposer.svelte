<script lang="ts">
	import type { AppList, CreateTaskInput } from '$lib/api/vikunja';
	import TaskMetaFields from './TaskMetaFields.svelte';

	let {
		lists,
		busy = false,
		error = null,
		fixedListId = null,
		placeholder = 'Add a task',
		disabledMessage = 'Add a project in Vikunja before creating tasks.',
		onSubmit
	}: {
		lists: AppList[];
		busy?: boolean;
		error?: string | null;
		fixedListId?: number | null;
		placeholder?: string;
		disabledMessage?: string;
		onSubmit?: (input: CreateTaskInput) => Promise<boolean | void> | boolean | void;
	} = $props();

	let title = $state('');
	let selectedListId = $state<number | null>(null);
	let dueDate = $state<string | null>(getDefaultDueDate());
	let priority = $state(0);
	let localError = $state<string | null>(null);
	let expanded = $state(false);
	let formEl = $state<HTMLFormElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (fixedListId !== null) {
			selectedListId = fixedListId;
			return;
		}

		if (!lists.some((list) => list.id === selectedListId)) {
			selectedListId = lists[0]?.id ?? null;
		}
	});

	$effect(() => {
		if (localError && title.trim()) {
			localError = null;
		}
	});

	$effect(() => {
		if (!expanded) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return;
			}

			collapseComposer();
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target;
			const composedPath = event.composedPath();

			if (target instanceof Node && formEl?.contains(target)) {
				return;
			}

			if (
				composedPath.some(
					(entry) =>
						entry instanceof HTMLElement && entry.dataset.taskComposerIgnoreCollapse === 'true'
				)
			) {
				return;
			}

			collapseComposer();
		}

		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	});

	const canSubmit = $derived(Boolean(title.trim()) && selectedListId !== null && !busy);
	const helperClass = $derived(localError || error ? 'text-destructive' : 'text-muted-foreground');
	const helperText = $derived.by(() => {
		if (localError || error) {
			return localError ?? error;
		}

		if (lists.length === 0) {
			return disabledMessage;
		}

		if (fixedListId !== null) {
			return '';
		}

		return '';
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!title.trim()) {
			localError = 'Enter a title first.';
			expanded = true;
			return;
		}

		if (selectedListId === null) {
			localError = disabledMessage;
			expanded = true;
			return;
		}

		localError = null;
		const result = await onSubmit?.({
			title: title.trim(),
			listId: selectedListId,
			dueDate,
			priority
		});

		if (result !== false) {
			title = '';
			dueDate = getDefaultDueDate();
			priority = 0;
			expanded = false;
			inputEl?.focus();
		}
	}

	function handleFocusIn() {
		expanded = true;
	}

	function collapseComposer() {
		expanded = false;
		localError = null;

		const activeElement = document.activeElement;
		if (activeElement instanceof HTMLElement) {
			activeElement.blur();
		}
	}

	function getDefaultDueDate() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}T12:00:00.000Z`;
	}
</script>

<form
	bind:this={formEl}
	class="rounded-[1.6rem] border border-border/70 bg-white/78 p-3 shadow-sm backdrop-blur"
	onsubmit={handleSubmit}
	onfocusin={handleFocusIn}
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			bind:this={inputEl}
			bind:value={title}
			class="h-11 min-w-0 flex-1 rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
			type="text"
			name="title"
			{placeholder}
			disabled={busy}
			aria-label="Task title"
		/>

		<button
			type="submit"
			class="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
			disabled={!canSubmit}
		>
			{busy ? 'Adding…' : 'Add'}
		</button>
	</div>

	{#if expanded}
		<div class="mt-3 border-t border-border/60 pt-3">
			<TaskMetaFields
				{lists}
				bind:listId={selectedListId}
				bind:dueDate
				bind:priority
				disabled={busy}
				lockProject={fixedListId !== null}
				showLabels={false}
				tintedDueDateField
			/>
		</div>
	{/if}

	{#if helperText}
		<p class={`mt-2 text-sm ${helperClass}`}>
			{helperText}
		</p>
	{/if}
</form>
