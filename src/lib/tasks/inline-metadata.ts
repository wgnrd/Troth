import type { AppList } from '$lib/api/vikunja';
import { fromDateInputValue } from '$lib/tasks/view';

export type InlineSuggestion =
	| {
			kind: 'project';
			label: string;
			detail?: string;
			listId: number;
	  }
	| {
			kind: 'priority';
			label: string;
			detail?: string;
			priority: number;
	  }
	| {
			kind: 'date';
			label: string;
			detail?: string;
			dueDate: string;
	  };

export type ActiveInlineToken =
	| {
			kind: 'project';
			start: number;
			end: number;
			token: string;
			query: string;
	  }
	| {
			kind: 'priority';
			start: number;
			end: number;
			token: string;
			query: string;
	  }
	| {
			kind: 'date';
			start: number;
			end: number;
			token: string;
			query: string;
	  };

type ParsedInlineMetadata = {
	title: string;
	listId: number | null;
	priority: number | null;
	dueDate: string | null;
};

export type InlineResolvedToken =
	| {
			kind: 'project';
			start: number;
			end: number;
			text: string;
			listId: number;
			color: string | null;
	  }
	| {
			kind: 'date';
			start: number;
			end: number;
			text: string;
			dueDate: string;
	  }
	| {
			kind: 'priority';
			start: number;
			end: number;
			text: string;
			priority: number;
	  };

export type InlineResolvedMetadata = {
	listId: number | null;
	dueDate: string | null;
	priority: number | null;
	highlights: InlineResolvedToken[];
};

type PriorityDefinition = {
	priority: number;
	label: string;
	aliases: string[];
};

const weekdayNames = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

const weekdayAliases = new Map<string, number>([
	['sun', 0],
	['sunday', 0],
	['mon', 1],
	['monday', 1],
	['tue', 2],
	['tues', 2],
	['tuesday', 2],
	['wed', 3],
	['wednesday', 3],
	['thu', 4],
	['thur', 4],
	['thurs', 4],
	['thursday', 4],
	['fri', 5],
	['friday', 5],
	['sat', 6],
	['saturday', 6]
]);

const priorityDefinitions: PriorityDefinition[] = [
	{
		priority: 1,
		label: 'Low',
		aliases: ['1', 'low', 'l', 'p4']
	},
	{
		priority: 3,
		label: 'Medium',
		aliases: ['2', '3', 'medium', 'med', 'm', 'normal', 'p3', 'p2']
	},
	{
		priority: 5,
		label: 'High',
		aliases: ['4', '5', 'high', 'h', 'urgent', 'p1']
	}
];

export function parseInlineMetadata(
	title: string,
	lists: AppList[],
	now = new Date()
): ParsedInlineMetadata {
	const tokens = title.match(/\S+/g) ?? [];
	const remainingTokens: string[] = [];
	let listId: number | null = null;
	let priority: number | null = null;
	let dueDate: string | null = null;

	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		const nextToken = tokens[index + 1] ?? null;

		if (token.startsWith('#')) {
			const matchedList = resolveProjectToken(token.slice(1), lists);

			if (matchedList) {
				listId = matchedList.id;
				continue;
			}
		}

		if (token.startsWith('!')) {
			const matchedPriority = resolvePriorityToken(token);

			if (matchedPriority !== null) {
				priority = matchedPriority;
				continue;
			}
		}

		const parsedDate = resolveDateToken(token, nextToken, now);

		if (parsedDate.kind === 'matched') {
			dueDate = parsedDate.dueDate;
			index += parsedDate.consumedTokens - 1;
			continue;
		}

		remainingTokens.push(token);
	}

	return {
		title: remainingTokens.join(' ').trim(),
		listId,
		priority,
		dueDate
	};
}

export function getActiveInlineToken(
	value: string,
	cursorIndex: number,
	options?: { allowProject?: boolean }
): ActiveInlineToken | null {
	const clampedIndex = Math.max(0, Math.min(cursorIndex, value.length));
	let start = clampedIndex;
	let end = clampedIndex;

	while (start > 0 && !/\s/.test(value[start - 1] ?? '')) {
		start -= 1;
	}

	while (end < value.length && !/\s/.test(value[end] ?? '')) {
		end += 1;
	}

	const token = value.slice(start, end);

	if (!token.trim()) {
		return null;
	}

	if (token.startsWith('#')) {
		if (options?.allowProject === false) {
			return null;
		}

		return {
			kind: 'project',
			start,
			end,
			token,
			query: normalizeInlineQuery(token.slice(1))
		};
	}

	if (token.startsWith('!')) {
		return {
			kind: 'priority',
			start,
			end,
			token,
			query: normalizeInlineQuery(token.slice(1))
		};
	}

	if (!isPotentialDateToken(token)) {
		return null;
	}

	return {
		kind: 'date',
		start,
		end,
		token,
		query: normalizeInlineQuery(token)
	};
}

