<script lang="ts">
	import { normalizeVikunjaBaseUrl } from '$lib/api/vikunja';
	import { connection } from '$lib/stores/connection';
	import { Button } from '$lib/components/ui/button';
	import { getRouteMeta } from '$lib/navigation';

	let { data } = $props();

	const route = getRouteMeta('/settings');

	let baseUrl = $state($connection.settings?.baseUrl ?? '');
	let token = $state('');
	let syncedSettingsKey = $state(
		$connection.settings ? `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}` : ''
	);

	$effect(() => {
		const nextKey = $connection.settings
			? `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}`
			: '';

		if (nextKey !== syncedSettingsKey) {
			syncedSettingsKey = nextKey;
			baseUrl = $connection.settings?.baseUrl ?? '';
			token = '';
		}
	});

	const connectionLabel = $derived.by(() => {
		switch ($connection.status) {
			case 'checking':
				return 'Checking connection…';
			case 'connected':
				return 'Connected';
			case 'error':
				return 'Connection failed';
			default:
				return 'Not connected';
		}
	});

	const resolvedApiUrl = $derived.by(() => {
		try {
			return baseUrl.trim() ? normalizeVikunjaBaseUrl(baseUrl) : null;
		} catch {
			return null;
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await connection.connect({ baseUrl, token });
	}
</script>

<section class="mx-auto flex w-full max-w-[42rem] flex-col gap-6">
	<div class="space-y-1">
		<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
			{route?.label ?? 'Settings'}
		</h1>
		<p class="text-sm text-muted-foreground">
			Connect Troth to your Vikunja instance with a personal API token.
		</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<div class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none">
			<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
				Connection
			</p>
			<p class="mt-2 text-sm font-medium text-foreground">{connectionLabel}</p>
			{#if $connection.error}
				<p class="mt-2 text-sm text-destructive">{$connection.error}</p>
			{/if}
		</div>

		<div class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none">
			<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
				Session storage
			</p>
			<p class="mt-2 text-sm text-foreground">
				{$connection.settings ? 'Stored in an HTTP-only server session' : 'No saved session'}
			</p>
		</div>

		<div class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm sm:col-span-2 dark:bg-white/7 dark:shadow-none">
			<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Version</p>
			<p class="mt-2 text-sm text-foreground">{data.build.label}</p>
		</div>
	</div>

	<form
		class="space-y-4 rounded-[1.75rem] border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
		onsubmit={handleSubmit}
	>
		<div class="space-y-2">
			<label
				class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase"
				for="vikunja-url"
			>
				Vikunja base URL
			</label>
			<input
				id="vikunja-url"
				bind:value={baseUrl}
				class="h-11 w-full rounded-xl border border-border/70 bg-background/84 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
				type="url"
				placeholder="https://vikunja.example.com"
				autocomplete="url"
			/>
			<p class="text-sm text-muted-foreground">
				Troth accepts either the site URL or the full `/api/v1` URL.
			</p>
			{#if resolvedApiUrl}
				<p class="text-sm text-muted-foreground">API URL Troth will test: {resolvedApiUrl}</p>
			{/if}
		</div>

		<div class="space-y-2">
			<label
				class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase"
				for="vikunja-token"
			>
				API token
			</label>
			<input
				id="vikunja-token"
				bind:value={token}
				class="h-11 w-full rounded-xl border border-border/70 bg-background/84 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
				type="password"
				placeholder="Paste your personal access token"
				autocomplete="off"
				spellcheck="false"
			/>
			<p class="text-sm text-muted-foreground">
				The token is sent to Troth once and kept in an HTTP-only server session.
			</p>
		</div>

		<div class="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
			<Button type="submit" disabled={$connection.status === 'checking'}>
				{$connection.status === 'checking' ? 'Connecting…' : 'Save connection'}
			</Button>

			<Button
				type="button"
				variant="ghost"
				disabled={!$connection.settings}
				onclick={() => {
					connection.disconnect();
					token = '';
				}}
			>
				Clear connection
			</Button>
		</div>
	</form>
</section>
