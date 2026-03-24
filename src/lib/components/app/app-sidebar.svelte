<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { X } from '@lucide/svelte';
	import { appRoutes } from '$lib/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils';

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

	const primaryRoutes = appRoutes.filter((item) => item.href !== '/settings');
	const settingsRoute = appRoutes.find((item) => item.href === '/settings');
	const SettingsIcon = settingsRoute?.icon;
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
