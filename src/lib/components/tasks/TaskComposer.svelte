<script lang="ts">
	import type { AppList, CreateTaskInput } from '$lib/api/vikunja';
	import { AlertCircle, Check, Hash } from '@lucide/svelte';
	import { tick } from 'svelte';
	import {
		getActiveInlineToken,
		getPrioritySuggestions,
		getProjectSuggestions,
		parseInlineMetadata,
		resolveInlineMetadata,
		type InlineResolvedToken,
		type InlineSuggestion
	} from '$lib/tasks/inline-metadata';
	import TaskMetaFields from './TaskMetaFields.svelte';

	type HighlightSegment =
		| {
				kind: 'text';
				text: string;
		  }
		| {
				kind: 'highlight';
				text: string;
				highlight: InlineResolvedToken;
		  };

	let {
		lists,
		busy = false,
		error = null,
		fixedListId = null,
		defaultListId = null,
		defaultDueDate = getDefaultDueDate(),
		defaultPriority = 0,
		parentTaskId = null,
		showMetaFields = true,
		autoFocus = false,
		placeholder = 'Add a task',
		disabledMessage = 'Add a project in Vikunja before creating tasks.',
		onCollapse,
		onSubmit
	}: {
		lists: AppList[];
		busy?: boolean;
		error?: string | null;
		fixedListId?: number | null;
		defaultListId?: number | null;
		defaultDueDate?: string | null;
		defaultPriority?: number;
		parentTaskId?: number | null;
		showMetaFields?: boolean;
		autoFocus?: boolean;
		placeholder?: string;
		disabledMessage?: string;
		onCollapse?: () => void;
		onSubmit?: (input: CreateTaskInput) => Promise<boolean | void> | boolean | void;
	} = $props();

	let title = $state('');
	let manualListId = $state<number | null>(null);
	let manualDueDate = $state<string | null>(null);
	let manualPriority = $state(0);
	let localError = $state<string | null>(null);
	let expanded = $state(false);
	let formEl = $state<HTMLFormElement | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let inputWrapEl = $state<HTMLDivElement | null>(null);
	let cursorIndex = $state(0);
	let suggestions = $state<InlineSuggestion[]>([]);
	let suggestionsOpen = $state(false);
	let selectedSuggestionIndex = $state(0);
	let activeToken = $state<ReturnType<typeof getActiveInlineToken>>(null);
	let suggestionPosition = $state({ left: 0, top: 0 });
	let autoFocused = $state(false);

	const suggestionWidth = 260;
	const inlineMetadata = $derived(resolveInlineMetadata(title, lists));
	const effectiveListId = $derived(
		fixedListId !== null ? fixedListId : (inlineMetadata.listId ?? manualListId)
	);
	const effectiveDueDate = $derived(inlineMetadata.dueDate ?? manualDueDate);
	const effectivePriority = $derived(inlineMetadata.priority ?? manualPriority);
	const visibleHighlights = $derived(
		inlineMetadata.highlights.filter(
			(highlight) => fixedListId === null || highlight.kind !== 'project'
		)
	);
	const highlightSegments = $derived(buildHighlightSegments(title, visibleHighlights));

	$effect(() => {
		if (fixedListId !== null) {
			manualListId = fixedListId;
			return;
		}

		if (defaultListId !== null && lists.some((list) => list.id === defaultListId)) {
			if (!expanded || !title.trim()) {
				manualListId = defaultListId;
			}
			return;
		}

		if (!lists.some((list) => list.id === manualListId)) {
			manualListId = lists[0]?.id ?? null;
		}
	});

	$effect(() => {
		if (!expanded || !title.trim()) {
			manualDueDate = defaultDueDate;
			manualPriority = defaultPriority;
		}
	});

	$effect(() => {
		if (localError && title.trim()) {
			localError = null;
		}
	});

	$effect(() => {
		if (!autoFocus || autoFocused || !inputEl || busy) {
			return;
		}

		autoFocused = true;
		expanded = true;

		void tick().then(() => {
			inputEl?.focus();
			syncCursor();
		});
	});

	$effect(() => {
		const activeElement = document.activeElement;
		const shouldSuggest = expanded && activeElement === inputEl;

		if (!shouldSuggest) {
			suggestionsOpen = false;
			suggestions = [];
			activeToken = null;
			selectedSuggestionIndex = 0;
			return;
		}

		const nextToken = getActiveInlineToken(title, cursorIndex, {
			allowProject: fixedListId === null
		});

		if (!nextToken || nextToken.kind === 'date') {
			suggestionsOpen = false;
			suggestions = [];
			activeToken = null;
			selectedSuggestionIndex = 0;
			return;
		}

		activeToken = nextToken;

		const nextSuggestions =
			nextToken.kind === 'project'
				? getProjectSuggestions(nextToken.query, lists)
				: getPrioritySuggestions(nextToken.query, nextToken.token);

		suggestions = nextSuggestions;
		suggestionsOpen = nextSuggestions.length > 0;
		selectedSuggestionIndex = nextSuggestions.length
			? Math.min(selectedSuggestionIndex, nextSuggestions.length - 1)
			: 0;
	});

	$effect(() => {
		if (!suggestionsOpen) {
			return;
		}

		void updateSuggestionPosition();

		function handleViewportChange() {
			void updateSuggestionPosition();
		}

		window.addEventListener('resize', handleViewportChange);

		return () => {
			window.removeEventListener('resize', handleViewportChange);
		};
	});

	$effect(() => {
		if (!expanded) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return;
			}

			collapseComposer();
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target;
			const composedPath = event.composedPath();

			if (target instanceof Node && formEl?.contains(target)) {
				return;
			}

			if (
				composedPath.some(
					(entry) =>
						entry instanceof HTMLElement && entry.dataset.taskComposerIgnoreCollapse === 'true'
				)
			) {
				return;
			}

			collapseComposer();
		}

		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	});

	const canSubmit = $derived(Boolean(title.trim()) && effectiveListId !== null && !busy);
	const helperClass = $derived(localError || error ? 'text-destructive' : 'text-muted-foreground');
	const helperText = $derived.by(() => {
		if (localError || error) {
			return localError ?? error;
		}

		if (lists.length === 0) {
			return disabledMessage;
		}

		return '';
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const parsedMetadata = parseInlineMetadata(title, lists);
		const parsedTitle = parsedMetadata.title || title.trim();
		const nextListId = parsedMetadata.listId ?? effectiveListId;
		const nextDueDate = parsedMetadata.dueDate ?? effectiveDueDate;
		const nextPriority = parsedMetadata.priority ?? effectivePriority;

		if (!parsedTitle.trim()) {
			localError = 'Enter a title first.';
			expanded = true;
			return;
		}

		if (nextListId === null) {
			localError = disabledMessage;
			expanded = true;
			return;
		}

		localError = null;
		const result = await onSubmit?.({
			title: parsedTitle.trim(),
			listId: nextListId,
			dueDate: nextDueDate,
			priority: nextPriority,
			parentTaskId
		});

		if (result !== false) {
			title = '';
			manualListId = fixedListId ?? defaultListId ?? lists[0]?.id ?? null;
			manualDueDate = defaultDueDate;
			manualPriority = defaultPriority;
			expanded = false;
			inputEl?.focus();
		}
	}

	function handleFocusIn() {
		expanded = true;
	}

	function handleInput() {
		syncCursor();
	}

	function handleSelectionChange() {
		syncCursor();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!suggestionsOpen || suggestions.length === 0) {
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedSuggestionIndex =
				(selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
			return;
		}

		if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			void applySuggestion(suggestions[selectedSuggestionIndex] ?? null);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			suggestionsOpen = false;
			suggestions = [];
			activeToken = null;
		}
	}

	function collapseComposer() {
		expanded = false;
		localError = null;
		suggestionsOpen = false;
		suggestions = [];
		activeToken = null;
		onCollapse?.();

		const activeElement = document.activeElement;
		if (activeElement instanceof HTMLElement) {
			activeElement.blur();
		}
	}

	async function applySuggestion(suggestion: InlineSuggestion | null) {
		if (!suggestion || !activeToken) {
			return;
		}

		if (suggestion.kind === 'project') {
			const projectToken = suggestion.detail?.slice(1) ?? suggestion.label.replace(/\s+/g, '-');
			manualListId = suggestion.listId;
			await replaceActiveToken(`#${projectToken}`);
			return;
		}

		if (suggestion.kind === 'priority') {
			manualPriority = suggestion.priority;
			const priorityToken =
				suggestion.priority >= 5 ? '!!!' : suggestion.priority >= 3 ? '!!' : '!';
			await replaceActiveToken(priorityToken);
		}
	}

	async function clearHighlight(highlight: InlineResolvedToken) {
		const nextTitle = collapseWhitespace(
			`${title.slice(0, highlight.start)} ${title.slice(highlight.end)}`
		);
		const nextCursor = Math.max(0, Math.min(highlight.start, nextTitle.length));

		title = nextTitle;
		cursorIndex = nextCursor;

		if (highlight.kind === 'date') {
			manualDueDate = defaultDueDate;
		}

		if (highlight.kind === 'priority') {
			manualPriority = defaultPriority;
		}

		await tick();
		inputEl?.focus();
		inputEl?.setSelectionRange(nextCursor, nextCursor);
	}

	async function replaceActiveToken(replacement: string) {
		if (!activeToken) {
			return;
		}

		const nextTitle = collapseWhitespace(
			`${title.slice(0, activeToken.start)}${replacement}${title.slice(activeToken.end)}`
		);
		const nextCursor = Math.max(
			0,
			Math.min(activeToken.start + replacement.length, nextTitle.length)
		);

		title = nextTitle;
		cursorIndex = nextCursor;
		suggestionsOpen = false;
		suggestions = [];
		activeToken = null;
		selectedSuggestionIndex = 0;

		await tick();
		inputEl?.focus();
		inputEl?.setSelectionRange(nextCursor, nextCursor);
	}

	async function updateSuggestionPosition() {
		if (!inputEl || !inputWrapEl || !formEl || !suggestionsOpen) {
			return;
		}

		await tick();

		const leftOffset = getCaretLeftOffset(inputEl, cursorIndex);
		const formRect = formEl.getBoundingClientRect();
		const inputRect = inputWrapEl.getBoundingClientRect();
		const relativeLeft = inputRect.left - formRect.left + leftOffset;
		const maxLeft = Math.max(12, formRect.width - suggestionWidth - 12);

		suggestionPosition = {
			left: Math.max(12, Math.min(relativeLeft, maxLeft)),
			top: inputRect.bottom - formRect.top + 8
		};
	}

	function syncCursor() {
		cursorIndex = inputEl?.selectionStart ?? title.length;
	}

	function getDefaultDueDate() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}T12:00:00.000Z`;
	}

	function getCaretLeftOffset(input: HTMLInputElement, index: number) {
		const styles = window.getComputedStyle(input);
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		const valueBeforeCaret = input.value.slice(0, index);
		const font =
			styles.font ||
			`${styles.fontStyle} ${styles.fontVariant} ${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
		const letterSpacing = Number.parseFloat(styles.letterSpacing || '0');
		const paddingLeft = Number.parseFloat(styles.paddingLeft || '0');

		if (context) {
			context.font = font;
		}

		const textWidth = context
			? context.measureText(valueBeforeCaret).width +
				Math.max(0, valueBeforeCaret.length - 1) * letterSpacing
			: valueBeforeCaret.length * 8;

		return paddingLeft + textWidth - input.scrollLeft;
	}

	function collapseWhitespace(value: string) {
		return value.replace(/\s{2,}/g, ' ').trim();
	}

	function buildHighlightSegments(
		text: string,
		highlights: InlineResolvedToken[]
	): HighlightSegment[] {
		if (highlights.length === 0) {
			return text ? [{ kind: 'text', text }] : [];
		}

		const segments: HighlightSegment[] = [];
		let cursor = 0;

		for (const highlight of [...highlights].sort((left, right) => left.start - right.start)) {
			if (highlight.start > cursor) {
				segments.push({
					kind: 'text',
					text: text.slice(cursor, highlight.start)
				});
			}

			segments.push({
				kind: 'highlight',
				text: text.slice(highlight.start, highlight.end),
				highlight
			});
			cursor = highlight.end;
		}

		if (cursor < text.length) {
			segments.push({
				kind: 'text',
				text: text.slice(cursor)
			});
		}

		return segments;
	}

	function getHighlightClass(highlight: InlineResolvedToken) {
		if (highlight.kind === 'date') {
			return 'bg-amber-100/90 text-amber-800';
		}

		if (highlight.kind === 'priority') {
			if (highlight.priority >= 5) {
				return 'bg-rose-100/90 text-rose-800';
			}

			if (highlight.priority >= 3) {
				return 'bg-orange-100/90 text-orange-800';
			}

			return 'bg-sky-100/90 text-sky-800';
		}

		return '';
	}

	function getHighlightStyle(highlight: InlineResolvedToken) {
		if (highlight.kind !== 'project' || !highlight.color) {
			return undefined;
		}

		return `color: color-mix(in srgb, ${highlight.color} 74%, rgb(68 64 60)); background-color: color-mix(in srgb, ${highlight.color} 16%, white);`;
	}
