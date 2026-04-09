<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Eye,
		EyeOff,
		Filter,
		Hash,
		X
	} from '@lucide/svelte';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { savedFilters } from '$lib/stores/saved-filters';
	import { tasks } from '$lib/stores/tasks';
	import {
		buildProjectTree,
		getEffectiveHiddenProjectIds,
		type ProjectTreeNode
	} from '$lib/lists/tree';
	import { filterTasksForView } from '$lib/tasks/view';
	import { appRoutes } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { theme } from '$lib/stores/theme';
	import { cn } from '$lib/utils';

	type SidebarProjectEntry = {
		list: ProjectTreeNode['list'];
		depth: number;
		hasChildren: boolean;
		collapsed: boolean;
	};

	type RouteGroup = {
		key: 'focus' | 'plan';
		label: string;
		items: typeof appRoutes;
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

	const compact = $derived(!mobile && $projectPreferences.sidebarCollapsed);

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
	const routeGroups: RouteGroup[] = [
		{
			key: 'focus' as const,
			label: 'Focus',
			items: primaryRoutes.filter((item) => item.href === '/today')
		},
		{
			key: 'plan' as const,
			label: 'Plan',
			items: primaryRoutes.filter((item) => ['/upcoming', '/inbox', '/active'].includes(item.href))
		}
	].filter((group) => group.items.length > 0);
	const completedRoute = primaryRoutes.find((item) => item.href === '/completed');
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
	const inboxTaskCount = $derived(
		filterTasksForView('inbox', $tasks.items, visibleProjectLists).length
	);
	const browseSectionVisible = $derived(
		Boolean(
			completedRoute ||
			($connection.settings && savedFilterEntries.length > 0) ||
			(projectsRoute && ProjectsIcon)
		)
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

<aside
	class={cn(
		'flex h-full min-h-0 flex-col overflow-hidden px-1.5 py-1 text-sidebar-foreground',
		compact ? 'items-center' : '',
		className
	)}
>
	<div
		class={cn('flex items-center justify-between gap-2 px-2 py-0.5', compact ? 'w-full px-0' : '')}
	>
		<div class={cn('flex min-w-0 items-center gap-1', compact ? 'justify-center' : '')}>
			<img
				src={$theme.resolved === 'dark' ? '/favicon-dark.svg?v=3' : '/favicon.svg?v=3'}
				alt="Troth logo"
				class="size-10 shrink-0 object-contain"
			/>
			<div class={cn('min-w-0 -translate-y-1', compact ? 'sr-only' : '')}>
				<p class="truncate text-sm font-semibold">Troth</p>
			</div>
		</div>

		{#if mobile}
			<Button variant="ghost" size="icon-sm" onclick={onSelect} aria-label="Close navigation">
				<X class="size-4" />
			</Button>
		{:else}
			<Button
				variant="ghost"
				size="icon-sm"
				class={cn(compact ? 'mx-auto' : '')}
				onclick={() => {
					projectPreferences.toggleSidebarCollapsed();
				}}
				aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
			>
				{#if compact}
					<ChevronRight class="size-4" />
				{:else}
					<ChevronLeft class="size-4" />
				{/if}
			</Button>
		{/if}
	</div>

	<Separator class="my-1 opacity-50" />

	<nav aria-label="Primary" class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
		{#each routeGroups as group, index (group.label)}
			{#if !compact}
				{#if index > 0}
					<Separator class="my-2 opacity-40" />
				{/if}
				<div
					class="flex w-full items-center gap-2 px-2.5 pb-1 text-[0.72rem] font-medium text-muted-foreground/80"
				>
					<span>{group.label}</span>
				</div>
			{/if}

			<div class="space-y-1">
				{#each group.items as item (item.href)}
					{@const Icon = item.icon}
					<a
						href={resolve(item.href)}
						onclick={onSelect}
						aria-label={compact ? item.label : undefined}
						title={compact ? item.label : undefined}
						class={cn(
							'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
							compact ? 'justify-center px-0' : '',
							isActive(item.href)
								? 'bg-primary/10 text-foreground'
								: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
						)}
					>
						<span
							class={cn(
								'rounded-lg p-1.5 transition-colors',
								isActive(item.href)
									? 'text-foreground'
									: 'text-muted-foreground group-hover:text-foreground'
							)}
						>
							<Icon class="size-4" />
						</span>

						{#if !compact}
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
							{#if item.href === '/inbox' && inboxTaskCount > 0}
								<span
									class={cn(
										'ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums',
										isActive(item.href)
											? 'bg-primary/12 text-foreground'
											: 'bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground'
									)}
								>
									{inboxTaskCount}
								</span>
							{/if}
						{/if}
					</a>
				{/each}
			</div>
		{/each}

		{#if !compact && browseSectionVisible}
			<Separator class="my-2 opacity-40" />
			<button
				type="button"
				class="flex w-full items-center justify-between gap-2 px-2.5 pb-1 text-[0.72rem] font-medium text-muted-foreground/80 transition hover:text-foreground"
				aria-label={$projectPreferences.browseSectionExpanded ? 'Collapse Browse' : 'Expand Browse'}
				onclick={() => {
					projectPreferences.toggleSidebarSection('browse');
				}}
			>
				<span>Browse</span>
				{#if $projectPreferences.browseSectionExpanded}
					<ChevronDown class="size-3.5" />
				{:else}
					<ChevronRight class="size-3.5" />
				{/if}
			</button>
		{/if}

		{#if completedRoute && (compact || $projectPreferences.browseSectionExpanded)}
			{@const Icon = completedRoute.icon}
			<a
				href={resolve(completedRoute.href)}
				onclick={onSelect}
				aria-label={compact ? completedRoute.label : undefined}
				title={compact ? completedRoute.label : undefined}
				class={cn(
					'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
					compact ? 'justify-center px-0' : '',
					isActive(completedRoute.href)
						? 'bg-primary/10 text-foreground'
						: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
				)}
			>
				<span
					class={cn(
						'rounded-lg p-1.5 transition-colors',
						isActive(completedRoute.href)
							? 'text-foreground'
							: 'text-muted-foreground group-hover:text-foreground'
					)}
				>
					<Icon class="size-4" />
				</span>

				{#if !compact}
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{completedRoute.label}</span>
				{/if}
			</a>
		{/if}

		{#if !compact && (compact || $projectPreferences.browseSectionExpanded) && $connection.settings && savedFilterEntries.length > 0}
			<div>
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
									active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
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

		{#if projectsRoute && ProjectsIcon && (compact || $projectPreferences.browseSectionExpanded)}
			<div
				class={cn(!compact && $connection.settings && savedFilterEntries.length > 0 ? 'pt-2' : '')}
			>
				<div
					class={cn(
						'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
						compact ? 'justify-center px-0' : '',
						isExactActive(projectsRoute.href)
							? 'bg-primary/10 text-foreground'
							: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
					)}
				>
					<a
						href={resolve(projectsRoute.href)}
						onclick={onSelect}
						aria-label={compact ? projectsRoute.label : undefined}
						title={compact ? projectsRoute.label : undefined}
						class={cn('flex items-center gap-3', compact ? '' : 'min-w-0 flex-1')}
					>
						<span
							class={cn(
								'rounded-lg p-1.5 transition-colors',
								isExactActive(projectsRoute.href)
									? 'text-foreground'
									: 'text-muted-foreground group-hover:text-foreground'
							)}
						>
							<ProjectsIcon class="size-4" />
						</span>

						{#if !compact}
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{projectsRoute.label}</span>
						{/if}
					</a>
				</div>

				{#if !compact && $connection.settings && projectEntries.length > 0}
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
												(active ? 'text-foreground' : 'text-stone-400 group-hover:text-foreground')
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
										class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 hover:bg-white/80 hover:text-foreground dark:hover:bg-white/8"
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
											class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/80 hover:text-foreground dark:hover:bg-white/8"
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

				{#if !compact && hiddenProjects.length > 0}
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
									class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition group-hover:opacity-100 hover:bg-white/80 hover:text-foreground dark:hover:bg-white/8"
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
		<div class="shrink-0 pt-2">
			<Separator class="mb-2 opacity-50" />
			<a
				href={resolve(settingsRoute.href)}
				onclick={onSelect}
				aria-label={compact ? settingsRoute.label : undefined}
				title={compact ? settingsRoute.label : undefined}
				class={cn(
					'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
					compact ? 'justify-center px-0' : '',
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
				{#if !compact}
					<span class="min-w-0 flex-1 truncate text-sm font-medium">{settingsRoute.label}</span>
				{/if}
			</a>
		</div>
	{/if}
</aside>
