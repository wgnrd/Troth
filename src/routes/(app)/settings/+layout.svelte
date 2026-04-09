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
	<nav class="pb-1">
		<div
			class="grid grid-cols-3 gap-2 rounded-[1.35rem] border border-border/70 bg-white/70 p-1 shadow-sm dark:bg-white/7 dark:shadow-none"
		>
			<a
				href={resolve('/settings')}
				class={cn(
					'rounded-[1rem] px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings')
						? 'bg-background text-foreground shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:bg-white/10'
						: 'text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-white/6'
				)}
			>
				Overview
			</a>
			<a
				href={resolve('/settings/appearance')}
				class={cn(
					'rounded-[1rem] px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings/appearance')
						? 'bg-background text-foreground shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:bg-white/10'
						: 'text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-white/6'
				)}
			>
				Appearance
			</a>
			<a
				href={resolve('/settings/integrations')}
				class={cn(
					'rounded-[1rem] px-2 py-2 text-center text-sm font-medium transition sm:px-3',
					isActive('/settings/integrations')
						? 'bg-background text-foreground shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:bg-white/10'
						: 'text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-white/6'
				)}
			>
				Integrations
			</a>
		</div>
	</nav>

	{@render children()}
</div>
