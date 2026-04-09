<script lang="ts">
	import { getRouteMeta } from '$lib/navigation';
	import { theme, themeOptions } from '$lib/stores/theme';

	const route = getRouteMeta('/settings');
	const activeTheme = $derived(
		themeOptions.find((option) => option.value === $theme.selected) ?? themeOptions[0]
	);
</script>

<section class="flex w-full flex-col gap-6">
	<div class="space-y-1">
		<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
			{route?.label ?? 'Settings'}
		</p>
		<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
			Appearance
		</h1>
		<p class="text-sm text-muted-foreground">
			Choose the theme Troth should use. This preference stays in this browser.
		</p>
	</div>

	<section
		class="space-y-4 rounded-[1.75rem] border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
	>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each themeOptions as option (option.value)}
				<button
					type="button"
					class={`rounded-2xl border px-4 py-3 text-left transition ${$theme.selected === option.value ? 'border-primary/35 bg-primary/8 shadow-sm' : 'border-border/70 bg-white/72 hover:bg-background dark:bg-white/7'}`}
					onclick={() => theme.setTheme(option.value)}
					aria-pressed={$theme.selected === option.value}
				>
					<div
						class="rounded-[1.15rem] border p-3"
						style={`background:${option.preview.background}; border-color:${option.preview.muted}33; color:${option.preview.text};`}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold">{option.label}</p>
								<p class="mt-1 text-xs leading-5" style={`color:${option.preview.muted};`}>
									{option.description}
								</p>
							</div>
							<div class="flex items-center gap-1">
								{#each option.preview.swatches as swatch, index (`${option.value}-${index}`)}
									<span
										class="size-3 rounded-full border border-black/10 dark:border-white/10"
										style={`background:${swatch};`}
									></span>
								{/each}
							</div>
						</div>

						<div
							class="mt-3 rounded-xl border p-3 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]"
							style={`background:${option.preview.card}; border-color:${option.preview.muted}26;`}
						>
							<div class="flex items-center justify-between gap-3">
								<div class="space-y-1">
									<div
										class="h-2 w-14 rounded-full"
										style={`background:${option.preview.text}; opacity:0.92;`}
									></div>
									<div
										class="h-2 w-20 rounded-full"
										style={`background:${option.preview.muted}; opacity:0.55;`}
									></div>
								</div>
								<div
									class="rounded-full px-2.5 py-1 text-[11px] font-medium"
									style={`background:${option.preview.accent}; color:${option.preview.background};`}
								>
									Preview
								</div>
							</div>
						</div>
					</div>
				</button>
			{/each}
		</div>

		<p class="text-sm text-muted-foreground">Current theme: {activeTheme.label}</p>
	</section>
</section>
