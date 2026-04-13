<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		CircleHelp,
		Eye,
		EyeOff,
		Filter,
		Hash,
		Plus,
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
	import TaskComposer from '$lib/components/tasks/TaskComposer.svelte';
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
		hidePrimaryRoutes = false,
		browseSectionCollapsible = true,
		supportHref,
		showHeaderAction = true,
		onSelect
	}: {
		class?: string;
		mobile?: boolean;
		hidePrimaryRoutes?: boolean;
		browseSectionCollapsible?: boolean;
		supportHref?: '/support';
		showHeaderAction?: boolean;
		onSelect?: () => void;
	} = $props();

	let desktopTaskComposerOpen = $state(false);

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
	const currentProjectId = $derived.by(() => {
		const match = page.url.pathname.match(/^\/projects\/(\d+)/);

		if (!match) {
			return null;
		}

		const parsedId = Number.parseInt(match[1] ?? '', 10);
		return Number.isNaN(parsedId) ? null : parsedId;
	});
	const currentProject = $derived(
		currentProjectId === null
			? null
			: (allProjectLists.find((list) => list.id === currentProjectId) ?? null)
	);
	const inboxList = $derived(
		allProjectLists.find((list) => list.title.trim().toLowerCase() === 'inbox') ?? null
	);
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
	const desktopComposerFixedListId = $derived.by(() => {
		if (page.url.pathname === '/inbox') {
			return inboxList?.id ?? null;
		}

		if (page.url.pathname.startsWith('/projects/')) {
			return currentProject?.id ?? null;
		}

		return null;
	});
	const desktopComposerDefaultListId = $derived(
		desktopComposerFixedListId ?? inboxList?.id ?? allProjectLists[0]?.id ?? null
	);
	const desktopComposerPlaceholder = 'Add a task';
	const desktopComposerDisabledMessage = $derived(
		page.url.pathname === '/inbox' && !inboxList
			? 'Create a project named Inbox in Vikunja to use this view.'
			: 'Add a project in Vikunja before creating tasks.'
	);
	const browseSectionVisible = $derived(
		Boolean(completedRoute || $connection.settings || (projectsRoute && ProjectsIcon))
	);
	const browseSectionExpanded = $derived(
		browseSectionCollapsible ? $projectPreferences.browseSectionExpanded : true
	);
	const projectsSectionExpanded = $derived(
		compact ? false : $projectPreferences.projectsSectionExpanded
	);
	const savedFiltersSectionExpanded = $derived(
		compact ? false : $projectPreferences.savedFiltersSectionExpanded
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

	$effect(() => {
		if (page.url.pathname) {
			desktopTaskComposerOpen = false;
		}
	});

	$effect(() => {
		if (mobile || !desktopTaskComposerOpen) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				desktopTaskComposerOpen = false;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (mobile || !desktopTaskComposerOpen) {
			return;
		}

		const { documentElement, body } = document;
		const previousHtmlOverflow = documentElement.style.overflow;
		const previousBodyOverflow = body.style.overflow;
		const previousOverscroll = body.style.overscrollBehavior;

		documentElement.style.overflow = 'hidden';
		body.style.overflow = 'hidden';
		body.style.overscrollBehavior = 'none';

		return () => {
			documentElement.style.overflow = previousHtmlOverflow;
			body.style.overflow = previousBodyOverflow;
			body.style.overscrollBehavior = previousOverscroll;
		};
	});

	$effect(() => {
		if (mobile || desktopTaskComposerOpen) {
			return;
		}

		function handleQuickAddShortcut(event: KeyboardEvent) {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			if (event.key.toLowerCase() !== 'n') {
				return;
			}

			const activeElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;

			if (
				activeElement &&
				(activeElement.isContentEditable ||
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement ||
					activeElement instanceof HTMLSelectElement)
			) {
				return;
			}

			event.preventDefault();
			desktopTaskComposerOpen = true;
		}

		document.addEventListener('keydown', handleQuickAddShortcut);

		return () => {
			document.removeEventListener('keydown', handleQuickAddShortcut);
		};
	});

	async function handleDesktopQuickAdd(input: {
		title: string;
		listId: number;
		dueDate?: string | null;
		priority?: number;
		parentTaskId?: number | null;
	}) {
		const createdTask = await tasks.createTask(input);

		if (createdTask) {
			desktopTaskComposerOpen = false;
		}

		return Boolean(createdTask);
	}
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

		{#if showHeaderAction}
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
		{/if}
	</div>

	<Separator class="my-1 opacity-50" />

	<nav aria-label="Primary" class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
		{#if !mobile}
			<div class={cn('pb-1', compact ? 'flex justify-center' : '')}>
				{#if compact}
					<Button
						variant="ghost"
						size="icon"
						class="task-accent-fill size-10 rounded-xl bg-primary text-primary-foreground shadow-[0_14px_28px_rgba(60,93,78,0.22)] hover:bg-primary/92"
						aria-label="Add task"
						title="Add task"
						onclick={() => {
							desktopTaskComposerOpen = true;
						}}
					>
						<Plus class="size-4" />
					</Button>
				{:else}
					<button
						type="button"
						class="group flex w-full items-center gap-3 rounded-xl bg-background/70 px-2.5 py-2 text-left text-foreground transition hover:bg-muted/45"
						onclick={() => {
							desktopTaskComposerOpen = true;
						}}
					>
						<span
							class="task-accent-fill rounded-lg bg-primary p-1.5 text-primary-foreground shadow-[0_10px_20px_rgba(60,93,78,0.18)] transition group-hover:scale-[1.03] group-hover:bg-primary/92"
						>
							<Plus class="size-4" />
						</span>
						<span class="min-w-0 flex-1 truncate text-sm font-medium">Add task</span>
						<kbd
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border/70 bg-background px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] dark:border-white/12 dark:bg-white/6 dark:shadow-none"
						>
							N
						</kbd>
					</button>
				{/if}
			</div>
		{/if}

		{#if !hidePrimaryRoutes}
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
		{/if}

		{#if !compact && browseSectionVisible && browseSectionCollapsible}
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

		{#if completedRoute && (compact || browseSectionExpanded)}
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

		{#if $connection.settings && (compact || browseSectionExpanded)}
			<div>
				<div
					class={cn(
						'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
						compact ? 'justify-center px-0' : '',
						isExactActive('/saved-filters')
							? 'bg-primary/10 text-foreground'
							: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
					)}
				>
					<a
						href={resolve('/saved-filters')}
						onclick={onSelect}
						aria-label={compact ? 'Saved Filters' : undefined}
						title={compact ? 'Saved Filters' : undefined}
						class={cn('flex items-center gap-3', compact ? '' : 'min-w-0 flex-1')}
					>
						<span
							class={cn(
								'rounded-lg p-1.5 transition-colors',
								isExactActive('/saved-filters')
									? 'text-foreground'
									: 'text-muted-foreground group-hover:text-foreground'
							)}
						>
							<Filter class="size-4" />
						</span>

						{#if !compact}
							<span class="min-w-0 flex-1 truncate text-sm font-medium">Saved Filters</span>
						{/if}
					</a>

					{#if !compact && savedFilterEntries.length > 0}
						<button
							type="button"
							class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/80 hover:text-foreground dark:hover:bg-white/8"
							aria-label={$projectPreferences.savedFiltersSectionExpanded
								? 'Collapse Saved Filters'
								: 'Expand Saved Filters'}
							onclick={(event) => {
								stopEvent(event);
								projectPreferences.toggleSidebarSection('saved-filters');
							}}
						>
							{#if $projectPreferences.savedFiltersSectionExpanded}
								<ChevronDown class="size-3.5" />
							{:else}
								<ChevronRight class="size-3.5" />
							{/if}
						</button>
					{/if}
				</div>

				{#if !compact && savedFiltersSectionExpanded && savedFilterEntries.length > 0}
					<div class="mt-2 space-y-1" aria-label="Saved filters">
						{#each savedFilterEntries as entry (entry.id)}
							{@const active = isActive(`/saved-filters/${entry.id}`)}
							<a
								href={resolve(`/saved-filters/${entry.id}`)}
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
				{/if}
			</div>
		{/if}

		{#if projectsRoute && ProjectsIcon && (compact || browseSectionExpanded)}
			<div class={cn(!compact && $connection.settings ? 'pt-2' : '')}>
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

					{#if !compact && $connection.settings && projectEntries.length > 0}
						<button
							type="button"
							class="inline-flex size-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white/80 hover:text-foreground dark:hover:bg-white/8"
							aria-label={$projectPreferences.projectsSectionExpanded
								? 'Collapse Projects'
								: 'Expand Projects'}
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
					{/if}
				</div>

				{#if !compact && $connection.settings && projectsSectionExpanded && projectEntries.length > 0}
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

				{#if !compact && projectsSectionExpanded && hiddenProjects.length > 0}
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
			{#if supportHref}
				<a
					href={resolve(supportHref)}
					onclick={onSelect}
					class={cn(
						'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
						compact ? 'justify-center px-0' : '',
						isActive(supportHref)
							? 'bg-primary/10 text-foreground'
							: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
					)}
				>
					<span
						class={cn(
							'rounded-lg p-1.5 transition-colors',
							isActive(supportHref)
								? 'bg-primary/12 text-foreground'
								: 'text-muted-foreground group-hover:text-foreground'
						)}
					>
						<CircleHelp class="size-4" />
					</span>
					{#if !compact}
						<span class="min-w-0 flex-1 truncate text-sm font-medium">Support</span>
					{/if}
				</a>
			{/if}
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

{#if !mobile && desktopTaskComposerOpen}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-stone-950/28 backdrop-blur-[3px]"
		aria-label="Close add task dialog"
		onclick={() => {
			desktopTaskComposerOpen = false;
		}}
	></button>

	<dialog
		open
		aria-label="Add task"
		class="fixed inset-x-3 bottom-3 z-[60] max-h-[calc(100vh-1.5rem)] w-auto overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-4 shadow-2xl sm:inset-x-6 lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-1/2 lg:w-[calc(100vw-1.5rem)] lg:max-w-[52rem] lg:-translate-x-1/2 lg:-translate-y-1/2"
	>
		<div class="space-y-4">
			<TaskComposer
				lists={allProjectLists}
				busy={$tasks.creating}
				error={$tasks.mutationError}
				fixedListId={desktopComposerFixedListId}
				defaultListId={desktopComposerDefaultListId}
				defaultDueDate={page.url.pathname === '/inbox' ? null : undefined}
				autoFocus
				placeholder={desktopComposerPlaceholder}
				disabledMessage={desktopComposerDisabledMessage}
				onCollapse={() => {
					desktopTaskComposerOpen = false;
				}}
				onSubmit={handleDesktopQuickAdd}
			/>
		</div>
	</dialog>
{/if}
