<script lang="ts">
	import { Plus } from '@lucide/svelte';

	let {
		title,
		meta,
		emptyState,
		mode = 'tasks'
	}: {
		title: string;
		meta?: string;
		emptyState: string;
		mode?: 'tasks' | 'settings';
	} = $props();
</script>

<section class="mx-auto flex w-full max-w-[42rem] flex-col gap-6">
	<div class="space-y-1">
		<h1 class="text-[2rem] font-semibold tracking-tight text-foreground">{title}</h1>
		{#if meta}
			<p class="text-sm text-muted-foreground">{meta}</p>
		{/if}
	</div>

	{#if mode === 'tasks'}
		<button
			type="button"
			class="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white/72 px-4 py-3 text-left text-sm text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-white/92"
		>
			<span class="rounded-md bg-muted px-1.5 py-1 text-muted-foreground">
				<Plus class="size-3.5" />
			</span>
			<span>Add a task</span>
		</button>

		<div class="space-y-3 pt-1">
			<div class="flex items-center justify-between">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Tasks</p>
			</div>

			<div class="min-h-56 rounded-[1.6rem] bg-white/38 px-1 py-2">
				<div class="flex min-h-full items-center justify-center px-6 py-14">
					<p class="text-sm text-muted-foreground">{emptyState}</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			<div class="rounded-2xl bg-white/68 px-4 py-3 ring-1 ring-border/60">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Server URL
				</p>
				<p class="mt-2 text-sm text-muted-foreground">Not connected</p>
			</div>

			<div class="rounded-2xl bg-white/68 px-4 py-3 ring-1 ring-border/60">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Access token
				</p>
				<p class="mt-2 text-sm text-muted-foreground">Not set</p>
			</div>

			<p class="pt-2 text-sm text-muted-foreground">{emptyState}</p>
		</div>
	{/if}
</section>