export function getProjectSuggestions(query: string, lists: AppList[]) {
	const normalizedQuery = normalizeLookupValue(query);

	return lists
		.map((list) => ({
			list,
			score: getProjectMatchScore(list, normalizedQuery)
		}))
		.filter(hasScore)
		.sort((left, right) => {
			const leftScore = left.score ?? Number.POSITIVE_INFINITY;
			const rightScore = right.score ?? Number.POSITIVE_INFINITY;

			if (leftScore !== rightScore) {
				return leftScore - rightScore;
			}

			return left.list.title.localeCompare(right.list.title);
		})
		.slice(0, 6)
		.map(
			(entry) =>
				({
					kind: 'project',
					label: entry.list.title,
					detail: entry.list.identifier ? `#${entry.list.identifier}` : undefined,
					listId: entry.list.id
				}) satisfies InlineSuggestion
		);
}

export function getPrioritySuggestions(query: string, rawToken: string) {
	const normalizedQuery = normalizeLookupValue(query);

	return priorityDefinitions
		.map((definition) => ({
			definition,
			score: getPriorityMatchScore(definition, normalizedQuery, rawToken)
		}))
		.filter(hasScore)
		.sort(
			(left, right) =>
				(left.score ?? Number.POSITIVE_INFINITY) - (right.score ?? Number.POSITIVE_INFINITY)
		)
		.map(
			(entry) =>
				({
					kind: 'priority',
					label: entry.definition.label,
					detail: getPrioritySuggestionDetail(entry.definition.priority),
					priority: entry.definition.priority
				}) satisfies InlineSuggestion
		);
}

export function getDateSuggestions(query: string, now = new Date()) {
	const suggestions = buildDateSuggestionCandidates(now);
	const normalizedQuery = normalizeLookupValue(query);

	if (!normalizedQuery) {
		return suggestions.slice(0, 6);
	}

	return suggestions
		.map((suggestion) => ({
			suggestion,
			score: getDateMatchScore(suggestion, normalizedQuery)
		}))
		.filter(hasScore)
		.sort(
			(left, right) =>
				(left.score ?? Number.POSITIVE_INFINITY) - (right.score ?? Number.POSITIVE_INFINITY)
		)
		.slice(0, 6)
		.map((entry) => entry.suggestion);
}

export function resolveInlineMetadata(
	title: string,
	lists: AppList[],
	now = new Date()
): InlineResolvedMetadata {
	const tokenMatches = Array.from(title.matchAll(/\S+/g));
	const highlights: InlineResolvedToken[] = [];
	let listId: number | null = null;
	let dueDate: string | null = null;
	let priority: number | null = null;

	for (let index = 0; index < tokenMatches.length; index += 1) {
		const match = tokenMatches[index];
		const token = match[0] ?? '';
		const start = match.index ?? 0;
		const nextTokenMatch = tokenMatches[index + 1];
		const nextToken = nextTokenMatch?.[0] ?? null;

		if (token.startsWith('#')) {
			const matchedList = resolveProjectToken(token.slice(1), lists);

			if (matchedList) {
				listId = matchedList.id;
				highlights.push({
					kind: 'project',
					start,
					end: start + token.length,
					text: token,
					listId: matchedList.id,
					color: matchedList.color
				});
				continue;
			}
		}

		if (token.startsWith('!')) {
			const matchedPriority = resolvePriorityToken(token);

			if (matchedPriority !== null) {
				priority = matchedPriority;
				highlights.push({
					kind: 'priority',
					start,
					end: start + token.length,
					text: token,
					priority: matchedPriority
				});
				continue;
			}
		}

		const parsedDate = resolveDateToken(token, nextToken, now);

		if (parsedDate.kind === 'matched') {
			dueDate = parsedDate.dueDate;
			const tokenEnd =
				parsedDate.consumedTokens > 1 && nextTokenMatch?.index !== undefined
					? nextTokenMatch.index + (nextTokenMatch[0]?.length ?? 0)
					: start + token.length;

			highlights.push({
				kind: 'date',
				start,
				end: tokenEnd,
				text: title.slice(start, tokenEnd),
				dueDate: parsedDate.dueDate
			});
			index += parsedDate.consumedTokens - 1;
		}
	}

	return {
		listId,
		dueDate,
		priority,
		highlights
	};
}

