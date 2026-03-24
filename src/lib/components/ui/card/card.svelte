<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils';

	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
</script>

<script lang="ts">
	let { class: className, children, ...restProps }: CardProps = $props();
</script>

<div
	data-slot="card"
	class={cn(
		'rounded-[28px] border border-border/70 bg-card/90 text-card-foreground shadow-sm',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
