<script lang="ts">
	import { page, navigating } from '$app/state';
	import { CircleHelp, LoaderCircle, Menu } from '@lucide/svelte';
	import { getRouteMeta } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import AppSidebar from '$lib/components/app/app-sidebar.svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();

	let mobileNavOpen = $state(false);
	let helpOpen = $state(false);

	const activeRoute = $derived(getRouteMeta(page.url.pathname));
	const showProgress = $derived(Boolean(navigating.to));

	$effect(() => {
		if (page.url.pathname) {
			mobileNavOpen = false;
		}
	});

	$effect(() => {
		if (!mobileNavOpen) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				mobileNavOpen = false;
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
</script>

<div
	class="min-h-screen bg-background"
>
	{#if showProgress}
		<div class="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
			<div class="h-full w-1/3 animate-pulse rounded-r-full bg-primary/55"></div>
		</div>
	{/if}

	<div
		class="mx-auto flex min-h-screen max-w-[86rem] gap-2 px-3 py-3 sm:px-4 sm:py-4 lg:grid lg:grid-cols-[14.5rem_minmax(0,44rem)_1fr] lg:gap-8 lg:px-6"
	>
		<AppSidebar class="hidden lg:flex" />

		<div class="flex min-w-0 flex-1 flex-col lg:col-start-2">
			<header
				class="sticky top-3 z-30 mb-3 flex items-center gap-3 rounded-2xl border border-border/50 bg-background/84 px-3 py-2.5 backdrop-blur lg:hidden"
			>
				<Button
					variant="outline"
					size="icon-sm"
					onclick={() => {
						mobileNavOpen = true;
					}}
					aria-label="Open navigation"
					aria-expanded={mobileNavOpen}
					aria-controls="mobile-navigation"
				>
					<Menu class="size-4" />
				</Button>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold">{activeRoute?.label ?? 'App'}</p>
				</div>

				{#if showProgress}
					<LoaderCircle class="size-4 animate-spin text-muted-foreground" />
				{/if}
			</header>

			<main id="app-main" class={cn('flex-1 px-1 py-2 sm:px-2 sm:py-3 lg:px-0 lg:py-6')}>
				{@render children()}
			</main>
		</div>
	</div>

	{#if mobileNavOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
			onclick={() => {
				mobileNavOpen = false;
			}}
			aria-label="Close navigation"
		></button>

		<div
			id="mobile-navigation"
			class="fixed inset-y-3 left-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] lg:hidden"
		>
			<AppSidebar
				mobile
				class="h-full"
				onSelect={() => {
					mobileNavOpen = false;
				}}
			/>
		</div>
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
		class="fixed right-4 bottom-4 z-40 inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-background/92 text-muted-foreground shadow-lg backdrop-blur transition hover:text-foreground focus-visible:border-primary/30 focus-visible:ring-3 focus-visible:ring-primary/10 sm:right-5 sm:bottom-5"
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
			class="fixed inset-x-4 top-1/2 z-[60] max-h-[calc(100vh-2rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-5 shadow-2xl backdrop-blur sm:left-1/2 sm:right-auto sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2"
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
						Write metadata directly in the task title. As you type, suggestions appear at the
						cursor and can be completed with arrow keys plus <span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">Enter</span> or <span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">Tab</span>.
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
						<span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">today</span>
						<span class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800">tomorrow</span>
						<span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">monday</span>
						<span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">fri</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">next week</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">next monday</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">25.03.2026</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">2026-03-25</span>
					</div>
				</div>

				<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Projects</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">#Inbox</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">#Work</span>
						<span class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground">#Personal</span>
					</div>
					<p class="mt-3 text-sm leading-6 text-muted-foreground">
						Type <span class="font-medium text-foreground">#</span> and keep typing a project name or identifier.
					</p>
				</div>

				<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Priority</p>
					<div class="mt-3 flex flex-wrap gap-2">
						<span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">!low</span>
						<span class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800">!medium</span>
						<span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800">!high</span>
						<span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">!</span>
						<span class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800">!!</span>
						<span class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800">!!!</span>
					</div>
				</div>

				<div class="rounded-2xl border border-border/70 bg-white/70 p-4">
					<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">What Happens</p>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						When you choose a suggestion, the shortcut is removed from the title and applied to the task automatically.
					</p>
				</div>
			</div>
		</dialog>
	{/if}
</div>