function resolveProjectToken(query: string, lists: AppList[]) {
	const normalizedQuery = normalizeLookupValue(query);

	if (!normalizedQuery) {
		return null;
	}

	return (
		lists
			.map((list) => ({
				list,
				score: getProjectMatchScore(list, normalizedQuery)
			}))
			.filter(hasScore)
			.sort((left, right) => {
				const leftScore = left.score ?? Number.POSITIVE_INFINITY;
				const rightScore = right.score ?? Number.POSITIVE_INFINITY;

				if (leftScore !== rightScore) {
					return leftScore - rightScore;
				}

				return left.list.title.localeCompare(right.list.title);
			})[0]?.list ?? null
	);
}

function resolvePriorityToken(token: string) {
	const normalizedToken = normalizeLookupValue(token);

	if (!normalizedToken) {
		return null;
	}

	if (/^!{1,3}$/.test(token)) {
		return token.length === 1 ? 1 : token.length === 2 ? 3 : 5;
	}

	if (normalizedToken.startsWith('!')) {
		const withoutPrefix = normalizedToken.slice(1);

		for (const definition of priorityDefinitions) {
			if (definition.aliases.some((alias) => alias === withoutPrefix)) {
				return definition.priority;
			}
		}
	}

	for (const definition of priorityDefinitions) {
		if (definition.aliases.some((alias) => alias === normalizedToken)) {
			return definition.priority;
		}
	}

	return null;
}

function resolveDateToken(token: string, nextToken: string | null, now: Date) {
	const normalizedToken = normalizeInlineQuery(token);
	const normalizedNextToken = normalizeInlineQuery(nextToken ?? '');

	if (!normalizedToken) {
		return { kind: 'missed' as const };
	}

	if (normalizedToken === 'today') {
		return { kind: 'matched' as const, dueDate: dateToDueDate(now), consumedTokens: 1 };
	}

	if (normalizedToken === 'tomorrow') {
		return {
			kind: 'matched' as const,
			dueDate: dateToDueDate(addDays(now, 1)),
			consumedTokens: 1
		};
	}

	if (normalizedToken === 'next' && normalizedNextToken === 'week') {
		return {
			kind: 'matched' as const,
			dueDate: dateToDueDate(addDays(startOfDay(now), 7)),
			consumedTokens: 2
		};
	}

	if (normalizedToken === 'next' && weekdayAliases.has(normalizedNextToken)) {
		return {
			kind: 'matched' as const,
			dueDate: dateToDueDate(
				getNextWeekday(now, weekdayAliases.get(normalizedNextToken) ?? 0, true)
			),
			consumedTokens: 2
		};
	}

	if (weekdayAliases.has(normalizedToken)) {
		return {
			kind: 'matched' as const,
			dueDate: dateToDueDate(getNextWeekday(now, weekdayAliases.get(normalizedToken) ?? 0, false)),
			consumedTokens: 1
		};
	}

	const parsedDate = parseAbsoluteDate(normalizedToken, now);

	if (parsedDate) {
		return { kind: 'matched' as const, dueDate: dateToDueDate(parsedDate), consumedTokens: 1 };
	}

	return { kind: 'missed' as const };
}

function buildDateSuggestionCandidates(now: Date) {
	const baseDate = startOfDay(now);
	const suggestions: InlineSuggestion[] = [
		{
			kind: 'date',
			label: 'Today',
			detail: formatDateDetail(baseDate),
			dueDate: dateToDueDate(baseDate)
		},
		{
			kind: 'date',
			label: 'Tomorrow',
			detail: formatDateDetail(addDays(baseDate, 1)),
			dueDate: dateToDueDate(addDays(baseDate, 1))
		},
		{
			kind: 'date',
			label: 'Next week',
			detail: formatDateDetail(addDays(baseDate, 7)),
			dueDate: dateToDueDate(addDays(baseDate, 7))
		}
	];

	for (let dayIndex = 1; dayIndex <= 6; dayIndex += 1) {
		const weekday = (baseDate.getDay() + dayIndex) % 7;
		const nextDate = getNextWeekday(baseDate, weekday, false);

		suggestions.push({
			kind: 'date',
			label: weekdayNames[weekday][0].toUpperCase() + weekdayNames[weekday].slice(1),
			detail: formatDateDetail(nextDate),
			dueDate: dateToDueDate(nextDate)
		});
	}

	return suggestions;
}

