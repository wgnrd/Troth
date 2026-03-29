<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import {
		Eye,
		EyeOff,
		Hash,
		Layers3,
		PencilLine,
		Plus,
		RefreshCcw,
		Settings2,
		Trash2
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import ProjectEditor from '$lib/components/projects/ProjectEditor.svelte';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { tasks } from '$lib/stores/tasks';
	import type { AppList } from '$lib/api/vikunja';
	import {
		buildProjectTree,
		countOpenTasksForProjectTree,
		flattenProjectTree,
		getDescendantProjectIds,
		getEffectiveHiddenProjectIds,
		type ProjectTreeNode
	} from '$lib/lists/tree';

	let lastLoadKey = $state('');
	let projectEditorOpen = $state(false);
	let editingProject = $state<AppList | null>(null);

	const configured = $derived(Boolean($connection.settings));
	const allActiveLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allActiveLists, $projectPreferences.hiddenProjectIds)
	);
	const activeLists = $derived(allActiveLists.filter((list) => !hiddenProjectIds.has(list.id)));
	const hiddenLists = $derived(
		allActiveLists
			.filter((list) => hiddenProjectIds.has(list.id))
			.sort((left, right) => left.title.localeCompare(right.title))
	);
	const projectTree = $derived(buildProjectTree(activeLists));
	const loadError = $derived($lists.error ?? $tasks.error);
	const showInitialLoading = $derived(
		configured && ($lists.loading || $tasks.loading) && !$lists.loaded
	);

	$effect(() => {
		if (!browser || !$connection.settings) {
			lastLoadKey = '';
			return;
		}

		const nextKey = `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`;

		if (nextKey !== lastLoadKey) {
			lastLoadKey = nextKey;
			void Promise.all([lists.load(), tasks.load()]);
		}
	});

	async function handleRefresh() {
		await Promise.all([lists.refresh(), tasks.refresh()]);
	}

	async function handleCreateProject(input: {
		title: string;
		description?: string;
		color?: string | null;
		parentId?: number | null;
	}) {
		const createdProject = await lists.createProject(input);
		return Boolean(createdProject);
	}

	async function handleUpdateProject(input: {
		id: number;
		title: string;
		description?: string;
		color?: string | null;
		parentId?: number | null;
	}) {
		const updatedProject = await lists.updateProject(input);
		return Boolean(updatedProject);
	}

	async function handleDeleteProject(project: AppList) {
		const confirmed = confirm(`Delete "${project.title}" and its nested projects?`);

		if (!confirmed) {
			return;
		}

		const deletedProjectIds = await lists.deleteProject(project.id);

		if (!deletedProjectIds) {
			return;
		}

		projectPreferences.removeProjectIds(deletedProjectIds);
		tasks.removeTasksByListIds(deletedProjectIds);
	}

	function openCreateProject() {
		editingProject = null;
		lists.clearMutationError();
		projectEditorOpen = true;
	}

	function openEditProject(project: AppList) {
		editingProject = project;
		lists.clearMutationError();
		projectEditorOpen = true;
	}

	function toggleHiddenProject(projectId: number) {
		projectPreferences.toggleHidden(allActiveLists, projectId);
	}

	function getOpenTaskCount(listId: number) {
		return countOpenTasksForProjectTree($tasks.items, getDescendantProjectIds(allActiveLists, listId));
	}

	function getNestedEntries(node: ProjectTreeNode) {
		return flattenProjectTree(node.children, 1);
	}

	function getProjectHashStyle(color: string | null) {
		if (!color) {
			return undefined;
		}

		return `color: color-mix(in srgb, ${color} 62%, rgb(68 64 60));`;
	}
</script>

