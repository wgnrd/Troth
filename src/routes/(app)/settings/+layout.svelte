<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let { children }: { children: Snippet } = $props();

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<div class="mx-auto flex w-full max-w-[42rem] flex-col gap-4">
	<nav class="border-b border-border/60 pb-1">
		<div class="flex flex-wrap gap-1.5">
			<a
				href={resolve('/settings')}
				class={cn(
					'rounded-lg px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings')
						? 'bg-muted/70 text-foreground'
						: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
				)}
			>
				Overview
			</a>
			<a
				href={resolve('/settings/appearance')}
				class={cn(
					'rounded-lg px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings/appearance')
						? 'bg-muted/70 text-foreground'
						: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
				)}
			>
				Appearance
			</a>
			<a
				href={resolve('/settings/integrations')}
				class={cn(
					'rounded-lg px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings/integrations')
						? 'bg-muted/70 text-foreground'
						: 'text-muted-foreground hover:bg-muted/45 hover:text-foreground'
				)}
			>
				Integrations
			</a>
		</div>
	</nav>

	{@render children()}
</div>
