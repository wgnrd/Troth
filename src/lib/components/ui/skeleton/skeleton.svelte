<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils';

	export type SkeletonProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
</script>

<script lang="ts">
	let { class: className, ...restProps }: SkeletonProps = $props();
</script>

<div
	data-slot="skeleton"
	class={cn('animate-pulse rounded-2xl bg-muted/80', className)}
	{...restProps}
></div>
