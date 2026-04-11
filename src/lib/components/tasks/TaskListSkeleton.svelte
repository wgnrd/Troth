<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { rows = 5 }: { rows?: number } = $props();
	const rowIndexes = $derived(Array.from({ length: rows }, (_, index) => index));
</script>

<div
	class="rounded-[1.75rem] border border-border/65 bg-white/56 p-2 shadow-sm dark:bg-white/7 dark:shadow-none"
>
	{#each rowIndexes as index (index)}
		<div class="flex items-center gap-3 rounded-[1.35rem] px-3 py-3">
			<Skeleton class="size-6 rounded-full bg-muted/70" />
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton class={index % 2 === 0 ? 'h-4 w-2/3' : 'h-4 w-1/2'} />
				<Skeleton class="h-3.5 w-1/3 rounded-full bg-muted/65" />
			</div>
			<Skeleton class="h-7 w-18 rounded-full bg-muted/65" />
		</div>
	{/each}
</div>
