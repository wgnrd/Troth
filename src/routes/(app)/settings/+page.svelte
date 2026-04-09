<script lang="ts">
	import { resolve } from '$app/paths';
	import { Palette, PlugZap, Waypoints } from '@lucide/svelte';
	import { getRouteMeta } from '$lib/navigation';

	let { data } = $props();

	const route = getRouteMeta('/settings');
</script>

<section class="mx-auto flex w-full max-w-[42rem] flex-col gap-6">
	<div class="space-y-1">
		<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
			{route?.label ?? 'Settings'}
		</h1>
		<p class="text-sm text-muted-foreground">
			Choose a settings area below to keep configuration focused and easier to scan.
		</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<a
			href={resolve('/settings/appearance')}
			class="group rounded-[1.75rem] border border-border/70 bg-white/80 p-4 text-left shadow-sm transition hover:bg-background dark:bg-white/7 dark:shadow-none"
		>
			<div class="space-y-3">
				<div
					class="inline-flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-foreground dark:bg-white/8"
				>
					<Palette class="size-4" />
				</div>
				<div>
					<h2 class="text-base font-semibold tracking-tight text-foreground">Appearance</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Choose the app theme and preview the palettes available in Troth.
					</p>
				</div>
			</div>
		</a>

		<a
			href={resolve('/settings/integrations')}
			class="group rounded-[1.75rem] border border-border/70 bg-white/80 p-4 text-left shadow-sm transition hover:bg-background dark:bg-white/7 dark:shadow-none"
		>
			<div class="space-y-3">
				<div
					class="inline-flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-foreground dark:bg-white/8"
				>
					<PlugZap class="size-4" />
				</div>
				<div>
					<h2 class="text-base font-semibold tracking-tight text-foreground">Integrations</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Manage the Vikunja connection and optional read-only calendar feed.
					</p>
				</div>
			</div>
		</a>
	</div>

	<div
		class="rounded-[1.75rem] border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
	>
		<div class="flex items-start gap-3">
			<div
				class="inline-flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-foreground dark:bg-white/8"
			>
				<Waypoints class="size-4" />
			</div>
			<div class="space-y-1">
				<h2 class="text-base font-semibold tracking-tight text-foreground">About this build</h2>
				<p class="text-sm text-muted-foreground">
					Version <span class="font-medium text-foreground">{data.build.label}</span>
				</p>
			</div>
		</div>
	</div>
</section>
