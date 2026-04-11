<script lang="ts">
	import { X } from '@lucide/svelte';
	import type {
		AppSavedFilter,
		CreateSavedFilterInput,
		UpdateSavedFilterInput
	} from '$lib/api/vikunja';
	import { Button } from '$lib/components/ui/button';

	let {
		open = false,
		mode = 'create',
		filter = null,
		busy = false,
		error = null,
		onClose,
		onSubmit
	}: {
		open?: boolean;
		mode?: 'create' | 'edit';
		filter?: AppSavedFilter | null;
		busy?: boolean;
		error?: string | null;
		onClose?: () => void;
		onSubmit?:
			| ((input: CreateSavedFilterInput) => Promise<boolean | void> | boolean | void)
			| ((input: UpdateSavedFilterInput) => Promise<boolean | void> | boolean | void);
	} = $props();

	let title = $state('');
	let description = $state('');
	let filterQuery = $state('');
	let search = $state('');
	let filterIncludeNulls = $state(false);
	let sortByText = $state('');
	let orderByText = $state('');
	let isFavorite = $state(false);
	let localError = $state<string | null>(null);
	let syncedFilterKey = $state('');
	let editorEl = $state<HTMLElement | null>(null);
	let previousFocus = $state<HTMLElement | null>(null);

	const helperText = $derived(localError ?? error);

	$effect(() => {
		if (!open) {
			if (previousFocus && document.contains(previousFocus)) {
				previousFocus.focus();
			}
			previousFocus = null;
			return;
		}

		previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	});

	$effect(() => {
		if (!open) {
			return;
		}

		const nextKey =
			mode === 'edit' && filter
				? `${filter.id}|${filter.title}|${filter.updatedAt}|${filter.query.filter}`
				: 'create';

		if (nextKey === syncedFilterKey) {
			return;
		}

		syncedFilterKey = nextKey;
		title = filter?.title ?? '';
		description = filter?.description ?? '';
		filterQuery = filter?.query.filter ?? '';
		search = filter?.query.search ?? '';
		filterIncludeNulls = filter?.query.filterIncludeNulls ?? false;
		sortByText = (filter?.query.sortBy ?? []).join(', ');
		orderByText = (filter?.query.orderBy ?? []).join(', ');
		isFavorite = filter?.isFavorite ?? false;
		localError = null;
	});

	$effect(() => {
		if (!open) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			const activeElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;
			const isInsideEditor = activeElement ? editorEl?.contains(activeElement) : false;

			if (!isInsideEditor) {
				return;
			}

			if (event.key === 'Escape' && !busy) {
				event.preventDefault();
				onClose?.();
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!title.trim()) {
			localError = 'Enter a saved filter name first.';
			return;
		}

		if (filterQuery.trim() && search.trim()) {
			localError = 'Use either a filter query or a search string, not both.';
			return;
		}

		const sortBy = parseCommaList(sortByText);
		const orderBy = parseCommaList(orderByText).map((value) => value.toLowerCase());

		if (orderBy.length > 0 && sortBy.length === 0) {
			localError = 'Add at least one sort field before setting order directions.';
			return;
		}

		if (orderBy.some((value) => value !== 'asc' && value !== 'desc')) {
			localError = 'Order directions must be "asc" or "desc".';
			return;
		}

		if (orderBy.length > 0 && orderBy.length !== sortBy.length) {
			localError = 'Use the same number of order directions as sort fields.';
			return;
		}

		localError = null;

		const payload = {
			title: title.trim(),
			description: description.trim(),
			query: {
				filter: filterQuery.trim(),
				filterIncludeNulls,
				orderBy,
				search: search.trim(),
				sortBy
			},
			isFavorite
		} satisfies CreateSavedFilterInput;

		if (mode === 'edit' && filter) {
			const result = await (
				onSubmit as
					| ((input: UpdateSavedFilterInput) => Promise<boolean | void> | boolean | void)
					| undefined
			)?.({
				id: filter.id,
				...payload
			} satisfies UpdateSavedFilterInput);

			if (result !== false) {
				onClose?.();
			}

			return;
		}

		const result = await (
			onSubmit as
				| ((input: CreateSavedFilterInput) => Promise<boolean | void> | boolean | void)
				| undefined
		)?.(payload);

		if (result !== false) {
			onClose?.();
		}
	}

	function parseCommaList(value: string) {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-stone-950/20 backdrop-blur-[2px]"
		aria-label="Close saved filter editor"
		onclick={() => {
			if (!busy) {
				onClose?.();
			}
		}}
	></button>

	<aside
		bind:this={editorEl}
		class="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[38rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-4 shadow-2xl"
		aria-label={mode === 'edit' ? 'Edit saved filter' : 'Create saved filter'}
	>
		<form class="space-y-5" onsubmit={handleSubmit}>
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-1">
					<h2 class="text-[1.35rem] font-semibold tracking-tight text-foreground">
						{mode === 'edit' ? 'Edit Saved Filter' : 'Add Saved Filter'}
					</h2>
					<p class="text-sm text-muted-foreground">
						Save a Vikunja filter query, search, and sort order for quick access.
					</p>
				</div>

				<Button
					variant="ghost"
					size="icon-sm"
					class="text-muted-foreground hover:text-foreground"
					onclick={() => {
						onClose?.();
					}}
					disabled={busy}
					aria-label="Close saved filter editor"
				>
					<X class="size-4" />
				</Button>
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					for="saved-filter-title"
				>
					Name
				</label>
				<input
					id="saved-filter-title"
					bind:value={title}
					class="h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					type="text"
					placeholder="Urgent work"
					disabled={busy}
				/>
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					for="saved-filter-description"
				>
					Description
				</label>
				<textarea
					id="saved-filter-description"
					bind:value={description}
					class="min-h-20 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					placeholder="Optional context for this filter"
					disabled={busy}
				></textarea>
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					for="saved-filter-query"
				>
					Filter Query
				</label>
				<textarea
					id="saved-filter-query"
					bind:value={filterQuery}
					class="min-h-24 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 font-mono text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					placeholder="done = false && priority >= 3"
					disabled={busy}
				></textarea>
				<p class="text-xs leading-5 text-muted-foreground">
					Use Vikunja API filter syntax. Leave this blank if you want a simple text search instead.
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label
						class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
						for="saved-filter-search"
					>
						Search
					</label>
					<input
						id="saved-filter-search"
						bind:value={search}
						class="h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
						type="text"
						placeholder="release notes"
						disabled={busy}
					/>
				</div>

				<div class="space-y-2">
					<label
						class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
						for="saved-filter-sort-by"
					>
						Sort Fields
					</label>
					<input
						id="saved-filter-sort-by"
						bind:value={sortByText}
						class="h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
						type="text"
						placeholder="due_date, priority"
						disabled={busy}
					/>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label
						class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
						for="saved-filter-order-by"
					>
						Order Directions
					</label>
					<input
						id="saved-filter-order-by"
						bind:value={orderByText}
						class="h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
						type="text"
						placeholder="asc, desc"
						disabled={busy}
					/>
				</div>

				<div class="flex items-center gap-6 pt-7">
					<label class="flex items-center gap-2 text-sm text-foreground">
						<input bind:checked={filterIncludeNulls} type="checkbox" disabled={busy} />
						<span>Include null values</span>
					</label>
					<label class="flex items-center gap-2 text-sm text-foreground">
						<input bind:checked={isFavorite} type="checkbox" disabled={busy} />
						<span>Favorite</span>
					</label>
				</div>
			</div>

			{#if helperText}
				<p
					class="rounded-xl border border-destructive/20 bg-destructive/6 px-3 py-2 text-sm text-destructive"
				>
					{helperText}
				</p>
			{/if}

			<div class="flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" onclick={onClose} disabled={busy}>Cancel</Button>
				<Button type="submit" disabled={busy}>
					{busy
						? mode === 'edit'
							? 'Saving…'
							: 'Creating…'
						: mode === 'edit'
							? 'Save Filter'
							: 'Create Filter'}
				</Button>
			</div>
		</form>
	</aside>
{/if}
