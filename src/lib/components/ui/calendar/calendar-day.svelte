<script lang="ts">
	import { cn } from '$lib/utils';
	import { Calendar as CalendarPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.DayProps = $props();
</script>

<CalendarPrimitive.Day
	bind:ref
	class={cn(
		'flex size-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--cell-radius) p-0 text-[0.98rem] leading-none font-medium whitespace-nowrap transition-colors select-none',
		'[&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
		'not-data-selected:hover:bg-accent/60 not-data-selected:hover:text-accent-foreground dark:not-data-selected:text-foreground/92 dark:not-data-selected:hover:bg-white/12 dark:not-data-selected:hover:text-foreground',
		'[&[data-today]:not([data-selected])]:bg-accent/70 [&[data-today]:not([data-selected])]:text-foreground [&[data-today][data-disabled]]:text-muted-foreground dark:[&[data-today]:not([data-selected])]:bg-white/14 dark:[&[data-today]:not([data-selected])]:text-foreground',
		'data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:shadow-[0_12px_24px_-14px_rgba(30,24,17,0.75)] data-[selected]:hover:text-background dark:data-[selected]:bg-primary dark:data-[selected]:text-primary-foreground dark:data-[selected]:shadow-[0_12px_24px_-14px_rgba(0,0,0,0.45)]',
		// Outside months
		'[&[data-outside-month]:not([data-selected])]:text-muted-foreground/65 [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground dark:[&[data-outside-month]:not([data-selected])]:text-muted-foreground/80',
		// Disabled
		'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground data-[disabled]:opacity-50 dark:data-[disabled]:opacity-40',
		// Unavailable
		'data-[unavailable]:text-muted-foreground data-[unavailable]:line-through',
		// focus
		'focus:relative focus:border-ring focus:ring-ring/50',
		// inner spans
		'[&>span]:text-xs [&>span]:opacity-70',
		className
	)}
	{...restProps}
/>