</script>

<form
	bind:this={formEl}
	class="relative rounded-[1.6rem] border border-border/70 bg-white/78 p-3 shadow-sm backdrop-blur dark:bg-white/7 dark:shadow-none"
	onsubmit={handleSubmit}
	onfocusin={handleFocusIn}
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div bind:this={inputWrapEl} class="relative min-w-0 flex-1">
			<input
				bind:this={inputEl}
				bind:value={title}
				class="relative z-10 h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm text-transparent caret-foreground transition outline-none placeholder:text-muted-foreground focus:border-primary/30 focus:ring-3 focus:ring-primary/10"
				type="text"
				name="title"
				{placeholder}
				disabled={busy}
				aria-label="Task title"
				autocomplete="off"
				autocapitalize="off"
				oninput={handleInput}
				onclick={handleSelectionChange}
				onkeyup={handleSelectionChange}
				onkeydown={handleKeydown}
			/>

			<div
				class="pointer-events-none absolute inset-0 z-20 flex items-center overflow-hidden rounded-xl px-3 text-sm"
				aria-hidden="true"
			>
				{#if title}
					<div class="w-full truncate whitespace-pre text-foreground">
						{#each highlightSegments as segment, index (`${segment.kind}-${index}`)}
							{#if segment.kind === 'text'}
								<span>{segment.text}</span>
							{:else if segment.highlight.kind === 'date' || segment.highlight.kind === 'priority'}
								<button
									type="button"
									class={`pointer-events-auto ${getHighlightClass(segment.highlight)}`}
									style={getHighlightStyle(segment.highlight)}
									data-task-composer-ignore-collapse="true"
									onmousedown={(event) => {
										event.preventDefault();
										void clearHighlight(segment.highlight);
									}}
								>
									{segment.text}
								</button>
							{:else}
								<span
									class={getHighlightClass(segment.highlight)}
									style={getHighlightStyle(segment.highlight)}
								>
									{segment.text}
								</span>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<button
			type="submit"
			class="task-accent-fill inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_14px_28px_rgba(60,93,78,0.2)] transition hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:self-auto"
			disabled={!canSubmit}
		>
			{busy ? 'Adding…' : 'Add'}
		</button>
	</div>

	{#if expanded && showMetaFields}
		<div class="mt-3 border-t border-border/60 pt-3">
			<TaskMetaFields
				{lists}
				listId={effectiveListId}
				dueDate={effectiveDueDate}
				priority={effectivePriority}
				disabled={busy}
				lockProject={fixedListId !== null}
				showLabels={false}
				tintedDueDateField
				onDueDateChange={(nextValue) => {
					manualDueDate = nextValue;
				}}
				onListChange={(nextValue) => {
					manualListId = nextValue;
				}}
				onPriorityChange={(nextValue) => {
					manualPriority = nextValue;
				}}
			/>
		</div>
	{/if}

	{#if helperText}
		<p class={`mt-2 text-sm ${helperClass}`}>
			{helperText}
		</p>
	{/if}

	{#if suggestionsOpen && activeToken}
		<div
			class="absolute z-[80] w-[260px] overflow-hidden rounded-2xl border border-border/70 bg-background/96 p-1.5 shadow-xl backdrop-blur"
			style={`left: ${suggestionPosition.left}px; top: ${suggestionPosition.top}px;`}
			data-task-composer-ignore-collapse="true"
		>
			<div
				class="mb-1.5 px-2 py-1 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase"
			>
				{activeToken.kind === 'project' ? 'Projects' : 'Priority'}
			</div>
			<div class="flex flex-col gap-1">
				{#each suggestions as suggestion, index (`${suggestion.kind}-${suggestion.label}`)}
					<button
						type="button"
						class={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
							index === selectedSuggestionIndex
								? 'bg-muted text-foreground'
								: 'text-foreground/80 hover:bg-stone-50 dark:hover:bg-white/8'
						}`}
						data-task-composer-ignore-collapse="true"
						onmousedown={(event) => {
							event.preventDefault();
							void applySuggestion(suggestion);
						}}
					>
						<span class="inline-flex min-w-0 items-center gap-2">
							{#if suggestion.kind === 'project'}
								<Hash class="size-3.5 shrink-0 text-muted-foreground" />
							{:else}
								<AlertCircle class="size-3.5 shrink-0 text-muted-foreground" />
							{/if}
							<span class="truncate">{suggestion.label}</span>
						</span>
						<span
							class="ml-3 inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
						>
							{#if suggestion.detail}
								<span>{suggestion.detail}</span>
							{/if}
							{#if index === selectedSuggestionIndex}
								<Check class="size-3.5" />
							{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</form>
