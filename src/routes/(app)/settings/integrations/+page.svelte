<script lang="ts">
	import { normalizeCalendarFeedLabel, normalizeCalendarFeedUrl } from '$lib/api/calendar';
	import { normalizeVikunjaBaseUrl } from '$lib/api/vikunja';
	import { Button } from '$lib/components/ui/button';
	import { getRouteMeta } from '$lib/navigation';
	import { calendarFeed } from '$lib/stores/calendar-feed';
	import { connection } from '$lib/stores/connection';

	const route = getRouteMeta('/settings');

	let baseUrl = $state($connection.settings?.baseUrl ?? '');
	let token = $state('');
	let calendarUrl = $state('');
	let calendarLabel = $state($calendarFeed.settings?.label ?? '');
	let syncedSettingsKey = $state(
		$connection.settings ? `${$connection.settings.baseUrl}|${$connection.settings.sessionKey}` : ''
	);
	let syncedCalendarKey = $state($calendarFeed.settings?.sessionKey ?? '');

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

	$effect(() => {
		const nextKey = $calendarFeed.settings?.sessionKey ?? '';

		if (nextKey !== syncedCalendarKey) {
			syncedCalendarKey = nextKey;
			calendarUrl = '';
			calendarLabel = $calendarFeed.settings?.label ?? '';
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

	const calendarLabelText = $derived.by(() => {
		switch ($calendarFeed.status) {
			case 'checking':
				return 'Checking feed…';
			case 'connected':
				return 'Connected';
			case 'error':
				return 'Feed failed';
			default:
				return 'Not connected';
		}
	});

	const resolvedCalendarUrl = $derived.by(() => {
		try {
			return calendarUrl.trim() ? normalizeCalendarFeedUrl(calendarUrl) : null;
		} catch {
			return null;
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		await connection.connect({ baseUrl, token });
	}

	async function handleCalendarSubmit(event: SubmitEvent) {
		event.preventDefault();
		await calendarFeed.connect({
			url: calendarUrl,
			label: normalizeCalendarFeedLabel(calendarLabel)
		});
	}
</script>

<section class="flex w-full flex-col gap-6">
	<div class="space-y-1">
		<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
			{route?.label ?? 'Settings'}
		</p>
		<h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-[2rem]">
			Integrations
		</h1>
		<p class="text-sm text-muted-foreground">
			Manage the main Vikunja connection and the optional calendar feed separately.
		</p>
	</div>

	<section class="space-y-3 rounded-[2rem] border border-border/70 bg-white/50 p-1 dark:bg-white/4">
		<div class="px-4 pt-4">
			<h2 class="text-base font-semibold tracking-tight text-foreground">Vikunja</h2>
			<p class="text-sm text-muted-foreground">
				Manage the main Troth connection and session-backed API access.
			</p>
		</div>

		<div class="grid gap-3 px-4 sm:grid-cols-2">
			<div
				class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none"
			>
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Connection
				</p>
				<p class="mt-2 text-sm font-medium text-foreground">{connectionLabel}</p>
				{#if $connection.error}
					<p class="mt-2 text-sm text-destructive">{$connection.error}</p>
				{/if}
			</div>

			<div
				class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none"
			>
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
					Session storage
				</p>
				<p class="mt-2 text-sm text-foreground">
					{$connection.settings ? 'Stored in an HTTP-only server session' : 'No saved session'}
				</p>
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
				<Button type="submit" disabled={$connection.status === 'checking'}
					>{$connection.status === 'checking' ? 'Connecting…' : 'Save connection'}</Button
				>
				<Button
					type="button"
					variant="ghost"
					disabled={!$connection.settings}
					onclick={() => {
						connection.disconnect();
						token = '';
					}}>Clear connection</Button
				>
			</div>
		</form>
	</section>

	<section class="space-y-3 rounded-[2rem] border border-border/70 bg-white/50 p-1 dark:bg-white/4">
		<div class="px-4 pt-4">
			<h2 class="text-base font-semibold tracking-tight text-foreground">External calendar</h2>
			<p class="text-sm text-muted-foreground">
				Add one private ICS feed to show read-only calendar events in Troth.
			</p>
		</div>

		<div class="grid gap-3 px-4 sm:grid-cols-2">
			<div
				class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none"
			>
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Feed</p>
				<p class="mt-2 text-sm font-medium text-foreground">{calendarLabelText}</p>
				{#if $calendarFeed.settings}
					<p class="mt-2 text-sm text-muted-foreground">
						{$calendarFeed.settings.label ?? $calendarFeed.settings.urlHost}
					</p>
				{/if}
				{#if $calendarFeed.error}
					<p class="mt-2 text-sm text-destructive">{$calendarFeed.error}</p>
				{/if}
			</div>

			<div
				class="rounded-2xl border border-border/70 bg-white/72 px-4 py-3 shadow-sm dark:bg-white/7 dark:shadow-none"
			>
				<p class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Storage</p>
				<p class="mt-2 text-sm text-foreground">
					{$calendarFeed.settings ? 'Stored in an HTTP-only server session' : 'No saved feed'}
				</p>
			</div>
		</div>

		<form
			class="space-y-4 rounded-[1.75rem] border border-border/70 bg-white/80 p-4 shadow-sm dark:bg-white/7 dark:shadow-none"
			onsubmit={handleCalendarSubmit}
		>
			<div class="space-y-2">
				<label
					class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase"
					for="calendar-url"
				>
					ICS feed URL
				</label>
				<input
					id="calendar-url"
					bind:value={calendarUrl}
					class="h-11 w-full rounded-xl border border-border/70 bg-background/84 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					type="url"
					placeholder="https://calendar.google.com/calendar/ical/.../private-basic.ics"
					autocomplete="url"
					spellcheck="false"
				/>
				<p class="text-sm text-muted-foreground">
					<code>webcal://</code> links are accepted and stored as <code>https://</code>.
				</p>
				<p class="text-sm text-muted-foreground">
					Google Calendar needs the private ICS link from <code
						>Settings &gt; Integrate calendar</code
					>, not the normal calendar page URL.
				</p>
				{#if resolvedCalendarUrl}
					<p class="text-sm text-muted-foreground">
						Feed URL Troth will test: {resolvedCalendarUrl}
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase"
					for="calendar-label"
				>
					Label
				</label>
				<input
					id="calendar-label"
					bind:value={calendarLabel}
					class="h-11 w-full rounded-xl border border-border/70 bg-background/84 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					type="text"
					placeholder="Personal calendar"
					autocomplete="off"
				/>
				<p class="text-sm text-muted-foreground">
					Optional. This label is shown in the daily preview instead of the feed host.
				</p>
			</div>

			<div class="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
				<Button type="submit" disabled={$calendarFeed.status === 'checking'}
					>{$calendarFeed.status === 'checking' ? 'Connecting…' : 'Save calendar feed'}</Button
				>
				<Button
					type="button"
					variant="ghost"
					disabled={!$calendarFeed.settings}
					onclick={() => {
						void calendarFeed.disconnect();
						calendarUrl = '';
						calendarLabel = '';
					}}>Clear feed</Button
				>
			</div>
		</form>
	</section>
</section>