function getProjectMatchScore(list: AppList, query: string) {
	if (!query) {
		return 0;
	}

	const title = normalizeLookupValue(list.title);
	const identifier = normalizeLookupValue(list.identifier ?? '');

	if (title === query || identifier === query) {
		return 0;
	}

	if (title.startsWith(query) || identifier.startsWith(query)) {
		return 1;
	}

	if (title.includes(query) || identifier.includes(query)) {
		return 2;
	}

	return null;
}

function getPriorityMatchScore(definition: PriorityDefinition, query: string, rawToken: string) {
	if (!query) {
		return 0;
	}

	if (/^!{1,3}$/.test(rawToken)) {
		const mappedPriority = rawToken.length === 1 ? 1 : rawToken.length === 2 ? 3 : 5;
		return definition.priority === mappedPriority ? 0 : null;
	}

	if (definition.aliases.includes(query)) {
		return 0;
	}

	if (definition.label.toLowerCase().startsWith(query)) {
		return 1;
	}

	if (definition.aliases.some((alias) => alias.startsWith(query))) {
		return 2;
	}

	return null;
}

function getDateMatchScore(suggestion: InlineSuggestion, query: string) {
	if (suggestion.kind !== 'date') {
		return null;
	}

	const label = normalizeLookupValue(suggestion.label);
	const detail = normalizeLookupValue(suggestion.detail ?? '');

	if (label === query) {
		return 0;
	}

	if (label.startsWith(query)) {
		return 1;
	}

	if (detail.includes(query) || label.includes(query)) {
		return 2;
	}

	return null;
}

function getPrioritySuggestionDetail(priority: number) {
	if (priority >= 5) {
		return '!high or !!!';
	}

	if (priority >= 3) {
		return '!medium or !!';
	}

	return '!low or !';
}

function isPotentialDateToken(token: string) {
	const normalizedToken = normalizeInlineQuery(token);

	if (!normalizedToken) {
		return false;
	}

	if (normalizedToken === 'next') {
		return true;
	}

	if (normalizedToken === 'today' || normalizedToken === 'tomorrow' || normalizedToken === 'week') {
		return true;
	}

	if (weekdayAliases.has(normalizedToken)) {
		return true;
	}

	if (/^\d{1,4}[./-]\d{1,2}([./-]\d{1,4})?$/.test(normalizedToken)) {
		return true;
	}

	return /^\d+$/.test(normalizedToken);
}

function parseAbsoluteDate(value: string, now: Date) {
	const parts = value.split(/[./-]/).map((part) => Number.parseInt(part, 10));

	if (parts.some((part) => Number.isNaN(part))) {
		return null;
	}

	if (value.includes('-') && parts[0] > 31) {
		const [year, month, day] = parts;
		return createValidDate(year, month, day);
	}

	if (parts.length === 3) {
		const [first, second, third] = parts;

		if (first > 31) {
			return createValidDate(first, second, third);
		}

		if (third > 31) {
			return createValidDate(third, second, first);
		}

		return createValidDate(third, second, first);
	}

	if (parts.length === 2) {
		const [day, month] = parts;
		const currentYear = now.getFullYear();
		const currentDate = createValidDate(currentYear, month, day);

		if (!currentDate) {
			return null;
		}

		const today = startOfDay(now);
		return currentDate.getTime() >= today.getTime()
			? currentDate
			: (createValidDate(currentYear + 1, month, day) ?? currentDate);
	}

	return null;
}

function createValidDate(year: number, month: number, day: number) {
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return null;
	}

	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return startOfDay(date);
}

function getNextWeekday(now: Date, targetDay: number, alwaysNextWeek: boolean) {
	const baseDate = startOfDay(now);
	const currentDay = baseDate.getDay();
	let distance = (targetDay - currentDay + 7) % 7;

	if (distance === 0 || alwaysNextWeek) {
		distance += 7;
	}

	return addDays(baseDate, distance);
}

function dateToDueDate(date: Date) {
	return fromDateInputValue(toDateInputValue(date)) ?? '';
}

function toDateInputValue(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return startOfDay(nextDate);
}

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateDetail(date: Date) {
	return new Intl.DateTimeFormat('en-US', {
		day: 'numeric',
		month: 'short',
		weekday: 'short'
	}).format(date);
}

function normalizeLookupValue(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, '');
}

function normalizeInlineQuery(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/^[("'`[{]+/, '')
		.replace(/[)"'`\]}.,;:!?]+$/, '');
}

function hasScore<T>(entry: { score: T | null }): entry is { score: T } {
	return entry.score !== null;
}
