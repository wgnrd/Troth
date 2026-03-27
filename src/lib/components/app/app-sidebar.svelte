<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ChevronDown, ChevronRight, Eye, EyeOff, Filter, Hash, X } from '@lucide/svelte';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { savedFilters } from '$lib/stores/saved-filters';
	import {
		buildProjectTree,
		getEffectiveHiddenProjectIds,
		type ProjectTreeNode
	} from '$lib/lists/tree';
	import { appRoutes } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';

	type SidebarProjectEntry = {
		list: ProjectTreeNode['list'];
		depth: number;
		hasChildren: boolean;
		collapsed: boolean;
	};

	let {
		class: className,
		mobile = false,
		onSelect
	}: {
		class?: string;
		mobile?: boolean;
		onSelect?: () => void;
	} = $props();

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	function isExactActive(href: string) {
		return page.url.pathname === href;
	}

	function getProjectIconStyle(color: string | null, active: boolean) {
		if (!color) {
			return undefined;
		}

		const textMix = active ? '70%' : '58%';

		return `color: color-mix(in srgb, ${color} ${textMix}, rgb(68 64 60));`;
	}

	function flattenSidebarTree(
		nodes: ProjectTreeNode[],
		expandedProjectIds: Set<number>,
		depth = 0
	): SidebarProjectEntry[] {
		return nodes.flatMap((node) => {
			const collapsed = node.children.length > 0 && !expandedProjectIds.has(node.list.id);
			const entry: SidebarProjectEntry = {
				list: node.list,
				depth,
				hasChildren: node.children.length > 0,
				collapsed
			};

			return [
				entry,
				...(collapsed ? [] : flattenSidebarTree(node.children, expandedProjectIds, depth + 1))
			];
		});
	}

	function stopEvent(event: Event) {
		event.preventDefault();
		event.stopPropagation();
	}

	const primaryRoutes = appRoutes.filter(
		(item) => item.href !== '/settings' && item.href !== '/projects'
	);
	const projectsRoute = appRoutes.find((item) => item.href === '/projects');
	const settingsRoute = appRoutes.find((item) => item.href === '/settings');
	const ProjectsIcon = projectsRoute?.icon;
	const SettingsIcon = settingsRoute?.icon;
	const savedFilterEntries = $derived($savedFilters.items);
	const allProjectLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allProjectLists, $projectPreferences.hiddenProjectIds)
	);
	const visibleProjectLists = $derived(
		allProjectLists.filter((list) => !hiddenProjectIds.has(list.id))
	);
	const projectEntries = $derived(
		flattenSidebarTree(
			buildProjectTree(visibleProjectLists),
			new Set($projectPreferences.expandedProjectIds)
		)
	);
	const hiddenProjects = $derived(
		$projectPreferences.hiddenProjectIds
			.map((projectId) => allProjectLists.find((list) => list.id === projectId) ?? null)
			.filter((list): list is (typeof allProjectLists)[number] => list !== null)
			.sort((left, right) => left.title.localeCompare(right.title))
	);

	$effect(() => {
		if (
			!$connection.settings ||
			($lists.loaded && $savedFilters.loaded) ||
			$lists.loading ||
			$savedFilters.loading
		) {
			return;
		}

		void Promise.all([lists.load(), savedFilters.load()]);
	});
</script>

