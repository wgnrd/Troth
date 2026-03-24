<script lang="ts">
	import { resolve } from '$app/paths';
	import { AlertCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';

	let {
		error,
		status
	}: {
		error?: { message?: string } | string | null;
		status: number;
	} = $props();

	const errorMessage = $derived.by(() => {
		if (typeof error === 'string') {
			return error;
		}

		if (error && typeof error === 'object' && 'message' in error) {
			return error.message;
		}

		return null;
	});
</script>

<svelte:head>
	<title>Troth | Error</title>
</svelte:head>

<section class="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-20">
	<Card class="w-full p-8 sm:p-10">
		<div class="flex flex-col gap-5">
			<div
				class="inline-flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
			>
				<AlertCircle class="size-5" />
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium text-muted-foreground">Something went wrong</p>
				<h1 class="text-3xl font-semibold tracking-tight">{status}</h1>
				<p class="max-w-xl text-base leading-7 text-muted-foreground">
					{errorMessage ?? 'An unexpected error interrupted the current view.'}
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<Button href={resolve('/today')}>Back to Today</Button>
				<Button variant="outline" href={resolve('/settings')}>Open Settings</Button>
			</div>
		</div>
	</Card>
</section>
