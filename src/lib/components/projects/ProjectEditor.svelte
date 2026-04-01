<script lang="ts">
	import { Check, ChevronDown, Sparkles, X } from '@lucide/svelte';
	import type { AppList, CreateProjectInput, UpdateProjectInput } from '$lib/api/vikunja';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { buildProjectTree, flattenProjectTree } from '$lib/lists/tree';
	import { cn } from '$lib/utils';

	const DEFAULT_PROJECT_COLORS = [
		'#64748B',
		'#0F766E',
		'#2563EB',
		'#7C3AED',
		'#BE185D',
		'#C2410C',
		'#65A30D',
		'#B45309'
	];

	type EditableProject = AppList | null;

	let {
		open = false,
		mode = 'create',
		project = null,
		lists,
		busy = false,
		error = null,
		onClose,
		onSubmit
	}: {
		open?: boolean;
		mode?: 'create' | 'edit';
		project?: EditableProject;
		lists: AppList[];
		busy?: boolean;
		error?: string | null;
		onClose?: () => void;
		onSubmit?:
			| ((input: CreateProjectInput) => Promise<boolean | void> | boolean | void)
			| ((input: UpdateProjectInput) => Promise<boolean | void> | boolean | void);
	} = $props();

	let title = $state('');
	let description = $state('');
	let projectMode = $state<'root' | 'nested'>('root');
	let parentId = $state<number | null>(null);
	let color = $state(DEFAULT_PROJECT_COLORS[0]);
	let localError = $state<string | null>(null);
	let syncedProjectKey = $state('');
	let editorEl = $state<HTMLElement | null>(null);
	let previousFocus = $state<HTMLElement | null>(null);
	let parentPickerOpen = $state(false);

	const availableParentLists = $derived.by(() => {
		if (mode !== 'edit' || !project) {
			return lists;
		}

		return lists.filter((list) => list.id !== project.id);
	});
	const parentOptions = $derived(flattenProjectTree(buildProjectTree(availableParentLists)));
	const selectedParent = $derived(lists.find((list) => list.id === parentId) ?? null);
	const canSubmit = $derived(
		Boolean(title.trim()) && (projectMode === 'root' || parentId !== null) && !busy
	);
	const helperText = $derived(localError ?? error);

	$effect(() => {
		if (!open) {
			if (previousFocus && document.contains(previousFocus)) {
				previousFocus.focus();
			}
			previousFocus = null;
			parentPickerOpen = false;
			return;
		}

		previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	});

	$effect(() => {
		if (!open) {
			return;
		}

		const nextKey =
			mode === 'edit' && project
				? `${project.id}|${project.title}|${project.description}|${project.parentId}|${project.color}`
				: 'create';

		if (nextKey === syncedProjectKey) {
			return;
		}

		syncedProjectKey = nextKey;
		title = project?.title ?? '';
		description = project?.description ?? '';
		projectMode = project?.parentId ? 'nested' : 'root';
		parentId = project?.parentId ?? null;
		color = project?.color ?? DEFAULT_PROJECT_COLORS[0];
		localError = null;
	});

	$effect(() => {
		if (projectMode === 'root') {
			parentId = null;
			return;
		}

		if (!availableParentLists.some((list) => list.id === parentId)) {
			parentId = availableParentLists[0]?.id ?? null;
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}

		function handleKeydown(event: KeyboardEvent) {
			const activeElement =
				document.activeElement instanceof HTMLElement ? document.activeElement : null;
			const isInsideEditor = activeElement ? editorEl?.contains(activeElement) : false;

			if (!isInsideEditor) {
				return;
			}

			if (event.key === 'Escape' && !busy) {
				event.preventDefault();
				onClose?.();
			}
		}

		document.addEventListener('keydown', handleKeydown);

		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!title.trim()) {
			localError = 'Enter a project name first.';
			return;
		}

		if (projectMode === 'nested' && parentId === null) {
			localError = 'Choose a parent project for this nested project.';
			return;
		}

		localError = null;

		if (mode === 'edit' && project) {
			const result = await (
				onSubmit as
					| ((input: UpdateProjectInput) => Promise<boolean | void> | boolean | void)
					| undefined
			)?.({
				id: project.id,
				title: title.trim(),
				description: description.trim(),
				color,
				parentId: projectMode === 'nested' ? parentId : null
			} satisfies UpdateProjectInput);

			if (result !== false) {
				onClose?.();
			}

			return;
		}

		const result = await (
			onSubmit as
				| ((input: CreateProjectInput) => Promise<boolean | void> | boolean | void)
				| undefined
		)?.({
			title: title.trim(),
			description: description.trim(),
			color,
			parentId: projectMode === 'nested' ? parentId : null
		} satisfies CreateProjectInput);

		if (result !== false) {
			onClose?.();
		}
	}
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-stone-950/20 backdrop-blur-[2px]"
		aria-label="Close project editor"
		onclick={() => {
			if (!busy) {
				onClose?.();
			}
		}}
	></button>

	<aside
		bind:this={editorEl}
		class="fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[34rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.8rem] border border-border/70 bg-background/96 p-4 shadow-2xl"
		aria-label={mode === 'edit' ? 'Edit project' : 'Create project'}
	>
		<form class="space-y-5" onsubmit={handleSubmit}>
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-1">
					<h2 class="text-[1.35rem] font-semibold tracking-tight text-foreground">
						{mode === 'edit' ? 'Edit Project' : 'Add Project'}
					</h2>
					<p class="text-sm text-muted-foreground">
						{mode === 'edit'
							? 'Update the name, placement, and color for this project.'
							: 'Choose whether this should be a root project or nested inside another one.'}
					</p>
				</div>

				<Button
					variant="ghost"
					size="icon-sm"
					class="text-muted-foreground hover:text-foreground"
					onclick={() => {
						onClose?.();
					}}
					disabled={busy}
					aria-label="Close project editor"
				>
					<X class="size-4" />
				</Button>
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					for="project-title"
				>
					Name
				</label>
				<input
					id="project-title"
					bind:value={title}
					class="h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					type="text"
					placeholder="Project name"
					disabled={busy}
				/>
			</div>

			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase">
					Placement
				</p>
				<div class="grid gap-2 sm:grid-cols-2">
					<button
						type="button"
						class={cn(
							'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition',
							projectMode === 'root'
								? 'border-primary/25 bg-primary/8 text-foreground'
								: 'border-border/70 bg-background/75 text-muted-foreground hover:text-foreground'
						)}
						onclick={() => {
							projectMode = 'root';
						}}
					>
						<span>
							<span class="block font-medium">Root project</span>
							<span class="block text-xs text-muted-foreground">Shows at the top level</span>
						</span>
						{#if projectMode === 'root'}
							<Check class="size-4 text-primary" />
						{/if}
					</button>

					<button
						type="button"
						class={cn(
							'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition',
							projectMode === 'nested'
								? 'border-primary/25 bg-primary/8 text-foreground'
								: 'border-border/70 bg-background/75 text-muted-foreground hover:text-foreground'
						)}
						onclick={() => {
							projectMode = 'nested';
						}}
					>
						<span>
							<span class="block font-medium">Nested project</span>
							<span class="block text-xs text-muted-foreground">Lives inside another project</span>
						</span>
						{#if projectMode === 'nested'}
							<Check class="size-4 text-primary" />
						{/if}
					</button>
				</div>
			</div>

			{#if projectMode === 'nested'}
				<div class="space-y-2">
					<p class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase">
						Parent Project
					</p>

					<Popover.Root bind:open={parentPickerOpen}>
						<Popover.Trigger
							class="flex h-11 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 text-sm transition outline-none focus-within:border-primary/30 focus-within:ring-3 focus-within:ring-primary/10"
							disabled={busy || parentOptions.length === 0}
							aria-label="Choose parent project"
						>
							<span class={cn('truncate', !selectedParent && 'text-muted-foreground')}>
								{selectedParent?.title ?? 'Choose parent project'}
							</span>
							<ChevronDown class="size-4 text-muted-foreground" />
						</Popover.Trigger>

						<Popover.Content align="start" class="w-72 rounded-2xl border-border/70 p-1.5">
							<div class="max-h-72 overflow-y-auto">
								{#each parentOptions as option (option.list.id)}
									<button
										type="button"
										class={cn(
											'flex w-full items-center justify-between rounded-xl py-2 pr-3 text-left text-sm transition',
											option.list.id === parentId
												? 'bg-muted text-foreground'
												: 'text-foreground/80 hover:bg-stone-50 dark:hover:bg-white/8'
										)}
										style={`padding-left: ${option.depth * 0.95 + 0.9}rem;`}
										onclick={() => {
											parentId = option.list.id;
											parentPickerOpen = false;
										}}
									>
										<span class="flex min-w-0 items-center gap-2">
											<span
												class="rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold"
												style={option.list.color
													? `background-color: color-mix(in srgb, ${option.list.color} 14%, white); color: color-mix(in srgb, ${option.list.color} 60%, rgb(68 64 60));`
													: undefined}
											>
												#
											</span>
											<span class="truncate">{option.list.title}</span>
										</span>
										{#if option.list.id === parentId}
											<Check class="size-4 shrink-0 text-muted-foreground" />
										{/if}
									</button>
								{/each}
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			{/if}

			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<Sparkles class="size-3.5 text-muted-foreground" />
					<p class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase">Color</p>
				</div>

				<div class="flex flex-wrap items-center gap-2">
					{#each DEFAULT_PROJECT_COLORS as swatch (swatch)}
						<button
							type="button"
							class={cn(
								'size-8 rounded-full border-2 transition hover:scale-[1.03]',
								color === swatch ? 'border-foreground/60' : 'border-white'
							)}
							style={`background-color: ${swatch};`}
							aria-label={`Choose color ${swatch}`}
							onclick={() => {
								color = swatch;
							}}
						></button>
					{/each}

					<label
						class="ml-1 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground"
					>
						<span>Custom</span>
						<input
							bind:value={color}
							class="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
							type="color"
							aria-label="Choose custom project color"
						/>
					</label>
				</div>
			</div>

			<div class="space-y-2">
				<label
					class="text-xs font-semibold tracking-[0.16em] text-foreground/72 uppercase"
					for="project-description"
				>
					Description
				</label>
				<textarea
					id="project-description"
					bind:value={description}
					class="min-h-24 w-full rounded-xl border border-border/70 bg-background/75 px-3 py-3 text-sm transition outline-none focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
					placeholder="Optional description"
					disabled={busy}
				></textarea>
			</div>

			<div class="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
				<div>
					{#if helperText}
						<p class="text-sm text-destructive">{helperText}</p>
					{/if}
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onclick={() => {
							onClose?.();
						}}
						disabled={busy}
					>
						Cancel
					</Button>
					<Button type="submit" size="sm" disabled={!canSubmit}>
						{busy
							? mode === 'edit'
								? 'Saving…'
								: 'Creating…'
							: mode === 'edit'
								? 'Save Project'
								: 'Create Project'}
					</Button>
				</div>
			</div>
		</form>
	</aside>
{/if}
