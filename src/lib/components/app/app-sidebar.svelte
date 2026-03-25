<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Hash, X } from '@lucide/svelte';
	import { connection } from '$lib/stores/connection';
	import { lists } from '$lib/stores/lists';
	import { buildProjectTree, flattenProjectTree } from '$lib/lists/tree';
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

	function getProjectIconStyle(color: string | null, active: boolean) {
		if (!color) {
			return undefined;
		}

		const textMix = active ? '70%' : '58%';

		return `color: color-mix(in srgb, ${color} ${textMix}, rgb(68 64 60));`;
	}

	const primaryRoutes = appRoutes.filter(
		(item) => item.href !== '/settings' && item.href !== '/projects'
	);
	const projectsRoute = appRoutes.find((item) => item.href === '/projects');
	const settingsRoute = appRoutes.find((item) => item.href === '/settings');
	const ProjectsIcon = projectsRoute?.icon;
	const SettingsIcon = settingsRoute?.icon;
	const projectEntries = $derived(flattenProjectTree(buildProjectTree($lists.items)));

	$effect(() => {
		if (!$connection.settings || $lists.loaded || $lists.loading) {
			return;
		}

		void lists.load();
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

		{#if projectsRoute && ProjectsIcon}
			<div class="pt-2">
				<Separator class="mb-2 opacity-50" />

				<a
					href={resolve(projectsRoute.href)}
					onclick={onSelect}
					class={cn(
						'group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
						isActive(projectsRoute.href)
							? 'bg-primary/10 text-foreground'
							: 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
					)}
				>
					<span
						class={cn(
							'rounded-lg p-1.5 transition-colors',
							isActive(projectsRoute.href)
								? 'bg-primary/12 text-foreground'
								: 'text-muted-foreground group-hover:text-foreground'
						)}
					>
						<ProjectsIcon class="size-4" />
					</span>

					<span class="min-w-0 flex-1 truncate text-sm font-medium">{projectsRoute.label}</span>
				</a>

				{#if $connection.settings && projectEntries.length > 0}
					<div class="mt-2 space-y-1" aria-label="Projects">
						{#each projectEntries as entry (entry.list.id)}
							{@const active = isActive(`/projects/${entry.list.id}`)}
							<a
								href={resolve(`/projects/${entry.list.id}`)}
								onclick={onSelect}
								class={cn(
									'group flex items-center gap-2 rounded-xl py-2 pr-2 text-sm transition-colors',
									active
										? 'bg-primary/8 text-foreground'
										: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
								)}
								style={`padding-left: ${entry.depth * 0.9 + 1}rem;`}
							>
								<span
									class={cn(
										'flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors',
										!entry.list.color &&
											(active
												? 'bg-primary/12 text-foreground'
												: 'text-stone-400 group-hover:text-foreground')
									)}
									style={getProjectIconStyle(entry.list.color, active)}
								>
									<Hash class="size-3.5" />
								</span>

								<span class="min-w-0 flex-1 truncate">{entry.list.title}</span>
							</a>
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
