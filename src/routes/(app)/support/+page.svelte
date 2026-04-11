<script lang="ts">
	import { CircleHelp } from '@lucide/svelte';
</script>

<section class="mx-auto flex w-full max-w-[34rem] flex-col gap-4">
	<div class="space-y-1 px-1">
		<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
			Support
		</h1>
		<p class="text-sm text-muted-foreground">
			Write metadata directly in the task title. These shortcuts work in Quick Add and task
			creation.
		</p>
	</div>

	<div class="rounded-[1.8rem] border border-border/70 bg-background/96 p-5 shadow-sm">
		<div class="flex items-start gap-3">
			<div
				class="inline-flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-foreground dark:bg-white/8"
			>
				<CircleHelp class="size-4" />
			</div>
			<div class="space-y-1">
				<h2 class="text-base font-semibold tracking-tight text-foreground">Quick Add Formatting</h2>
				<p class="text-sm leading-6 text-muted-foreground">
					Write metadata directly in the task title. As you type, suggestions appear at the cursor
					and can be completed with arrow keys plus
					<span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
						>Enter</span
					>
					or
					<span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
						>Tab</span
					>.
				</p>
			</div>
		</div>

		<div class="mt-5 grid gap-3">
			<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Dates</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<span
						class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
						>today</span
					>
					<span
						class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
						>tomorrow</span
					>
					<span
						class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
						>monday</span
					>
					<span
						class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
						>fri</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>next week</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>next monday</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>25.03.2026</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>2026-03-25</span
					>
				</div>
			</div>

			<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Projects
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>#Inbox</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>#Work</span
					>
					<span
						class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm font-medium text-foreground"
						>#Personal</span
					>
				</div>
				<p class="mt-3 text-sm leading-6 text-muted-foreground">
					Type <span class="font-medium text-foreground">#</span> and keep typing a project name or identifier.
				</p>
			</div>

			<div class="rounded-2xl border border-border/70 bg-muted/35 p-4">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Priority
				</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<span
						class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
						>!low</span
					>
					<span
						class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
						>!medium</span
					>
					<span
						class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800"
						>!high</span
					>
					<span
						class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800"
						>!</span
					>
					<span
						class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800"
						>!!</span
					>
					<span
						class="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-800"
						>!!!</span
					>
				</div>
			</div>

			<div class="rounded-2xl border border-border/70 bg-white/70 p-4 dark:bg-white/7">
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					What Happens
				</p>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					When you choose a suggestion, the shortcut is removed from the title and applied to the
					task automatically.
				</p>
			</div>
		</div>
	</div>
</section>
