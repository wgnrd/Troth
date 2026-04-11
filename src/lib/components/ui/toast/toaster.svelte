<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { X } from '@lucide/svelte';
	import { fade, fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { toast } from '$lib/stores/toasts';

	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();

	async function handleAction(id: number, onClick: () => Promise<void> | void) {
		toast.dismiss(id);
		await onClick();
	}

	function clearTimer(id: number) {
		const timer = timers.get(id);

		if (!timer) {
			return;
		}

		clearTimeout(timer);
		timers.delete(id);
	}

	onDestroy(() => {
		for (const id of timers.keys()) {
			clearTimer(id);
		}
	});

	$effect(() => {
		for (const item of $toast) {
			if (timers.has(item.id)) {
				continue;
			}

			timers.set(
				item.id,
				setTimeout(() => {
					toast.dismiss(item.id);
					timers.delete(item.id);
				}, item.duration ?? 5000)
			);
		}

		for (const id of timers.keys()) {
			if ($toast.some((item) => item.id === id)) {
				continue;
			}

			clearTimer(id);
		}
	});
</script>

<div
	class="pointer-events-none fixed inset-x-3 bottom-24 z-[90] flex flex-col items-end gap-2 sm:inset-x-4 sm:bottom-4"
>
	{#each $toast as item (item.id)}
		<div
			in:fly={{ y: 12, duration: 180 }}
			out:fade={{ duration: 150 }}
			class="pointer-events-auto w-full max-w-sm rounded-[1.35rem] border border-border/70 bg-background/96 px-3.5 py-3 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.45)] backdrop-blur"
			role="status"
			aria-live="polite"
		>
			<div class="flex items-center gap-3">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium tracking-[-0.01em] text-foreground">{item.title}</p>
					{#if item.description}
						<p class="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
					{/if}
				</div>

				<div class="flex shrink-0 items-center gap-1">
					{#if item.action}
						{@const action = item.action}
						<Button
							variant="outline"
							size="sm"
							class="bg-background/80"
							onclick={() => {
								void handleAction(item.id, action.onClick);
							}}
						>
							{action.label}
						</Button>
					{/if}

					<Button
						variant="ghost"
						size="icon-xs"
						class="-mr-1 text-muted-foreground"
						aria-label="Dismiss notification"
						onclick={() => toast.dismiss(item.id)}
					>
						<X class="size-3.5" />
					</Button>
				</div>
			</div>
		</div>
	{/each}
</div>
