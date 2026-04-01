<script lang="ts">
	import { resolve } from '$app/paths';
	import { page, navigating } from '$app/state';
	import { CircleHelp, Ellipsis, LoaderCircle, Plus, X } from '@lucide/svelte';
	import { findInboxList } from '$lib/tasks/view';
	import { getRouteMeta, appRoutes } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Toaster } from '$lib/components/ui/toast';
	import AppSidebar from '$lib/components/app/app-sidebar.svelte';
	import TaskComposer from '$lib/components/tasks/TaskComposer.svelte';
	import { lists } from '$lib/stores/lists';
	import { projectPreferences } from '$lib/stores/project-preferences';
	import { tasks } from '$lib/stores/tasks';
	import { getEffectiveHiddenProjectIds } from '$lib/lists/tree';
	import { cn } from '$lib/utils';

	let { children } = $props();

	let mobileMoreOpen = $state(false);
	let mobileTaskComposerOpen = $state(false);
	let helpOpen = $state(false);

	const activeRoute = $derived(getRouteMeta(page.url.pathname));
	const showProgress = $derived(Boolean(navigating.to));
	const mobilePrimaryRoutes = appRoutes.filter((route) =>
		['/today', '/inbox', '/upcoming'].includes(route.href)
	);
	const allActiveLists = $derived($lists.items.filter((list) => !list.isArchived));
	const hiddenProjectIds = $derived(
		getEffectiveHiddenProjectIds(allActiveLists, $projectPreferences.hiddenProjectIds)
	);
	const activeLists = $derived(allActiveLists.filter((list) => !hiddenProjectIds.has(list.id)));
	const inboxList = $derived(findInboxList(activeLists));
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
			: (activeLists.find((list) => list.id === currentProjectId) ?? null)
	);
	const mobileMoreActive = $derived.by(() => {
		const href = activeRoute?.href;
		return page.url.pathname.startsWith('/filters/')
			? true
			: Boolean(href && !mobilePrimaryRoutes.some((route) => route.href === href));
	});
	const mobileComposerFixedListId = $derived.by(() => {
		if (page.url.pathname === '/inbox') {
			return inboxList?.id ?? null;
		}

		if (page.url.pathname.startsWith('/projects/')) {
			return currentProject?.id ?? null;
		}

		return null;
	});
	const mobileComposerDefaultListId = $derived(
		mobileComposerFixedListId ?? inboxList?.id ?? activeLists[0]?.id ?? null
	);
	const mobileComposerPlaceholder = $derived.by(() => {
		if (page.url.pathname === '/inbox') {
			return 'Add to Inbox';
		}

		if (currentProject) {
			return `Add to ${currentProject.title}`;
		}

		return 'Add a task';
	});
	const mobileComposerDisabledMessage = $derived(
		page.url.pathname === '/inbox' && !inboxList
			? 'Create a project named Inbox in Vikunja to use this view.'
			: 'Add a project in Vikunja before creating tasks.'
	);

	$effect(() => {
		if (page.url.pathname) {
			mobileMoreOpen = false;
			mobileTaskComposerOpen = false;
		}
	});

	$effect(() => {
		if (!mobileMoreOpen) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				mobileMoreOpen = false;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (!mobileTaskComposerOpen) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				mobileTaskComposerOpen = false;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		if (!helpOpen) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				helpOpen = false;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	async function handleMobileQuickAdd(input: {
		title: string;
		listId: number;
		dueDate?: string | null;
		priority?: number;
		parentTaskId?: number | null;
	}) {
		const createdTask = await tasks.createTask(input);

		if (createdTask) {
			mobileTaskComposerOpen = false;
		}

		return Boolean(createdTask);
	}
</script>

<div class="min-h-screen bg-background">
	{#if showProgress}
		<div class="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
			<div class="h-full w-1/3 animate-pulse rounded-r-full bg-primary/55"></div>
		</div>
	{/if}

	<div
		class={cn(
			'mx-auto flex min-h-screen max-w-[86rem] gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:grid lg:justify-center lg:px-6',
			$projectPreferences.sidebarCollapsed
				? 'lg:grid-cols-[4.75rem_minmax(0,44rem)] lg:gap-5'
				: 'lg:grid-cols-[14.5rem_minmax(0,44rem)] lg:gap-8'
		)}
	>
		<AppSidebar class="hidden lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-1.5rem)] lg:self-start" />

		<div class="flex min-w-0 flex-1 flex-col">
			<main
				id="app-main"
				class={cn('flex-1 px-1 py-1.5 pb-28 sm:px-2 sm:py-2.5 sm:pb-32 lg:px-0 lg:py-4 lg:pb-6')}
			>
				{@render children()}
			</main>
		</div>
	</div>

	<Toaster />

	{#if mobileMoreOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
			onclick={() => {
				mobileMoreOpen = false;
			}}
			aria-label="Close navigation menu"
		></button>

		<div
			id="mobile-more-sheet"
			class="fixed inset-x-3 bottom-24 z-50 max-h-[min(70vh,38rem)] lg:hidden"
		>
			<AppSidebar
				mobile
				class="h-full rounded-[1.8rem] border border-border/70 bg-background/96 shadow-2xl backdrop-blur"
				onSelect={() => {
					mobileMoreOpen = false;
				}}
			/>
		</div>
	{/if}

	{#if mobileTaskComposerOpen}
		<button
			type="button"
			class="fixed inset-0 z-50 bg-stone-950/28 backdrop-blur-[3px] lg:hidden"
			aria-label="Close add task modal"
			onclick={() => {
				mobileTaskComposerOpen = false;
			}}
		></button>

		<dialog
			open
			aria-labelledby="mobile-task-composer-title"
			class="fixed right-0 bottom-24 left-0 z-[60] m-0 h-auto max-h-[calc(100vh-7.5rem)] w-screen max-w-none overflow-y-auto rounded-t-[1.9rem] border border-border/70 bg-background/96 p-4 shadow-2xl backdrop-blur lg:hidden"
		>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p
						id="mobile-task-composer-title"
						class="text-base font-semibold tracking-[-0.01em] text-foreground"
					>
						New task
					</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">
						{mobileComposerPlaceholder}
					</p>
				</div>

				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Close add task modal"
					onclick={() => {
						mobileTaskComposerOpen = false;
					}}
				>
					<X class="size-4" />
				</Button>
			</div>

			<div class="mt-4">
				<TaskComposer
					lists={activeLists}
					busy={$tasks.creating}
					error={$tasks.mutationError}
					fixedListId={mobileComposerFixedListId}
					defaultListId={mobileComposerDefaultListId}
					defaultDueDate={page.url.pathname === '/inbox' ? null : undefined}
					autoFocus
					placeholder={mobileComposerPlaceholder}
					disabledMessage={mobileComposerDisabledMessage}
					onCollapse={() => {
						mobileTaskComposerOpen = false;
					}}
					onSubmit={handleMobileQuickAdd}
				/>
			</div>
		</dialog>
	{/if}

	<a
		href="#app-main"
		class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
	>
		Skip to main content
	</a>

	<button
		type="button"
		aria-label="Task input help"
		class="fixed right-4 bottom-24 z-40 inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/92 text-muted-foreground shadow-lg backdrop-blur transition hover:text-foreground focus-visible:border-primary/30 focus-visible:ring-3 focus-visible:ring-primary/10 sm:right-5 sm:bottom-5"
		onclick={() => {
			helpOpen = true;
		}}
	>
		<CircleHelp class="size-4" />
	</button>

	{#if helpOpen}
		<button
			type="button"
			class="fixed inset-0 z-50 bg-stone-950/28 backdrop-blur-[3px]"
			aria-label="Close task shortcut help"
			onclick={() => {
				helpOpen = false;
			}}
		></button>

		<dialog
			open
			aria-labelledby="task-shortcuts-title"
			class="fixed inset-x-4 top-1/2 z-[60] max-h-[calc(100vh-2rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-5 shadow-2xl backdrop-blur sm:right-auto sm:left-1/2 sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2"
		>
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0">
					<p
						id="task-shortcuts-title"
						class="text-base font-semibold tracking-[-0.01em] text-foreground"
					>
						Quick Add Formatting
					</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">
						Write metadata directly in the task title. As you type, suggestions appear at the cursor
						and can be completed with arrow keys plus <span
							class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
							>Enter</span
						>
						or
						<span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
							>Tab</span
						>.
					</p>
				</div>

				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Close help"
					onclick={() => {
						helpOpen = false;
					}}
				>
					×
				</Button>
			</div>

			<div class="mt-5 grid gap-3">
				<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Dates</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<span
							class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
							>today</span
						>
						<span
							class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
							>tomorrow</span
						>
						<span
							class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
							>monday</span
						>
						<span
							class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
							>fri</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>next week</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>next monday</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>25.03.2026</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>2026-03-25</span
						>
					</div>
				</div>

				<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
						Projects
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>#Inbox</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>#Work</span
						>
						<span
							class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
							>#Personal</span
						>
					</div>
					<p class="mt-3 text-sm leading-6 text-muted-foreground">
						Type <span class="font-medium text-foreground">#</span> and keep typing a project name or
						identifier.
					</p>
				</div>

				<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
						Priority
					</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<span
							class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
							>!low</span
						>
						<span
							class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
							>!medium</span
						>
						<span
							class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800"
							>!high</span
						>
						<span
							class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
							>!</span
						>
						<span
							class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
							>!!</span
						>
						<span
							class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800"
							>!!!</span
						>
					</div>
				</div>

				<div class="rounded-2xl border border-border/70 bg-white/70 p-4 dark:bg-white/7">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
						What Happens
					</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						When you choose a suggestion, the shortcut is removed from the title and applied to the
						task automatically.
					</p>
				</div>
			</div>
		</dialog>
	{/if}

	<nav aria-label="Mobile primary" class="fixed inset-x-3 bottom-3 z-40 lg:hidden">
		<div
			class="grid grid-cols-5 items-end rounded-[2rem] border border-border/70 bg-background/94 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] shadow-[0_18px_48px_rgba(24,24,27,0.12)] backdrop-blur"
		>
			{#each mobilePrimaryRoutes.slice(0, 2) as route (route.href)}
				{@const Icon = route.icon}
				<a
					href={resolve(route.href)}
					class={cn(
						'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-medium transition',
						activeRoute?.href === route.href
							? 'text-foreground'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-current={activeRoute?.href === route.href ? 'page' : undefined}
				>
					<span
						class={cn(
							'flex size-10 items-center justify-center rounded-2xl transition',
							activeRoute?.href === route.href
								? 'bg-primary/12 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]'
								: 'bg-transparent'
						)}
					>
						<Icon class="size-4.5" />
					</span>
					<span class="truncate">{route.label}</span>
				</a>
			{/each}

			<div class="flex justify-center px-1 pb-1">
				<button
					type="button"
					class="inline-flex size-14 -translate-y-3 items-center justify-center rounded-full border border-primary/20 bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(60,93,78,0.28)] transition hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-primary/15"
					aria-label="Add task"
					onclick={() => {
						mobileTaskComposerOpen = true;
					}}
				>
					<Plus class="size-6" />
				</button>
			</div>

			{#each mobilePrimaryRoutes.slice(2) as route (route.href)}
				{@const Icon = route.icon}
				<a
					href={resolve(route.href)}
					class={cn(
						'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-medium transition',
						activeRoute?.href === route.href
							? 'text-foreground'
							: 'text-muted-foreground hover:text-foreground'
					)}
					aria-current={activeRoute?.href === route.href ? 'page' : undefined}
				>
					<span
						class={cn(
							'flex size-10 items-center justify-center rounded-2xl transition',
							activeRoute?.href === route.href
								? 'bg-primary/12 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]'
								: 'bg-transparent'
						)}
					>
						<Icon class="size-4.5" />
					</span>
					<span class="truncate">{route.label}</span>
				</a>
			{/each}

			<button
				type="button"
				class={cn(
					'flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-medium transition',
					mobileMoreActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
				)}
				aria-expanded={mobileMoreOpen}
				aria-controls="mobile-more-sheet"
				onclick={() => {
					mobileMoreOpen = true;
				}}
			>
				<span
					class={cn(
						'flex size-10 items-center justify-center rounded-2xl transition',
						mobileMoreActive
							? 'bg-primary/12 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]'
							: 'bg-transparent'
					)}
				>
					{#if showProgress}
						<LoaderCircle class="size-4 animate-spin" />
					{:else}
						<Ellipsis class="size-4.5" />
					{/if}
				</span>
				<span class="truncate">More</span>
			</button>
		</div>
	</nav>
</div>
