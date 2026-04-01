<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.HeadCellProps = $props();
</script>

<CalendarPrimitive.HeadCell
	bind:ref
	class={cn(
		'w-(--cell-size) rounded-md text-[0.72rem] font-semibold tracking-[0.12em] text-muted-foreground/80 uppercase dark:text-foreground/70',
		className
	)}
	{...restProps}
/>