<section class="mx-auto flex w-full max-w-[44rem] flex-col gap-4 sm:gap-5">
	<div class="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
		<div class="space-y-0.5">
			<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
				Projects
			</h1>
			<p class="text-sm text-muted-foreground">
				Browse every Vikunja project and drill into nested work.
			</p>
		</div>

		{#if configured}
			<div class="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row sm:items-center">
				<Button variant="outline" size="sm" onclick={openCreateProject}>
					<Plus class="size-3.5" />
					Add Project
				</Button>

				<Button
					variant="outline"
					size="sm"
					class="hidden sm:inline-flex"
					aria-label={$tasks.loading || $lists.loading ? 'Refreshing projects' : 'Refresh projects'}
					onclick={handleRefresh}
					disabled={$tasks.loading || $lists.loading}
				>
					<RefreshCcw class="size-3.5" />
					{$tasks.loading || $lists.loading ? 'Refreshing…' : 'Refresh'}
				</Button>
			</div>
		{/if}
	</div>

	{#if !configured}
		<div class="rounded-[1.6rem] border border-border/70 bg-white/70 p-4 shadow-sm">
			<div class="flex items-start gap-3">
				<span class="rounded-xl bg-muted p-2 text-muted-foreground">
					<Settings2 class="size-4" />
				</span>

				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium text-foreground">Troth is not connected to Vikunja yet.</p>
					<p class="text-sm text-muted-foreground">
						Connect Troth to Vikunja in Settings before loading projects.
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
				<div class="h-28 rounded-[1.7rem] border border-border/60 bg-white/55"></div>
			{/each}
		</div>
	{:else if allActiveLists.length === 0}
		<div class="rounded-[1.75rem] border border-border/65 bg-white/56 px-6 py-12 shadow-sm">
			<div class="space-y-2 text-center sm:text-left">
				<p class="text-sm font-medium text-foreground">No projects yet</p>
				<p class="text-sm text-muted-foreground">
					Create a root project or nested project to start shaping your workspace.
				</p>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<div
				class="flex items-center gap-2 px-2 text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
			>
				<Layers3 class="size-3.5" />
				All Projects
			</div>

			<div class="space-y-1">
				{#each projectTree as node (node.list.id)}
					{@const openTaskCount = getOpenTaskCount(node.list.id)}
					{@const nestedEntries = getNestedEntries(node)}
					<div class="space-y-1">
						<div
							class="flex items-start justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/72"
						>
							<div class="min-w-0 space-y-1">
								<div class="flex items-center gap-2">
									<span
										class="flex size-6 shrink-0 items-center justify-center rounded-lg text-stone-500"
										style={getProjectHashStyle(node.list.color)}
									>
										<Hash class="size-3.5" />
									</span>
									<a
										href={resolve(`/projects/${node.list.id}`)}
										class="truncate text-sm font-semibold text-foreground hover:underline"
									>
										{node.list.title}
									</a>
								</div>

								{#if node.list.description}
									<p class="text-sm leading-6 text-muted-foreground">{node.list.description}</p>
								{/if}
							</div>

							<div class="flex shrink-0 items-center justify-end gap-1">
								<span class="min-w-4 text-right text-xs text-stone-500">{openTaskCount}</span>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-muted-foreground hover:text-foreground"
									aria-label={`Hide ${node.list.title}`}
									onclick={() => {
										toggleHiddenProject(node.list.id);
									}}
								>
									<EyeOff class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-muted-foreground hover:text-foreground"
									aria-label={`Edit ${node.list.title}`}
									onclick={() => {
										openEditProject(node.list);
									}}
								>
									<PencilLine class="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive/80 hover:bg-destructive/8 hover:text-destructive"
									aria-label={`Delete ${node.list.title}`}
									disabled={$lists.mutatingIds.includes(node.list.id)}
									onclick={() => {
										void handleDeleteProject(node.list);
									}}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						</div>

						{#if nestedEntries.length > 0}
							<div class="space-y-1">
								{#each nestedEntries as entry (entry.list.id)}
									{@const entryOpenTaskCount = getOpenTaskCount(entry.list.id)}
									<div
										class="flex items-center justify-between gap-3 rounded-xl py-2 pr-3 text-sm text-muted-foreground transition hover:bg-white/68 hover:text-foreground"
										style={`padding-left: ${entry.depth * 1.1 + 1.25}rem;`}
									>
										<a
											href={resolve(`/projects/${entry.list.id}`)}
											class="flex min-w-0 flex-1 items-center gap-2"
										>
											<span
												class="flex size-6 shrink-0 items-center justify-center rounded-lg text-stone-500"
												style={getProjectHashStyle(entry.list.color)}
											>
												<Hash class="size-3.5" />
											</span>
											<span class="truncate">{entry.list.title}</span>
										</a>
										<span class="flex shrink-0 items-center justify-end gap-1">
											<span class="min-w-4 text-right text-xs text-stone-500"
												>{entryOpenTaskCount}</span
											>
											<button
												type="button"
												class="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-foreground"
												aria-label={`Hide ${entry.list.title}`}
												onclick={(event) => {
													event.preventDefault();
													event.stopPropagation();
													toggleHiddenProject(entry.list.id);
												}}
											>
												<EyeOff class="size-4" />
											</button>
											<button
												type="button"
												class="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-foreground"
												aria-label={`Edit ${entry.list.title}`}
												onclick={(event) => {
													event.preventDefault();
													event.stopPropagation();
													openEditProject(entry.list);
												}}
											>
												<PencilLine class="size-4" />
											</button>
											<button
												type="button"
												class="inline-flex size-7 items-center justify-center rounded-md text-destructive/70 transition hover:bg-destructive/8 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
												aria-label={`Delete ${entry.list.title}`}
												disabled={$lists.mutatingIds.includes(entry.list.id)}
												onclick={(event) => {
													event.preventDefault();
													event.stopPropagation();
													void handleDeleteProject(entry.list);
												}}
											>
												<Trash2 class="size-4" />
											</button>
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if hiddenLists.length > 0}
				<div class="pt-4">
					<div
						class="flex items-center gap-2 px-2 text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					>
						<Eye class="size-3.5" />
						Hidden Projects
					</div>

					<div class="mt-2 space-y-1">
						{#each hiddenLists as project (project.id)}
							{@const openTaskCount = getOpenTaskCount(project.id)}
							<div
								class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/68 hover:text-foreground"
							>
								<div class="flex min-w-0 flex-1 items-center gap-2">
									<span
										class="flex size-6 shrink-0 items-center justify-center rounded-lg text-stone-500"
										style={getProjectHashStyle(project.color)}
									>
										<Hash class="size-3.5" />
									</span>
									<span class="truncate">{project.title}</span>
								</div>

								<div class="flex shrink-0 items-center gap-1">
									<span class="min-w-4 text-right text-xs text-stone-500">{openTaskCount}</span>
									<button
										type="button"
										class="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-foreground"
										aria-label={`Show ${project.title}`}
										onclick={() => {
											toggleHiddenProject(project.id);
										}}
									>
										<Eye class="size-4" />
									</button>
									<button
										type="button"
										class="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-foreground"
										aria-label={`Edit ${project.title}`}
										onclick={() => {
											openEditProject(project);
										}}
									>
										<PencilLine class="size-4" />
									</button>
									<button
										type="button"
										class="inline-flex size-7 items-center justify-center rounded-md text-destructive/70 transition hover:bg-destructive/8 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
										aria-label={`Delete ${project.title}`}
										disabled={$lists.mutatingIds.includes(project.id)}
										onclick={() => {
											void handleDeleteProject(project);
										}}
									>
										<Trash2 class="size-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</section>

<ProjectEditor
	open={projectEditorOpen}
	mode={editingProject ? 'edit' : 'create'}
	project={editingProject}
	lists={allActiveLists}
	busy={editingProject ? $lists.mutatingIds.includes(editingProject.id) : $lists.creating}
	error={$lists.mutationError}
	onClose={() => {
		projectEditorOpen = false;
		editingProject = null;
		lists.clearMutationError();
	}}
	onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
/>