<aside class={cn('flex h-full flex-col px-1.5 py-3 text-sidebar-foreground', className)}>
	<div class="flex items-center justify-between gap-3 px-2.5 py-2">
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">Troth</p>
		</div>

		{#if mobile}
			<Button variant="ghost" size="icon-sm" onclick={onSelect} aria-label="Close navigation">
				<X class="size-4" />
			</Button>
		{/if}
	</div>

	<Separator class="my-2 opacity-50" />

	<nav aria-label="Primary" class="flex flex-1 flex-col gap-1">
		{#each primaryRoutes as item (item.href)}
			{@const Icon = item.icon}
			<a
				href={resolve(item.href)}
				onclick={onSelect}
				class={cn(
					'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
					isActive(item.href)
						? 'bg-primary/10 text-foreground'
						: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
				)}
			>
				<span
					class={cn(
						'rounded-lg p-1.5 transition-colors',
						isActive(item.href)
							? 'bg-primary/12 text-foreground'
							: 'text-muted-foreground group-hover:text-foreground'
					)}
				>
					<Icon class="size-4" />
				</span>

				<span class="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
			</a>
		{/each}

		{#if $connection.settings && savedFilterEntries.length > 0}
			<div class="pt-2">
				<Separator class="mb-2 opacity-50" />
				<p class="px-2.5 text-[0.72rem] font-medium text-muted-foreground/80">Saved Filters</p>

				<div class="mt-2 space-y-1" aria-label="Saved filters">
					{#each savedFilterEntries as entry (entry.id)}
						{@const active = isActive(`/filters/${entry.id}`)}
						<a
							href={resolve(`/filters/${entry.id}`)}
							onclick={onSelect}
							class={cn(
								'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[0.82rem] transition-colors',
								active
									? 'bg-primary/8 text-foreground'
									: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
							)}
						>
							<span
								class={cn(
									'rounded-lg p-1.5 transition-colors',
									active
										? 'bg-primary/12 text-foreground'
										: 'text-muted-foreground group-hover:text-foreground'
								)}
							>
								<Filter class="size-3.5" />
							</span>
							<span class="min-w-0 flex-1 truncate font-medium">{entry.title}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		{#if projectsRoute && ProjectsIcon}
			<div class="pt-2">
				<Separator class="mb-2 opacity-50" />

				<div
					class={cn(
						'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
						isExactActive(projectsRoute.href)
							? 'bg-primary/10 text-foreground'
							: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
					)}
				>
					<a
						href={resolve(projectsRoute.href)}
						onclick={onSelect}
						class="flex min-w-0 flex-1 items-center gap-3"
					>
						<span
							class={cn(
								'rounded-lg p-1.5 transition-colors',
								isExactActive(projectsRoute.href)
									? 'bg-primary/12 text-foreground'
									: 'text-muted-foreground group-hover:text-foreground'
							)}
						>
							<ProjectsIcon class="size-4" />
						</span>

						<span class="min-w-0 flex-1 truncate text-sm font-medium">{projectsRoute.label}</span>
					</a>

					<button
						type="button"
						class="inline-flex size-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/80 hover:text-foreground"
						aria-label={$projectPreferences.projectsSectionExpanded
							? 'Collapse projects'
							: 'Expand projects'}
						onclick={(event) => {
							stopEvent(event);
							projectPreferences.toggleProjectsSection();
						}}
					>
						{#if $projectPreferences.projectsSectionExpanded}
							<ChevronDown class="size-3.5" />
						{:else}
							<ChevronRight class="size-3.5" />
						{/if}
					</button>
				</div>

				{#if $projectPreferences.projectsSectionExpanded && $connection.settings && projectEntries.length > 0}
					<div class="mt-2 space-y-1" aria-label="Projects">
						{#each projectEntries as entry (entry.list.id)}
							{@const active = isActive(`/projects/${entry.list.id}`)}
							<div
								class={cn(
									'group flex items-center gap-1.5 rounded-lg py-1 pr-1.5 text-[0.82rem] transition-colors',
									active
										? 'bg-primary/8 text-foreground'
										: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
								)}
								style={`padding-left: ${entry.depth * 0.68 + 0.75}rem;`}
							>
								<a
									href={resolve(`/projects/${entry.list.id}`)}
									onclick={onSelect}
									class="flex min-w-0 flex-1 items-center gap-1.5"
								>
									<span
										class={cn(
											'flex size-5 shrink-0 items-center justify-center rounded-md transition-colors',
											!entry.list.color &&
												(active
													? 'bg-primary/12 text-foreground'
													: 'text-stone-400 group-hover:text-foreground')
										)}
										style={getProjectIconStyle(entry.list.color, active)}
									>
										<Hash class="size-3" />
									</span>

									<span class="min-w-0 flex-1 truncate">{entry.list.title}</span>
								</a>

								<div class="flex items-center gap-0.5">
									<button
										type="button"
										class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 hover:bg-white/80 hover:text-foreground"
										aria-label={`Hide ${entry.list.title}`}
										onclick={(event) => {
											stopEvent(event);
											projectPreferences.toggleHidden(allProjectLists, entry.list.id);
										}}
									>
										<EyeOff class="size-3.5" />
									</button>

									{#if entry.hasChildren}
										<button
											type="button"
											class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/80 hover:text-foreground"
											aria-label={entry.collapsed
												? `Expand ${entry.list.title}`
												: `Collapse ${entry.list.title}`}
											onclick={(event) => {
												stopEvent(event);
												projectPreferences.toggleCollapsed(entry.list.id);
											}}
										>
											{#if entry.collapsed}
												<ChevronRight class="size-3.5" />
											{:else}
												<ChevronDown class="size-3.5" />
											{/if}
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if $projectPreferences.projectsSectionExpanded && hiddenProjects.length > 0}
					<div class="mt-3 space-y-1" aria-label="Hidden projects">
						<p class="pl-4 text-[0.72rem] font-medium text-muted-foreground/80">Hidden Projects</p>
						{#each hiddenProjects as project (project.id)}
							<div
								class="group flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 text-[0.82rem] text-muted-foreground hover:bg-muted/35 hover:text-foreground"
							>
								<span class="flex min-w-0 flex-1 items-center gap-1.5 pl-4">
									<span
										class="flex size-5 shrink-0 items-center justify-center rounded-md text-stone-400 group-hover:text-foreground"
										style={getProjectIconStyle(project.color, false)}
									>
										<Hash class="size-3" />
									</span>
									<span class="min-w-0 flex-1 truncate">{project.title}</span>
								</span>

								<button
									type="button"
									class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition group-hover:opacity-100 hover:bg-white/80 hover:text-foreground"
									aria-label={`Show ${project.title}`}
									onclick={() => {
										projectPreferences.toggleHidden(allProjectLists, project.id);
									}}
								>
									<Eye class="size-3.5" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</nav>

	{#if settingsRoute && SettingsIcon}
		<div class="pt-2">
			<Separator class="mb-2 opacity-50" />
			<a
				href={resolve(settingsRoute.href)}
				onclick={onSelect}
				class={cn(
					'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
					isActive(settingsRoute.href)
						? 'bg-primary/10 text-foreground'
						: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
				)}
			>
				<span
					class={cn(
						'rounded-lg p-1.5 transition-colors',
						isActive(settingsRoute.href)
							? 'bg-primary/12 text-foreground'
							: 'text-muted-foreground group-hover:text-foreground'
					)}
				>
					<SettingsIcon class="size-4" />
				</span>
				<span class="min-w-0 flex-1 truncate text-sm font-medium">{settingsRoute.label}</span>
			</a>
		</div>
	{/if}
</aside>
