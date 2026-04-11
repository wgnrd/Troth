<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { PencilLine, Plus, RefreshCcw, Settings2, Star, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import type {
		AppSavedFilter,
		CreateSavedFilterInput,
		UpdateSavedFilterInput
	} from '$lib/api/vikunja';
	import { connection } from '$lib/stores/connection';
	import { savedFilters } from '$lib/stores/saved-filters';
	import SavedFilterEditor from './SavedFilterEditor.svelte';

	let lastLoadKey = $state('');
	let filterEditorOpen = $state(false);
	let editingFilter = $state<AppSavedFilter | null>(null);

	const configured = $derived(Boolean($connection.settings));
	const loadError = $derived($savedFilters.error);
	const showInitialLoading = $derived(configured && $savedFilters.loading && !$savedFilters.loaded);

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`;

		if (nextKey !== lastLoadKey) {
			lastLoadKey = nextKey;
			void savedFilters.load();
		}
	});

	async function handleRefresh() {
		await savedFilters.refresh();
	}

	async function handleCreateFilter(input: CreateSavedFilterInput) {
		const createdFilter = await savedFilters.createSavedFilter(input);
		return Boolean(createdFilter);
	}

	async function handleUpdateFilter(input: UpdateSavedFilterInput) {
		const updatedFilter = await savedFilters.updateSavedFilter(input);
		return Boolean(updatedFilter);
	}

	async function handleDeleteFilter(filter: AppSavedFilter) {
		const confirmed = confirm(`Delete "${filter.title}"?`);

		if (!confirmed) {
			return;
		}

		await savedFilters.deleteSavedFilter(filter.id);
	}

	function openCreateFilter() {
		editingFilter = null;
		savedFilters.clearMutationError();
		filterEditorOpen = true;
	}

	function openEditFilter(filter: AppSavedFilter) {
		editingFilter = filter;
		savedFilters.clearMutationError();
		filterEditorOpen = true;
	}

	function getFilterSummary(filter: AppSavedFilter) {
		if (!filter.queryAvailable) {
			return 'Filter definition is not available from this Vikunja server version';
		}

		if (filter.query.filter) {
			return filter.query.filter;
		}

		if (filter.query.search) {
			return `Search: ${filter.query.search}`;
		}

		return 'No filter query set';
	}
</script>

<section class="mx-auto flex w-full max-w-[44rem] flex-col gap-4 sm:gap-5">
	<div class="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-0.5">
			<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
				Saved Filters
			</h1>
			<p class="text-sm text-muted-foreground">
				Manage your Vikunja saved filters and keep them close in the sidebar.
			</p>
		</div>

		{#if configured}
			<div class="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row sm:items-center">
				<Button variant="outline" size="sm" onclick={openCreateFilter}>
					<Plus class="size-3.5" />
					Add Saved Filter
				</Button>

				<Button
					variant="outline"
					size="sm"
					class="hidden sm:inline-flex"
					aria-label={$savedFilters.loading ? 'Refreshing saved filters' : 'Refresh saved filters'}
					onclick={handleRefresh}
					disabled={$savedFilters.loading}
				>
					<RefreshCcw class="size-3.5" />
					{$savedFilters.loading ? 'Refreshing…' : 'Refresh'}
				</Button>
			</div>
		{/if}
	</div>

	{#if !configured}
		<div
			class="rounded-[1.6rem] border border-border/70 bg-white/70 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
		>
			<div class="flex items-start gap-3">
				<span class="rounded-xl bg-muted p-2 text-muted-foreground">
					<Settings2 class="size-4" />
				</span>

				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium text-foreground">Troth is not connected to Vikunja yet.</p>
					<p class="text-sm text-muted-foreground">
						Connect Troth to Vikunja in Settings before loading saved filters.
					</p>
					<Button href={resolve('/settings')} size="sm">Open Settings</Button>
				</div>
			</div>
		</div>
	{:else if loadError}
		<div
			class="rounded-[1.6rem] border border-destructive/30 bg-destructive/6 px-4 py-3 text-sm text-destructive"
		>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p>{loadError}</p>
				<Button variant="destructive" size="sm" onclick={handleRefresh}>Try again</Button>
			</div>
		</div>
	{:else if showInitialLoading}
		<div class="space-y-3">
			{#each Array.from({ length: 3 }, (_, index) => index) as index (index)}
				<div
					class="h-24 rounded-[1.7rem] border border-border/60 bg-white/55 dark:bg-white/6"
				></div>
			{/each}
		</div>
	{:else if $savedFilters.items.length === 0}
		<div
			class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm dark:bg-white/7 dark:shadow-none"
		>
			<div class="space-y-2 text-center sm:text-left">
				<p class="text-sm font-medium text-foreground">No saved filters yet</p>
				<p class="text-sm text-muted-foreground">
					Create a saved filter in Vikunja syntax to pin a reusable query in Troth.
				</p>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			{#each $savedFilters.items as filter (filter.id)}
				<div
					class="rounded-[1.4rem] border border-border/60 bg-white/60 px-4 py-4 shadow-sm dark:bg-white/6 dark:shadow-none"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 space-y-1.5">
							<div class="flex items-center gap-2">
								<a
									href={resolve(`/saved-filters/${filter.id}`)}
									class="truncate text-sm font-semibold text-foreground hover:underline"
								>
									{filter.title}
								</a>
								{#if filter.isFavorite}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[0.7rem] font-medium text-primary"
									>
										<Star class="size-3" /> Favorite
									</span>
								{/if}
							</div>

							{#if filter.description}
								<p class="text-sm text-muted-foreground">{filter.description}</p>
							{/if}

							<p
								class="rounded-xl bg-muted/55 px-3 py-2 font-mono text-xs leading-6 text-muted-foreground"
							>
								{getFilterSummary(filter)}
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-1">
							{#if filter.writeSupported}
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-muted-foreground hover:text-foreground"
									aria-label={`Edit ${filter.title}`}
									onclick={() => {
										openEditFilter(filter);
									}}
								>
									<PencilLine class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive/80 hover:bg-destructive/8 hover:text-destructive"
									aria-label={`Delete ${filter.title}`}
									disabled={$savedFilters.mutatingIds.includes(filter.id)}
									onclick={() => {
										void handleDeleteFilter(filter);
									}}
								>
									<Trash2 class="size-4" />
								</Button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<SavedFilterEditor
	open={filterEditorOpen}
	mode={editingFilter ? 'edit' : 'create'}
	filter={editingFilter}
	busy={editingFilter
		? $savedFilters.mutatingIds.includes(editingFilter.id)
		: $savedFilters.creating}
	error={$savedFilters.mutationError}
	onClose={() => {
		filterEditorOpen = false;
		editingFilter = null;
		savedFilters.clearMutationError();
	}}
	onSubmit={editingFilter ? handleUpdateFilter : handleCreateFilter}
/>
