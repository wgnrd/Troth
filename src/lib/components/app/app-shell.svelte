<script lang="ts">
	import { page, navigating } from '$app/state';
	import { LoaderCircle, Menu } from '@lucide/svelte';
	import { getRouteMeta } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import AppSidebar from '$lib/components/app/app-sidebar.svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();

	let mobileNavOpen = $state(false);

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
</script>

<div
	class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,113,108,0.1),_transparent_44%),linear-gradient(180deg,_color-mix(in_oklch,_var(--color-stone-50)_72%,_var(--color-background)),_var(--color-background)_36%)]"
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
</div>
